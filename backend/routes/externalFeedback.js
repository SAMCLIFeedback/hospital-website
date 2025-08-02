const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { analyzeSentiment } = require('./analyzeSentiment');
const ExternalFeedback = require('../models/ExternalFeedback');

router.post('/feedback', async (req, res) => {
  try {
    const {
      role,
      feedbackType,
      department,
      rating,
      description,
      isAnonymous,
      email,
      phone,
      consentAgreed
    } = req.body;

    if (
      !role || !feedbackType || !department ||
      !rating || !description || !consentAgreed
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `ext-${uuidv4().split('-')[0]}`;
    const feedback = new ExternalFeedback({
      id,
      source: role,
      feedbackType,
      department,
      rating,
      description,
      isAnonymous,
      email: isAnonymous ? null : email,
      phone: isAnonymous ? null : phone,
      sentiment: null,
      sentiment_status: 'pending',
      sentiment_attempts: 0,
      sentiment_error: null,
      date: new Date().toISOString(), // Store full ISO timestamp
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

    // Background sentiment analysis
    analyzeSentiment({
      text: description,
      rating,
      feedbackType,
      source: 'external'
    }).then(async (sentiment) => {
      console.log(`Sentiment analysis completed for ${id}: ${sentiment}`);
      const updated = await ExternalFeedback.findOneAndUpdate(
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
      const updated = await ExternalFeedback.findOneAndUpdate(
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
    console.error('Error processing external feedback:', error.message);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

module.exports = router;