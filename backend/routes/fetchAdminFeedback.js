// fetchAdminFeedback.js
const express = require('express');
const router = express.Router();
const ExternalFeedback = require('../models/ExternalFeedback');
const InternalFeedback = require('../models/InternalFeedback');

// Fetch feedback based on status and dept_status
// Fetch feedback based on status and dept_status
router.get('/feedback', async (req, res) => {
  try {
    const excludedCondition = {
      $nor: [
        { status: 'escalated', dept_status: 'needs_action' } // exclude this combo
      ],
      $or: [
        { status: 'escalated' },
        { dept_status: { $in: ['proposed', 'approved', 'no_action_needed'] } }
      ]
    };

    const externalFeedback = await ExternalFeedback.find(excludedCondition)
      .sort({ date: -1 })
      .lean();

    const internalFeedback = await InternalFeedback.find(excludedCondition)
      .sort({ date: -1 })
      .lean();

    const feedback = [...externalFeedback, ...internalFeedback]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(item => ({
        ...item,
        id: item.id?.toString() || `unknown-${Date.now()}`
      }));

    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Setup change streams for real-time updates
const setupFeedbackChangeStreams = (io) => {
  const externalChangeStream = ExternalFeedback.watch([], { fullDocument: 'updateLookup' });
  const internalChangeStream = InternalFeedback.watch([], { fullDocument: 'updateLookup' });

  // Track recently emitted events to prevent duplicates
  const recentlyEmitted = new Set();

  const handleChange = (change) => {
    const feedback = change.fullDocument;
    if (!feedback) return;

    if (
      feedback.status === 'escalated' ||
      ['proposed', 'approved', 'no_action_needed'].includes(feedback.dept_status || '')
    ) {
      const uniqueKey = `${feedback.id}-${feedback.dept_status}`;
      
      // Prevent duplicate emissions within 1 second
      if (!recentlyEmitted.has(uniqueKey)) {
        recentlyEmitted.add(uniqueKey);
        setTimeout(() => recentlyEmitted.delete(uniqueKey), 1000);

        io.emit('feedbackUpdate', {
          ...feedback,
          id: feedback.id?.toString() || `unknown-${Date.now()}`
        });
      }
    }
  };

  externalChangeStream.on('change', handleChange);
  internalChangeStream.on('change', handleChange);
};

module.exports = { router, setupFeedbackChangeStreams };