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
const sentimentFeedbackRoutes = require('./routes/feedbackRoutes');
const runRetrySentiment = require('./utils/retrySentimentWorker');
const reportRoutes = require('./routes/reportRoutes');
const departmentLoginRoutes = require('./routes/departmentLogin');
const adminLoginRoutes = require('./routes/adminLogin');
const QALoginRoutes = require('./routes/qaLogin');
const fetchDeptFeedback = require('./routes/fetchDeptFeedback'); 
const fetchAdminFeedback = require('./routes/fetchAdminFeedback'); 
const deptActionRoutes = require('./routes/proposeRoute');
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

const { setupFeedbackChangeStreams } = require('./routes/fetchAdminFeedback');
setupFeedbackChangeStreams(io); 

const { setupDeptFeedbackChangeStreams } = require('./routes/fetchDeptFeedback');
setupDeptFeedbackChangeStreams(io);

app.use('/api', sentimentFeedbackRoutes);

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

app.patch('/api/feedback/reportViewed/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { source, viewedStatus } = req.body;

    if (!source || typeof viewedStatus !== 'boolean') {
      return res.status(400).json({ error: 'Missing source or invalid viewedStatus.' });
    }

    let updatedFeedback;
    if (['patient', 'visitor', 'family'].includes(source.toLowerCase())) {
      updatedFeedback = await ExternalFeedback.findOneAndUpdate(
        { id: feedbackId },
        { reportViewed: viewedStatus },
        { new: true }
      );
    } else if (source.toLowerCase() === 'staff') {
      updatedFeedback = await InternalFeedback.findOneAndUpdate(
        { id: feedbackId },
        { reportViewed: viewedStatus },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'Unknown feedback source.' });
    }

    if (!updatedFeedback) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    io.emit('feedbackUpdate', {
      id: updatedFeedback.id,
      reportViewed: updatedFeedback.reportViewed,
      status: updatedFeedback.status,
      reportDetails: updatedFeedback.reportDetails,
      department: updatedFeedback.department,
      reportCreatedAt: updatedFeedback.reportCreatedAt,
      dept_status: updatedFeedback.dept_status, // Include dept_status
    });

    res.status(200).json({ message: 'Report viewed status updated successfully!', feedback: updatedFeedback });
  } catch (error) {
    console.error('Error updating report viewed status:', error.message);
    res.status(500).json({ error: 'Failed to update report viewed status.' });
  }
});

