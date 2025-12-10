// insertBypass.js   (put in backend root)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./db'); // your existing db connection
const BypassLock = require('./models/BypassLock');

async function insertBypassCode() {
  await connectDB();

  try {
    // CHANGE THIS TO YOUR REAL STRONG CODE!
    const YOUR_REAL_CODE = "KDH-ADMIN-2025-UNLOCK-9X7Z2K";

    await BypassLock.deleteMany({}); // ensure only one document

    await BypassLock.create({
      bypassCode: YOUR_REAL_CODE
    });

    console.log('Bypass code successfully inserted!');
    console.log('Your code →', YOUR_REAL_CODE);
    console.log('You can now delete this file for security.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
  }
}

insertBypassCode();