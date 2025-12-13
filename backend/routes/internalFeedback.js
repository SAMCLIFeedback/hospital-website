const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { analyzeSentiment } = require('./analyzeSentiment');
const InternalFeedback = require('../models/InternalFeedback');
const Staff = require('../models/staffs'); // Import Staff model
const jwt = require('jsonwebtoken'); // Import JWT
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/staff-feedback', async (req, res) => {
  try {
    // 1. AUTHENTICATION & LIMIT CHECK -----------------------------------
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const staff = await Staff.findOne({ email: decoded.email });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastSubmitted = staff.updatedAt;

    if (lastSubmitted) {
      const lastMonth = lastSubmitted.getMonth();
      const lastYear = lastSubmitted.getFullYear();
      // Check if already submitted this month
      if (lastMonth === currentMonth && lastYear === currentYear && staff.hasSubmittedThisMonth) {
        return res.status(403).json({ 
          error: 'You have already submitted feedback this month.' 
        });
      }
    }

    // 2. DATA PREPARATION ----------------------------------------------
    const {
      feedbackNature,
      otherSpecify,
      immediateAttention,
      department,
      sourceDepartment, 
      impactSeverity,
      description,
      isAnonymous,
      email
    } = req.body;

    // Validate fields
    if (
      !feedbackNature || !department || !sourceDepartment ||
      !description || (feedbackNature === 'other' && !otherSpecify)
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveFeedbackType = feedbackNature === 'other' ? otherSpecify : feedbackNature;
    const id = `int-${uuidv4().split('-')[0]}`;

    // 3. CREATE FEEDBACK -----------------------------------------------
    const feedback = new InternalFeedback({
      id,
      source: 'staff',
      feedbackType: effectiveFeedbackType,
      impactSeverity,
      description,
      isAnonymous,
      email: isAnonymous ? null : email,
      department,
      sourceDepartment,
      sentiment: null,
      sentiment_status: 'pending',
      sentiment_attempts: 0,
      sentiment_error: null,
      date: new Date().toISOString(),
      urgent: immediateAttention || false,
      status: 'pending'
    });

    console.log(`--- ATTEMPTING TO SAVE FEEDBACK: ${id} ---`); 

    // 4. SAVE EVERYTHING (Feedback + Staff Status) ---------------------
    await feedback.save();
    
    // Update staff status AFTER successful feedback save
    staff.hasSubmittedThisMonth = true;
    await staff.save();
    
    global.io.emit('feedbackUpdate', feedback);

    res.status(200).json({
      status: 'success', // Frontend expects 'ok' or status 200
      success: true,     // Added for compatibility with other frontend checks
      message: 'Feedback received successfully!',
      id,
      sentiment: 'pending'
    });

    // 5. BACKGROUND PROCESSING -----------------------------------------
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
            status: 'done'
          }
        },
        { new: true }
      ).lean();
      if (updated) {
        global.io.emit('feedbackUpdate', updated);
      }
    }).catch(async (error) => {
      console.error(`Sentiment analysis failed for ${id}:`, error.message);
      await InternalFeedback.findOneAndUpdate(
        { id },
        {
          $inc: { sentiment_attempts: 1 },
          $set: {
            sentiment_status: 'failed',
            sentiment_error: error.message,
            status: 'pending'
          }
        }
      );
    });
  } catch (error) {
    console.error('Error processing staff feedback:', error.message);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

module.exports = router;