app.patch('/api/feedback/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { userName, ...updates } = req.body; // Extract userName from request body

    let Model;
    const external = await ExternalFeedback.findOne({ id: feedbackId });
    if (external) {
      Model = ExternalFeedback;
    } else {
      const internal = await InternalFeedback.findOne({ id: feedbackId });
      if (internal) {
        Model = InternalFeedback;
      } else {
        return res.status(404).json({ error: 'Feedback not found' });
      }
    }

    const feedback = await Model.findOne({ id: feedbackId });
    if (feedback.status === 'spam' && updates.status !== 'unassigned') {
      return res.status(400).json({ error: 'Cannot modify spam feedback. Restore to unassigned first.' });
    }

    const allowedUpdates = [
      'status',
      'sentiment',
      'sentiment_status',
      'department',
      'reportDetails',
      'reportCreatedAt',
      'dept_status'
    ];
    const updateFields = Object.keys(updates).filter(key => allowedUpdates.includes(key));
    const updateObject = updateFields.reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

    if (updateObject.status === 'assigned') {
      updateObject.dept_status = 'needs_action';
    }

    // Append to actionHistory
    const actionEntry = {
      action: updateObject.status === 'assigned' ? 'Report Assigned' :
              updateObject.status === 'spam' ? 'Tagged as Spam' :
              updateObject.status === 'unassigned' ? 'Restored' : 'Updated',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details:
        updateObject.status === 'assigned'
          ? `Assigned to: ${updateObject.department || feedback.department}`
          : updateObject.status === 'spam'
          ? 'Tagged as Spam'
          : updateObject.status === 'unassigned'
          ? 'Feedback restored'
          : '',
    };

    const updatedFeedback = await Model.findOneAndUpdate(
      { id: feedbackId },
      { 
        $set: updateObject,
        $push: { actionHistory: actionEntry }
      },
      { new: true }
    ).lean();

    if (!updatedFeedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    io.emit('feedbackUpdate', {
      id: updatedFeedback.id,
      status: updatedFeedback.status,
      sentiment: updatedFeedback.sentiment,
      sentiment_status: updatedFeedback.sentiment_status,
      department: updatedFeedback.department,
      reportDetails: updatedFeedback.reportDetails,
      reportCreatedAt: updatedFeedback.reportCreatedAt,
      dept_status: updatedFeedback.dept_status,
      date: updatedFeedback.date,
      actionHistory: updatedFeedback.actionHistory, // Include actionHistory
    });

    res.json({ feedback: updatedFeedback });
  } catch (err) {
    console.error('Error updating feedback:', err.message);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

app.patch('/api/feedback/bulk-status', async (req, res) => {
  try {
    const { ids, status, userName } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ error: 'Invalid request: ids array and status are required' });
    }

    const validStatuses = ['spam', 'unassigned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (status !== 'unassigned') {
      const spamFeedback = await Promise.all(
        ids.map(async id => {
          const external = await ExternalFeedback.findOne({ id });
          if (external) return external;
          return await InternalFeedback.findOne({ id });
        })
      );

      const spamIds = spamFeedback
        .filter(f => f && f.status === 'spam')
        .map(f => f.id);

      if (spamIds.length > 0) {
        return res.status(400).json({
          error: `Cannot update spam feedback to ${status}. Affected IDs: ${spamIds.join(', ')}. Restore to unassigned first.`,
        });
      }
    }

    const actionEntry = {
      action: status === 'spam' ? 'Tagged as Spam' : 'Restored',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details: '',
    };

    const bulkWriteOperations = ids.map(id => ({
      updateOne: {
        filter: { id },
        update: { 
          $set: { status, dept_status: status === 'assigned' ? 'needs_action' : null },
          $push: { actionHistory: actionEntry }
        },
      },
    }));

    let bulkResult = await ExternalFeedback.bulkWrite(bulkWriteOperations);
    let updatedCount = bulkResult.modifiedCount || 0;

    bulkResult = await InternalFeedback.bulkWrite(bulkWriteOperations);
    updatedCount += bulkResult.modifiedCount || 0;

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'No feedback items updated' });
    }

    const updatedFeedback = await Promise.all(
      ids.map(async id => {
        const external = await ExternalFeedback.findOne({ id }).lean();
        if (external) return external;
        return await InternalFeedback.findOne({ id }).lean();
      })
    );

    updatedFeedback.forEach(feedback => {
      if (feedback) {
        io.emit('feedbackUpdate', {
          id: feedback.id,
          status: feedback.status,
          sentiment: feedback.sentiment,
          sentiment_status: feedback.sentiment_status,
          department: feedback.department,
          reportDetails: feedback.reportDetails,
          reportCreatedAt: feedback.reportCreatedAt,
          dept_status: feedback.dept_status,
          date: feedback.date,
          actionHistory: feedback.actionHistory,
        });
      }
    });

    io.emit('bulkFeedbackUpdate', { ids, status, dept_status: status === 'assigned' ? 'needs_action' : null });

    res.status(200).json({ message: `${updatedCount} feedback items updated to ${status}` });
  } catch (error) {
    console.error('Error in bulk status update:', error.message);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

app.patch('/api/feedback/bulk-report', async (req, res) => {
  try {
    const { ids, department, reportDetails, userName } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !department || !reportDetails) {
      return res.status(400).json({ error: 'Invalid request: ids, department, and reportDetails are required' });
    }

    const invalidFeedback = await Promise.all(
      ids.map(async id => {
        const external = await ExternalFeedback.findOne({ id });
        if (external) return external;
        return await InternalFeedback.findOne({ id });
      })
    );

    const invalidIds = invalidFeedback
      .filter(f => f && (f.status === 'spam' || f.status === 'assigned'))
      .map(f => ({ id: f.id, status: f.status }));

    if (invalidIds.length > 0) {
      const errorMsg = invalidIds.map(f => `ID ${f.id} has status ${f.status}`).join(', ');
      return res.status(400).json({
        error: `Cannot create report for feedback with invalid status. ${errorMsg}. Restore spam feedback to unassigned first.`,
      });
    }

    const actionEntry = {
      action: 'Report Assigned',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details: `Assigned to: ${department}`,
    };

    const bulkWriteOperations = ids.map(id => ({
      updateOne: {
        filter: { id },
        update: {
          $set: {
            status: 'assigned',
            dept_status: 'needs_action',
            department,
            reportDetails,
            reportCreatedAt: new Date(),
          },
          $push: { actionHistory: actionEntry },
        },
      },
    }));

    let bulkResult = await ExternalFeedback.bulkWrite(bulkWriteOperations);
    let updatedCount = bulkResult.modifiedCount || 0;

    bulkResult = await InternalFeedback.bulkWrite(bulkWriteOperations);
    updatedCount += bulkResult.modifiedCount || 0;

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'No feedback items updated' });
    }

    const updatedFeedback = await Promise.all(
      ids.map(async id => {
        const external = await ExternalFeedback.findOne({ id }).lean();
        if (external) return external;
        return await InternalFeedback.findOne({ id }).lean();
      })
    );

    updatedFeedback.forEach(feedback => {
      if (feedback) {
        io.emit('feedbackUpdate', {
          id: feedback.id,
          status: feedback.status,
          department: feedback.department,
          reportDetails: feedback.reportDetails,
          reportCreatedAt: feedback.reportCreatedAt,
          dept_status: feedback.dept_status,
          date: feedback.date,
          actionHistory: feedback.actionHistory,
        });
      }
    });

    io.emit('bulkFeedbackUpdate', { ids, status: 'assigned', department, reportDetails, dept_status: 'needs_action' });
    res.status(200).json({ message: `Bulk report created for ${updatedCount} feedback items` });
  } catch (error) {
    console.error('Error creating bulk report:', error.message);
    res.status(500).json({ error: 'Failed to create bulk report' });
  }
});

app.use('/api', staffRoutes);
app.use('/api/check-staff-email', checkStaffEmailRoute);
app.use('/api/validate-token', validateTokenRoute);
app.use('/api/mark-token-used', markTokenUsedRouter);
app.use('/api/dept', deptActionRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', verificationRoutes);
app.use('/api', staffFeedbackRoutes);
app.use('/api', departmentLoginRoutes);
app.use('/api', QALoginRoutes);
app.use('/api', adminLoginRoutes);
app.use('/api', reportRoutes);
app.use('/api/dept', fetchDeptFeedback.router);
app.use('/api', fetchAdminFeedback.router);
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