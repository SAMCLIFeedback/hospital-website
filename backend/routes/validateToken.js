// routes/validateToken.js
const express = require('express');
const router = express.Router();
const PatientToken = require('../models/PatientToken');

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const { expectedType } = req.query; // sent from frontend

  if (!token) {
    return res.json({ valid: false, reason: 'missing' });
  }

  try {
    const tokenDoc = await PatientToken.findOne({ token });

    if (!tokenDoc) {
      return res.json({ valid: false, reason: 'not_found' });
    }

    if (tokenDoc.used) {
      return res.json({ valid: false, reason: 'used' });
    }

    // Block if trying to use wrong form
    if (expectedType && tokenDoc.type !== expectedType && tokenDoc.type !== 'admin') {
      return res.json({ 
        valid: false, 
        reason: 'wrong_form',
        message: 'This QR code is not valid for this feedback form.'
      });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error('Token validation error:', err);
    return res.json({ valid: false, reason: 'server_error' });
  }
});

module.exports = router;