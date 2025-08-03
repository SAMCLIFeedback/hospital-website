const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const router = express.Router();

const pinsFilePath = path.join(__dirname, '../pins.json');

// Helper: Load and save PINs
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

// Generate 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'samclifeedback@gmail.com',
    pass: 'jlqa vdai rikb usnp'
  }
});

// Send PIN
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
    await transporter.sendMail({
      from: 'samclifeedback@gmail.com',
      to: email,
      subject: 'Your Verification PIN',
      text: `Your verification PIN is: ${pin}`
    });

    savePins(pins);
    console.log(`📨 PIN sent to ${email}: ${pin}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error sending PIN:', error);
    res.status(500).json({ success: false, message: 'Failed to send PIN' });
  }
});

// Verify PIN
router.post('/verify-pin', (req, res) => {
  const { email, pin } = req.body;
  const pins = loadPins();
  const record = pins[email];

  if (!record) {
    return res.status(400).json({ success: false, message: 'No PIN found for this email' });
  }

  if (Date.now() > record.expiresAt) {
    delete pins[email];
    savePins(pins);
    return res.status(400).json({ success: false, message: 'PIN expired' });
  }

  if (record.pin !== pin) {
    return res.status(400).json({ success: false, message: 'Incorrect PIN' });
  }

  delete pins[email];
  savePins(pins);
  res.json({ success: true });
});

module.exports = router;
