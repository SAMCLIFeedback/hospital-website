require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
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

// Nodemailer setup (localhost)
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'samclifeedback@gmail.com',
//     pass: 'jlqa vdai rikb usnp'
//   }
// });

// Nodemailer setup (Brevo SMTP)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // use true if port 465
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  tls: {
    rejectUnauthorized: false, // keep this false on Render to avoid TLS issues
  },
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
      subject: 'Your Verification PIN for Smart Feedback Mechanism',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
          <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #22c55e; text-align: center;">Smart Feedback Mechanism</h2>
            <p style="font-size: 16px; color: #333;">
              Hello,
            </p>
            <p style="font-size: 16px; color: #333;">
              To verify your email address, please use the following 6-digit PIN:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #22c55e; letter-spacing: 3px;">${pin}</span>
            </div>
            <p style="font-size: 14px; color: #555;">
              This PIN will expire in 10 minutes. If you didn’t request this, you can safely ignore this message.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} San Antonio Medical Center of Lipa, Inc.
            </p>
          </div>
        </div>
      `
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
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '15m' });
  res.json({ success: true, token });
});

module.exports = router;
