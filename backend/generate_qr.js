// generate_qr.js
const QRCode = require('qrcode');
const connectDB = require('./db');
const PatientToken = require('./models/PatientToken');
const fs = require('fs');
const path = require('path');

async function generateQRCodes() {
  try {
    await connectDB();

    const tokens = await PatientToken.find({ used: false, type: { $in: ['patient', 'visitor'] } });

    if (!tokens.length) {
      console.log("No unused patient/visitor tokens found.");
      process.exit(0);
    }

    const qrDir = path.join(__dirname, 'qr_codes');
    const patientDir = path.join(qrDir, 'patients');
    const visitorDir = path.join(qrDir, 'visitors');

    [qrDir, patientDir, visitorDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    for (const tokenDoc of tokens) {
      const { token, type } = tokenDoc;

      let url, folder;
      if (type === 'patient') {
        url = `https://samclifeedback.github.io/hospital-website/patient-feedback/${token}`;
        folder = patientDir;
      } else if (type === 'visitor') {
        url = `https://samclifeedback.github.io/hospital-website/visitor-feedback/${token}`;
        folder = visitorDir;
      } else {
        continue;
      }

      const fileName = path.join(folder, `${token}.png`);
      await QRCode.toFile(fileName, url);
      console.log(`Generated ${type} QR → ${fileName}`);
    }

    console.log("All QR codes generated successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

generateQRCodes();