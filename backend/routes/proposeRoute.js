// routes/deptActionRoutes.js
const express = require('express');
const router = express.Router();

const ExternalFeedback = require('../models/ExternalFeedback');
const InternalFeedback = require('../models/InternalFeedback');

// Helper function to emit bulk updates
const emitBulkUpdate = (ids, updatedFields) => {
    global.io.emit('bulkFeedbackUpdate', { ids, ...updatedFields });
};


// PATCH /api/dept/propose-action
router.patch('/propose-action', async (req, res) => {
  const { ids, finalActionDescription } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !finalActionDescription) {
    return res.status(400).json({ error: 'Invalid payload. IDs and description required.' });
  }

  try {
    const extIds = ids.filter(id => id.startsWith('ext-'));
    const intIds = ids.filter(id => id.startsWith('int-'));

    const updateFields = {
      dept_status: 'proposed',
      finalActionDescription,
    };

    const [externalResult, internalResult] = await Promise.all([
      ExternalFeedback.updateMany(
        { id: { $in: extIds } },
        { $set: updateFields }
      ),
      InternalFeedback.updateMany(
        { id: { $in: intIds } },
        { $set: updateFields }
      )
    ]);
    
    emitBulkUpdate(ids, { dept_status: 'proposed' });

    res.status(200).json({
      message: 'Proposed actions submitted successfully.',
      updated: extIds.length + intIds.length,
    });
  } catch (err) {
    console.error('Error proposing action:', err);
    res.status(500).json({ error: 'Internal server error while proposing action.' });
  }
});

// PATCH /api/dept/no-action
router.patch('/no-action', async (req, res) => {
  const { ids, userName } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid payload. IDs required.' });
  }

  try {
    const extIds = ids.filter(id => id.startsWith('ext-'));
    const intIds = ids.filter(id => id.startsWith('int-'));

    const actionEntry = {
      action: 'No Action Needed',
      user: userName || 'Unknown',
      timestamp: new Date(),
      details: 'Feedback marked as no action needed.',
    };

    const updateFields = {
        dept_status: 'no_action_needed',
        finalActionDescription: 'No Action Required',
    };

    const [externalResult, internalResult] = await Promise.all([
        ExternalFeedback.updateMany(
            { id: { $in: extIds } },
            { $set: updateFields, $push: { actionHistory: actionEntry } }
        ),
        InternalFeedback.updateMany(
            { id: { $in: intIds } },
            { $set: updateFields, $push: { actionHistory: actionEntry } }
        ),
    ]);

    emitBulkUpdate(ids, { dept_status: 'no_action_needed' });

    res.status(200).json({
      message: 'No action updates applied successfully.',
      updated: (externalResult.modifiedCount || 0) + (internalResult.modifiedCount || 0),
    });
  } catch (err) {
    console.error('Error applying no action status:', err);
    res.status(500).json({ error: 'Internal server error while applying no action status.' });
  }
});

