const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { analyzeSentiment } = require('./analyzeSentiment');
const InternalFeedback = require('../models/InternalFeedback');

router.post('/staff-feedback', async (req, res) => {
  try {
    const {
      feedbackNature,
      otherSpecify,
      immediateAttention,
      department,
      impactSeverity,
      description,
      isAnonymous,
      email
    } = req.body;

    if (
      !feedbackNature || !department ||
      !description || (feedbackNature === 'other' && !otherSpecify)
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveFeedbackType = feedbackNature === 'other' ? otherSpecify : feedbackNature;
    const id = `int-${uuidv4().split('-')[0]}`;

    const feedback = new InternalFeedback({
      id,
      source: 'staff',
      feedbackType: effectiveFeedbackType,
      impactSeverity,
      description,
      isAnonymous,
      email: isAnonymous ? null : email,
      department,
      sentiment: null,
      sentiment_status: 'pending',
      sentiment_attempts: 0,
      sentiment_error: null,
      date: new Date().toISOString(), // Store full ISO timestamp
      urgent: immediateAttention || false,
      status: 'pending'
    });

    await feedback.save();
    
    global.io.emit('feedbackUpdate', feedback);

    res.status(200).json({
      status: 'success',
      message: 'Feedback received successfully!',
      id,
      sentiment: 'pending'
    });

    // Background sentiment processing
    analyzeSentiment({
      text: description,
      impactSeverity,
      feedbackType: effectiveFeedbackType,
      source: 'internal'
    }).then(async (sentiment) => {
      console.log(`Sentiment analysis completed for ${id}: ${sentiment}`);
      const updated = await InternalFeedback.findOneAndUpdate(
        { id },
        {
          $set: {
            sentiment,
            sentiment_status: 'completed',
            sentiment_attempts: 1,
            sentiment_error: null,
            status: 'unassigned'
          }
        },
        { new: true }
      ).lean();
      if (updated) {
        console.log(`Emitting feedbackUpdate for ${id}`);
        global.io.emit('feedbackUpdate', updated);
      } else {
        console.error(`Failed to find feedback ${id} for update`);
      }
    }).catch(async (error) => {
      console.error(`Sentiment analysis failed for ${id}:`, error.message);
      const updated = await InternalFeedback.findOneAndUpdate(
        { id },
        {
          $inc: { sentiment_attempts: 1 },
          $set: {
            sentiment_status: 'failed',
            sentiment_error: error.message,
            status: 'pending'
          }
        },
        { new: true }
      ).lean();
      if (updated) {
        console.log(`Emitting feedbackUpdate for failed ${id}`);
        global.io.emit('feedbackUpdate', updated);
      } else {
        console.error(`Failed to find feedback ${id} for failed update`);
      }
    });
  } catch (error) {
    console.error('Error processing staff feedback:', error.message);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

module.exports = router;