const express = require('express');
const router = express.Router();
const Staff = require('../models/staffs'); 

router.post('/', async (req, res) => {
  const { email } = req.body;

  try {
    const staff = await Staff.findOne({ email });

    if (!staff) {
      return res.json({ success: false, message: 'Email not authorized.' });
    }

    if (staff.hasSubmittedThisMonth) {
      return res.json({ success: false, message: 'You have already submitted feedback this month.' });
    }

    return res.json({ success: true, staff });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
