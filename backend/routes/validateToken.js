const express = require('express');
const router = express.Router();
const PatientToken = require('../models/PatientToken'); // adjust path if needed

// GET /api/validate-token/:token
router.get('/:token', async (req, res) => {
  const { token } = req.params;

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

    // token is valid
    return res.json({ valid: true });
  } catch (err) {
    console.error('Token validation error:', err);
    return res.json({ valid: false, reason: 'server_error' });
  }
});

module.exports = router;