// PATCH /api/dept/approve
router.patch('/approve', async (req, res) => {
  const { ids, userName } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !userName || typeof userName !== 'string' || userName.trim() === '') {
    return res.status(400).json({ error: 'Invalid payload. IDs and a non-empty userName are required.' });
  }

  try {
    const extIds = ids.filter(id => id.startsWith('ext-'));
    const intIds = ids.filter(id => id.startsWith('int-'));

    const actionEntry = {
      action: 'Approved',
      user: userName,
      timestamp: new Date(),
      details: 'Admin approved the proposed action.',
    };

    const updateFields = { dept_status: 'approved' };

    const [externalResult, internalResult] = await Promise.all([
      ExternalFeedback.updateMany(
        { id: { $in: extIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
      InternalFeedback.updateMany(
        { id: { $in: intIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
    ]);

    const updatedCount = (externalResult.modifiedCount || 0) + (internalResult.modifiedCount || 0);
    if (updatedCount > 0) {
        emitBulkUpdate(ids, { dept_status: 'approved' });
    }

    res.status(200).json({
      message: 'Approval status applied successfully.',
      updated: updatedCount,
    });
  } catch (err) {
    console.error('Error applying approval status:', err);
    res.status(500).json({ error: 'Internal server error while applying approval.' });
  }
});

// PATCH /api/dept/request-revision (MODIFIED FOR BULK)
router.patch('/request-revision', async (req, res) => {
  const { ids, notes, userName } = req.body;

  if (!Array.isArray(ids) || ids.length === 0 || !notes || !userName) {
    return res.status(400).json({ error: 'Array of IDs, notes, and userName are required.' });
  }

  try {
    const actionEntry = {
        action: 'Revision Requested',
        user: userName,
        timestamp: new Date(),
        details: `Notes: ${notes}`
    };

    const updateFields = { 
        dept_status: 'need_revision', 
        revisionNotes: notes 
    };

    const extIds = ids.filter(id => id.startsWith('ext-'));
    const intIds = ids.filter(id => id.startsWith('int-'));

    const [externalResult, internalResult] = await Promise.all([
      ExternalFeedback.updateMany(
        { id: { $in: extIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
      InternalFeedback.updateMany(
        { id: { $in: intIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
    ]);
    
    const updatedCount = (externalResult.modifiedCount || 0) + (internalResult.modifiedCount || 0);

    if (updatedCount > 0) {
        emitBulkUpdate(ids, { dept_status: 'need_revision' });
    }

    res.status(200).json({ 
        message: 'Revision requested successfully.', 
        updated: updatedCount
    });
  } catch (err) {
    console.error('Error requesting revision:', err);
    res.status(500).json({ error: 'Internal server error while requesting revision.' });
  }
});


// PATCH /api/dept/escalate-feedback (MODIFIED FOR BULK REASSIGNMENT)
router.patch('/escalate-feedback', async (req, res) => {
  const { ids, adminNotes, department, userName } = req.body;

  if (!Array.isArray(ids) || ids.length === 0 || !adminNotes?.trim() || !department || !userName) {
    return res.status(400).json({ error: 'Feedback IDs, admin notes, department, and userName are required.' });
  }

  const actionEntry = {
    action: 'Assigned to Department',
    user: userName,
    timestamp: new Date(),
    details: `Assigned to ${department} with notes: ${adminNotes}`
  };

  const updateFields = {
    adminNotes,
    dept_status: 'needs_action',
    department,
  };
  
  const extIds = ids.filter(id => id.startsWith('ext-'));
  const intIds = ids.filter(id => id.startsWith('int-'));

  try {
    const [externalResult, internalResult] = await Promise.all([
      ExternalFeedback.updateMany(
        { id: { $in: extIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
      InternalFeedback.updateMany(
        { id: { $in: intIds } },
        { $set: updateFields, $push: { actionHistory: actionEntry } }
      ),
    ]);

    const updatedCount = (externalResult.modifiedCount || 0) + (internalResult.modifiedCount || 0);
    if (updatedCount > 0) {
        emitBulkUpdate(ids, { dept_status: 'needs_action', department });
    }

    res.status(200).json({ 
        message: 'Feedback escalated and reassigned.', 
        updated: updatedCount
    });
  } catch (err) {
    console.error('Admin escalation error:', err);
    res.status(500).json({ error: 'Internal server error while escalating feedback.' });
  }
});

// PATCH /api/dept/final-approve
router.patch('/final-approve', async (req, res) => {
    const { ids, finalActionDescription, userName } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !finalActionDescription?.trim() || !userName) {
      return res.status(400).json({ error: 'IDs, final action description, and userName are required.' });
    }

    try {
      const extIds = ids.filter(id => id.startsWith('ext-'));
      const intIds = ids.filter(id => id.startsWith('int-'));

      const actionEntry = {
        action: 'Approved',
        user: userName,
        timestamp: new Date(),
        details: 'Admin approved and finalized the action directly.',
      };

      const updateFields = {
        dept_status: 'approved',
        finalActionDescription,
      };

      const [externalResult, internalResult] = await Promise.all([
        ExternalFeedback.updateMany(
          { id: { $in: extIds } },
          { $set: updateFields, $push: { actionHistory: actionEntry } }
        ),
        InternalFeedback.updateMany(
          { id: { $in: intIds } },
          { $set: updateFields, $push: { actionHistory: actionEntry } }
        )
      ]);

      const updatedCount = (externalResult.modifiedCount || 0) + (internalResult.modifiedCount || 0);
      
      if (updatedCount > 0) {
          emitBulkUpdate(ids, { dept_status: 'approved' });
      }

      res.status(200).json({
        message: 'Final approval completed successfully.',
        updated: updatedCount,
    });
    } catch (err) {
      console.error('Error during final approval:', err);
      res.status(500).json({ error: 'Internal server error while applying final approval.' });
    }
  });

module.exports = router;