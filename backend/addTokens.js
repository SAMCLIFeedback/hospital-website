// addTokens.js
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const connectDB = require('./db');
const Token = require('./models/Token');

// CONFIG
const PATIENT_COUNT = 50;
const VISITOR_COUNT = 50;

// Generate token like: FB-A1B2C3D4E5F6A7B
function generateToken() {
  return `FB-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

// Ensure token is unique in DB
async function generateUniqueToken() {
  let token;
  let exists = true;

  while (exists) {
    token = generateToken();
    exists = await Token.exists({ token });
  }

  return token;
}

async function insertTokens() {
  await connectDB();

  try {
    const tokens = [];

    // PATIENT TOKENS
    for (let i = 0; i < PATIENT_COUNT; i++) {
      const token = await generateUniqueToken();
      tokens.push({
        token,
        type: 'patient',
        used: false
      });
    }

    // VISITOR TOKENS
    for (let i = 0; i < VISITOR_COUNT; i++) {
      const token = await generateUniqueToken();
      tokens.push({
        token,
        type: 'visitor',
        used: false
      });
    }

    // ADMIN TOKEN (only one)
    const adminExists = await Token.exists({ type: 'admin' });
    if (!adminExists) {
      tokens.push({
        token: 'AdminToken',
        type: 'admin',
        used: false
      });
    }

    await Token.insertMany(tokens);
    console.log(`Inserted ${tokens.length} tokens successfully.`);
  } catch (err) {
    console.error('Error inserting tokens:', err);
  } finally {
    mongoose.connection.close();
  }
}

insertTokens();