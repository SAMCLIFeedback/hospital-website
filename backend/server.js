const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./db');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Define allowed origins for CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;

io.on('connection', () => {});

connectDB().then(() => {
  console.log('MongoDB connected to database:', mongoose.connection.db.databaseName);
  console.log('ExternalFeedback collection name:', ExternalFeedback.collection.collectionName);
  console.log('InternalFeedback collection name:', InternalFeedback.collection.collectionName);
});

// Configure CORS for Express
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

const feedbackRoutes = require('./routes/externalFeedback');
const verificationRoutes = require('./routes/staffVerification');
const staffFeedbackRoutes = require('./routes/internalFeedback');
const runRetrySentiment = require('./utils/retrySentimentWorker');
const QALoginRoutes = require('./routes/qaLogin');
const submissionCountRoute = require('./routes/submissionCounts')
const validateTokenRoute = require('./routes/validateToken');
const markTokenUsedRouter = require('./routes/markTokenUsed');
const checkStaffEmailRoute = require('./routes/checkStaffEmail');
const staffRoutes = require('./routes/modalLock');

const ExternalFeedback = require('./models/ExternalFeedback');
const InternalFeedback = require('./models/InternalFeedback');

app.get('/api/retry-sentiment', async (req, res) => {
  try {
    const results = await runRetrySentiment();
    res.status(200).json({ success: true, retried: results });
  } catch (err) {
    console.error('Error in retry-sentiment route:', err.message);
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/feedback/all', async (req, res) => {
    try {
        const { status, sentiment, source, urgent } = req.query;

        const filters = {};
        if (status && status !== 'all') {
            filters.status = status;
        }

        if (sentiment && sentiment !== 'all') filters.sentiment = sentiment;
        if (urgent && urgent !== 'all') filters.urgent = urgent === 'true';

        if (source && !['all', 'staff', 'external'].includes(source)) {
            filters.source = source;
        }

        let external = [];
        let internal = [];

        if (!source || source === 'all' || ['patient', 'visitor', 'external'].includes(source)) {
            external = await ExternalFeedback.find(filters).lean();
        }

        if (!source || source === 'all' || source === 'staff') {
            const internalFilters = { ...filters };
            delete internalFilters.source; // 'source' field is specific to ExternalFeedback
            internal = await InternalFeedback.find(internalFilters).lean();
        }

        const allFeedback = [...external, ...internal];

        const formattedFeedback = allFeedback.map(item => {
            return {
                id: item.id?.toString() || `unknown-${Date.now()}`,
                source: item.source || 'unknown',
                feedbackType: item.feedbackType || 'unknown',
                department: item.department || 'unknown',
                rating: item.rating ?? null,
                impactSeverity: item.impactSeverity ?? null,
                description: item.description || '',
                isAnonymous: item.isAnonymous ?? true,
                email: item.email || null,
                phone: item.phone || null,
                sentiment: item.sentiment || null,
                sentiment_status: item.sentiment_status || 'pending',
                sentiment_attempts: item.sentiment_attempts || 0,
                sentiment_error: item.sentiment_error || null,
                date: item.date || new Date(),
                urgent: item.urgent ?? false,
                status: item.status || 'pending',
                reportDetails: item.reportDetails || '',
                reportCreatedAt: item.reportCreatedAt || null,
                feedbackDescription: item.description || '',
                reportDepartment: item.department || '',
                dept_status: item.dept_status || null,
            };
        });

        formattedFeedback.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(formattedFeedback);
    } catch (error) {
        console.error('Error fetching feedback:', error.message);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});


app.get('/api/feedback/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const external = await ExternalFeedback.findOne({ id: feedbackId }).lean();
    if (external) return res.json(external);

    const internal = await InternalFeedback.findOne({ id: feedbackId }).lean();
    if (internal) return res.json(internal);

    return res.status(404).json({ error: 'Feedback not found' });
  } catch (err) {
    console.error('Error fetching feedback by ID:', err.message);
    res.status(500).json({ error: 'Failed to fetch feedback by ID' });
  }
});

app.use('/api', staffRoutes);
app.use('/api/check-staff-email', checkStaffEmailRoute);
app.use('/api/validate-token', validateTokenRoute);
app.use('/api/mark-token-used', markTokenUsedRouter);
app.use('/api', feedbackRoutes);
app.use('/api', verificationRoutes);
app.use('/api', staffFeedbackRoutes);
app.use('/api', QALoginRoutes);
app.use('/api', submissionCountRoute);

cron.schedule('*/10 * * * *', async () => {
  console.log('Running sentiment retry job...');
  try {
    const results = await runRetrySentiment();
    console.log('Retry results:', results);
  } catch (err) {
    console.error('Error in scheduled retry:', err.message);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});