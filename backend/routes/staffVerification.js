require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Staff = require('../models/staffs');
const cron = require('node-cron'); // ← NEW

const SibApiV3Sdk = require('@getbrevo/brevo');
const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
brevoClient.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const pinsFilePath = path.join(__dirname, '../pins.json');

function loadPins() {
  try {
    const data = fs.readFileSync(pinsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function savePins(pins) {
  fs.writeFileSync(pinsFilePath, JSON.stringify(pins, null, 2));
}

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// AUTO RESET EVERY 1ST OF THE MONTH AT 00:05 AM
cron.schedule('5 0 1 * *', async () => {
  try {
    const result = await Staff.updateMany(
      { hasSubmittedThisMonth: true },
      { $set: { hasSubmittedThisMonth: false } }
    );
    console.log(`MONTHLY RESET SUCCESSFUL → ${result.modifiedCount} staff records reset to allow new submissions`);
  } catch (err) {
    console.error('Monthly reset failed:', err.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila" 
});

console.log('Monthly reset cron job scheduled: Every 1st of month at 00:05 AM');

// Existing routes below (unchanged)
router.post('/send-pin', async (req, res) => {
  const { email } = req.body;
  const pins = loadPins();
  const now = Date.now();
  const existing = pins[email];

  if (existing && existing.sentCount >= 3 && now - existing.lastSentAt < 60 * 60 * 1000) {
    return res.status(429).json({ success: false, message: 'Too many PIN requests. Try again later.' });
  }

  const pin = generatePIN();
  const expiresAt = now + 10 * 60 * 1000;

  pins[email] = {
    pin,
    expiresAt,
    lastSentAt: now,
    sentCount: existing ? existing.sentCount + 1 : 1
  };

  try {
    await brevoClient.sendTransacEmail({
      sender: { name: 'Smart Feedback Mechanism', email: 'samclifeedback@gmail.com' },
      to: [{ email }],
      subject: 'Your Verification PIN for Smart Feedback Mechanism',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
          <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #22c55e; text-align: center;">Smart Feedback Mechanism</h2>
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 16px; color: #333;">Your 6-digit PIN:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #22c55e; letter-spacing: 3px;">${pin}</span>
            </div>
            <p style="font-size: 14px; color: #555;">Expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });

    savePins(pins);
    console.log(`PIN sent to ${email}: ${pin}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending PIN:', error);
    res.status(500).json({ success: false, message: 'Failed to send PIN' });
  }
});

router.post('/verify-pin', async (req, res) => {
  const { email, pin } = req.body;
  const pins = loadPins();
  const record = pins[email];

  if (!record) return res.status(400).json({ success: false, message: 'No PIN found' });
  if (Date.now() > record.expiresAt) {
    delete pins[email];
    savePins(pins);
    return res.status(400).json({ success: false, message: 'PIN expired' });
  }
  if (record.pin !== pin) return res.status(400).json({ success: false, message: 'Incorrect PIN' });

  const staff = await Staff.findOne({ email });
  if (!staff) {
    delete pins[email];
    savePins(pins);
    return res.status(400).json({ success: false, message: 'Staff not found' });
  }

  delete pins[email];
  savePins(pins);

  const token = jwt.sign(
    {
      email: staff.email,
      department: staff.department || 'General Staff'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ success: true, token });
});

router.post('/staff-feedback', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const staff = await Staff.findOne({ email: decoded.email });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastSubmitted = staff.updatedAt;

    if (lastSubmitted) {
      const lastMonth = lastSubmitted.getMonth();
      const lastYear = lastSubmitted.getFullYear();
      if (lastMonth === currentMonth && lastYear === currentYear && staff.hasSubmittedThisMonth) {
        return res.status(403).json({ 
          success: false, 
          message: 'You have already submitted feedback this month.' 
        });
      }
    }

    staff.hasSubmittedThisMonth = true;
    await staff.save();

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Feedback submission error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;