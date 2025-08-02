// feedbackRoutes.js

const express = require('express');
const router = express.Router();
const ExternalFeedback = require('../models/ExternalFeedback');
const InternalFeedback = require('../models/InternalFeedback');

// IMPORTANT: Place more specific routes before more general ones to ensure correct matching.

// This new route handles escalation.
router.patch('/feedback/escalate', async (req, res) => {
  try {
    const { ids, department, reportDetails, userName } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'An array of feedback IDs is required.' });
    }
    if (!reportDetails || reportDetails.trim() === '') {
      return res.status(400).json({ error: 'Report details are required for escalation.' });
    }

    const actionEntry = {
      action: 'Escalated',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details: department ? `Escalated to: ${department}` : 'Escalated to Admin',
    };

    const updatePayload = {
      status: 'escalated',
      dept_status: 'escalated',
      department: department || 'Admin Escalation',
      reportDetails: reportDetails.trim(),
      reportCreatedAt: new Date(),
      $push: { actionHistory: actionEntry },
    };

    const externalIds = ids.filter(id => id.startsWith('ext-'));
    const internalIds = ids.filter(id => id.startsWith('int-'));

    let externalResult = { modifiedCount: 0 };
    let internalResult = { modifiedCount: 0 };

    if (externalIds.length > 0) {
      externalResult = await ExternalFeedback.updateMany(
        { id: { $in: externalIds } },
        updatePayload
      );
    }

    if (internalIds.length > 0) {
      internalResult = await InternalFeedback.updateMany(
        { id: { $in: internalIds } },
        updatePayload
      );
    }
    
    const totalModified = externalResult.modifiedCount + internalResult.modifiedCount;

    global.io.emit('bulkFeedbackUpdate');

    res.status(200).json({
      message: 'Feedback escalated successfully!',
      updatedCount: totalModified,
    });
  } catch (error) {
    console.error('Error during feedback escalation:', error.message);
    res.status(500).json({ error: 'Failed to escalate feedback.' });
  }
});

// This route handles bulk reporting/assignment of feedback.
router.patch('/feedback/bulk-report', async (req, res) => {
  try {
    const { ids, department, reportDetails, userName } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'An array of feedback IDs is required.' });
    }
    if (!department || !reportDetails) {
      return res.status(400).json({ error: 'Department and reportDetails are required.' });
    }

    const actionEntry = {
      action: 'Report Assigned',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details: `Assigned to: ${department}`,
    };

    const updatePayload = {
      status: 'assigned',
      dept_status: 'needs_action',
      department: department,
      reportDetails: reportDetails.trim(),
      reportCreatedAt: new Date(),
      $push: { actionHistory: actionEntry },
    };

    const externalIds = ids.filter(id => id.startsWith('ext-'));
    const internalIds = ids.filter(id => id.startsWith('int-'));

    let externalResult = { modifiedCount: 0 };
    let internalResult = { modifiedCount: 0 };

    if (externalIds.length > 0) {
      externalResult = await ExternalFeedback.updateMany(
        { id: { $in: externalIds } },
        updatePayload
      );
    }

    if (internalIds.length > 0) {
      internalResult = await InternalFeedback.updateMany(
        { id: { $in: internalIds } },
        updatePayload
      );
    }
    
    const totalModified = externalResult.modifiedCount + internalResult.modifiedCount;

    global.io.emit('bulkFeedbackUpdate');

    res.status(200).json({
      message: 'Bulk feedback updated successfully!',
      updatedCount: totalModified,
    });
  } catch (error) {
    console.error('Error during bulk report update:', error.message);
    res.status(500).json({ error: 'Failed to perform bulk update.' });
  }
});

router.patch('/feedback/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'An array of feedback IDs is required.' });
    }
    if (!status || !['spam', 'unassigned', 'pending', 'assigned'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required.' });
    }

    const updatePayload = {
      status,
      ...(status === 'assigned' ? { dept_status: 'needs_action' } : { dept_status: null }),
    };

    const externalIds = ids.filter(id => id.startsWith('ext-'));
    const internalIds = ids.filter(id => id.startsWith('int-'));

    let externalResult = { modifiedCount: 0 };
    let internalResult = { modifiedCount: 0 };

    if (externalIds.length > 0) {
      externalResult = await ExternalFeedback.updateMany(
        { id: { $in: externalIds } },
        { $set: updatePayload }
      );
    }

    if (internalIds.length > 0) {
      internalResult = await InternalFeedback.updateMany(
        { id: { $in: internalIds } },
        { $set: updatePayload }
      );
    }

    const totalModified = externalResult.modifiedCount + internalResult.modifiedCount;

    // Emit update event
    global.io.emit('bulkFeedbackUpdate');

    res.status(200).json({
      message: `Bulk status updated to ${status} successfully!`,
      updatedCount: totalModified,
    });
  } catch (error) {
    console.error('Error during bulk status update:', error.message);
    res.status(500).json({ error: 'Failed to perform bulk status update.' });
  }
});

router.patch('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, department, reportDetails, reportCreatedAt, sentiment, userName } = req.body;

    const updateFields = {};
    if (status) updateFields.status = String(status);
    if (department) updateFields.department = String(department);
    if (sentiment) {
      updateFields.sentiment = sentiment;
      updateFields.sentiment_status = 'completed';
    }
    if (reportDetails !== undefined) updateFields.reportDetails = String(reportDetails).trim();
    if (reportCreatedAt) {
      const parsedDate = new Date(reportCreatedAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid reportCreatedAt format.' });
      }
      updateFields.reportCreatedAt = parsedDate;
    }
    if (status === 'assigned') {
      updateFields.dept_status = 'needs_action';
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No valid fields were provided for update.' });
    }

    const actionEntry = {
      action: updateFields.status === 'assigned' ? 'Report Assigned' :
              updateFields.status === 'spam' ? 'Tagged as Spam' :
              updateFields.status === 'unassigned' ? 'Restored' : 'Updated',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details:
        updateFields.status === 'assigned'
          ? `Assigned to: ${updateFields.department || 'Unknown'}`
          : updateFields.status === 'spam'
          ? 'Tagged as Spam'
          : updateFields.status === 'unassigned'
          ? 'Feedback restored'
          : '',
    };

    const Model = id.startsWith('ext-') ? ExternalFeedback : InternalFeedback;
    let updatedFeedback = await Model.findOneAndUpdate(
      { id },
      { 
        $set: updateFields,
        $push: { actionHistory: actionEntry }
      },
      { new: true, runValidators: true, strict: false }
    );

    if (!updatedFeedback) {
      const AlternateModel = id.startsWith('ext-') ? InternalFeedback : ExternalFeedback;
      updatedFeedback = await AlternateModel.findOneAndUpdate(
        { id },
        { 
          $set: updateFields,
          $push: { actionHistory: actionEntry }
        },
        { new: true, runValidators: true, strict: false }
      );
    }

    if (!updatedFeedback) {
      return res.status(404).json({ error: `Feedback not found for ID: ${id}` });
    }

    global.io.emit('feedbackUpdate', updatedFeedback);

    res.status(200).json({
      message: 'Feedback updated successfully!',
      feedback: updatedFeedback
    });
  } catch (error) {
    console.error(`Error updating feedback in feedbackRoutes.js: ${error.message}`);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

module.exports = router;