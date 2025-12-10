// backend/routes/staffRoutes.js (or any route file)
const express = require('express');
const router = express.Router();
const BypassLock = require('../models/BypassLock');

router.post('/bypass-lock', async (req, res) => {
  try {
    const { bypassCode } = req.body;
    if (!bypassCode) return res.json({ success: false, message: 'Code required' });

    const lock = await BypassLock.getInstance();

    if (lock.bypassCode === bypassCode.trim()) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid code' });
    }
  } catch (err) {
    console.error('Bypass error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;