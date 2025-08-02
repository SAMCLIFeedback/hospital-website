// fetchDeptFeedback.js
const express = require('express');
const router = express.Router();
const ExternalFeedback = require('../models/ExternalFeedback');
const InternalFeedback = require('../models/InternalFeedback');

// Fetch feedback for department
router.post('/feedback', async (req, res) => {
  try {
    const { department } = req.body;
    if (!department) {
      return res.status(400).json({ message: 'Department is required.' });
    }

    const allowedDeptStatuses = ['needs_action', 'proposed', 'need_revision', 'approved', 'no_action_needed'];

    const externalFeedback = await ExternalFeedback.find({
      department,
      dept_status: { $in: allowedDeptStatuses },
      $or: [
        { status: { $ne: null } },
        { $and: [{ status: null }, { adminNotes: { $ne: null } }] }
      ]
    }).lean();

    const internalFeedback = await InternalFeedback.find({
      department,
      dept_status: { $in: allowedDeptStatuses },
      $or: [
        { status: { $ne: null } },
        { $and: [{ status: null }, { adminNotes: { $ne: null } }] }
      ]
    }).lean();

    const combinedFeedback = [
      ...externalFeedback.map(f => ({ ...f, sourceType: 'external' })),
      ...internalFeedback.map(f => ({ ...f, sourceType: 'internal' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(combinedFeedback);
  } catch (error) {
    console.error('Fetch feedback error:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 🔄 Change stream setup
const setupDeptFeedbackChangeStreams = (io) => {
  const externalStream = ExternalFeedback.watch([], { fullDocument: 'updateLookup' });
  const internalStream = InternalFeedback.watch([], { fullDocument: 'updateLookup' });

  const emitIfAllowedStatus = (change) => {
    const doc = change.fullDocument;
    const allowedDeptStatuses = ['needs_action', 'proposed', 'need_revision', 'approved', 'no_action_needed'];

    const shouldEmit =
      doc &&
      allowedDeptStatuses.includes(doc.dept_status) &&
      (
        doc.status !== null ||
        (doc.status === null && doc.adminNotes !== null)
      );

    if (shouldEmit) {
      io.emit('deptFeedbackUpdate', {
        id: doc.id,
        department: doc.department,
        date: doc.date,
        dept_status: doc.dept_status,
        status: doc.status,
        description: doc.description,
        reportDetails: doc.reportDetails,
        source: doc.source,
        rating: doc.rating,
        impactSeverity: doc.impactSeverity,
        sentiment: doc.sentiment,
        sentiment_status: doc.sentiment_status,
        urgent: doc.urgent,
        revisionNotes: doc.revisionNotes,
        finalActionDescription: doc.finalActionDescription,
        actionHistory: doc.actionHistory || [], // Include actionHistory
      });
    }
  };

  externalStream.on('change', (change) => {
    if (['insert', 'update', 'replace'].includes(change.operationType)) {
      if (change.fullDocument) emitIfAllowedStatus(change);
    }
  });

  internalStream.on('change', (change) => {
    if (['insert', 'update', 'replace'].includes(change.operationType)) {
      if (change.fullDocument) emitIfAllowedStatus(change);
    }
  });
};
module.exports = {
    router,
    setupDeptFeedbackChangeStreams,
};