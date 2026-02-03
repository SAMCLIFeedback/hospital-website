// routes/tokens.js
const express     = require('express');
const router      = express.Router();
const Token = require('../models/Token');

// ── re-use your existing helper logic inline ───────────────
const crypto      = require('crypto');
const QRCode      = require('qrcode');
const fs          = require('fs');
const path        = require('path');

const PATIENT_COUNT = 50;
const VISITOR_COUNT = 50;

function generateToken() {
  return `FB-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

async function generateUniqueToken() {
  let token, exists = true;
  while (exists) {
    token = generateToken();
    exists = await Token.exists({ token });
  }
  return token;
}

// ── GET /api/tokens ─────────────────────────────────────────
// Returns every patient & visitor token (excludes admin)
router.get('/', async (req, res) => {
  try {
    const tokens = await Token.find(
      { type: { $in: ['patient', 'visitor'] } }
    ).sort({ createdAt: -1 }).lean();

    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tokens/generate ───────────────────────────────
// Inserts fresh patient + visitor tokens (mirrors addTokens.js)
router.post('/generate', async (req, res) => {
  try {
    const tokens = [];

    for (let i = 0; i < PATIENT_COUNT; i++) {
      tokens.push({ token: await generateUniqueToken(), type: 'patient', used: false });
    }
    for (let i = 0; i < VISITOR_COUNT; i++) {
      tokens.push({ token: await generateUniqueToken(), type: 'visitor', used: false });
    }

    await Token.insertMany(tokens);

    // [UPDATED] Emit event for live rendering
    if (global.io) {
      global.io.emit('tokens_updated'); // Tells frontend to refetch
      global.io.emit('token_generated'); 
    }

    res.json({ message: `Inserted ${tokens.length} tokens.`, count: tokens.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tokens/generate-qr ───────────────────────────
// Generates QR PNGs for every unused patient/visitor token
// (mirrors generate_qr.js)
router.post('/generate-qr', async (req, res) => {
  try {
    const tokens = await Token.find({ used: false, type: { $in: ['patient', 'visitor'] } });

    if (!tokens.length) {
      return res.json({ message: 'No unused tokens to generate QRs for.', count: 0 });
    }

    const qrDir      = path.join(__dirname, '..', 'qr_codes');
    const patientDir = path.join(qrDir, 'patients');
    const visitorDir = path.join(qrDir, 'visitors');

    [qrDir, patientDir, visitorDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    let count = 0;
    for (const doc of tokens) {
      const { token, type } = doc;
      const url =
        type === 'patient'
          ? `https://samclifeedback.github.io/hospital-website/patient-feedback/${token}`
          : `https://samclifeedback.github.io/hospital-website/visitor-feedback/${token}`;

      const folder   = type === 'patient' ? patientDir : visitorDir;
      const fileName = path.join(folder, `${token}.png`);

      await QRCode.toFile(fileName, url);
      count++;
    }

    // [UPDATED] Optional: Emit update (though generation is usually the main trigger)
    if (global.io) {
      global.io.emit('tokens_updated');
    }

    res.json({ message: `Generated ${count} QR codes.`, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;