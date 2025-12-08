const QRCode = require('qrcode');
const connectDB = require('./db'); // import the function
const PatientToken = require('./models/PatientToken');
const fs = require('fs');
const path = require('path');

async function generateQRCodes() {
  try {
    await connectDB();

    // get all unused tokens
    const tokens = await PatientToken.find({ used: false });

    if (!tokens.length) {
      console.log("No unused tokens found.");
      process.exit(0);
    }

    // Create main folder and subfolders
    const qrDir = path.join(__dirname, 'qr_codes');
    const patientDir = path.join(qrDir, 'patients');
    const visitorDir = path.join(qrDir, 'visitors');

    [qrDir, patientDir, visitorDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Split tokens in half
    const half = Math.ceil(tokens.length / 2);

    for (let i = 0; i < tokens.length; i++) {
      const tokenDoc = tokens[i];
      const token = tokenDoc.token;

      // Decide which URL and folder to use
      let url, folder;
      if (i < half) {
        url = `https://samclifeedback.github.io/hospital-website/patient-feedback/${token}`;
        folder = patientDir;
      } else {
        url = `https://samclifeedback.github.io/hospital-website/visitor-feedback/${token}`;
        folder = visitorDir;
      }

      const fileName = path.join(folder, `${token}.png`);

      await QRCode.toFile(fileName, url);

      console.log(`Generated QR → ${fileName} for URL: ${url}`);
    }

    console.log("All QR codes generated.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

generateQRCodes();