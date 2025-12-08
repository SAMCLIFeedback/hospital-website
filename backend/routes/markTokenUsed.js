const express = require('express');
const router = express.Router();
const PatientToken = require('../models/PatientToken'); // adjust path if needed

// POST /api/mark-token-used/:token
router.post('/:token', async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is missing' });
  }

  try {
    const tokenDoc = await PatientToken.findOne({ token });

    if (!tokenDoc) {
      return res.status(404).json({ success: false, error: 'Token does not exist' });
    }

    if (tokenDoc.used) {
      return res.status(400).json({ success: false, error: 'Token has already been used' });
    }

    // If token is "adminToken", do not mark as used
    if (token === 'adminToken') {
      return res.json({ success: true, message: 'Admin token accessed, not marked as used' });
    }

    tokenDoc.used = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();

    return res.json({ success: true, message: 'Token marked as used' });
  } catch (err) {
    console.error('Error marking token as used:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;