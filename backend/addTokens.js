const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./db'); // your DB connection file
const PatientToken = require('./models/PatientToken'); // your model

// Add new tokens here anytime
const tokens = [
  "AdminToken", 
];

async function insertTokens() {
  await connectDB();

  let insertedCount = 0;

  for (const t of tokens) {
    try {
      const res = await PatientToken.updateOne(
        { token: t },                 // find token
        { $setOnInsert: { token: t } }, // insert if not exists
        { upsert: true }
      );
      if (res.upserted) insertedCount++; // count only newly added tokens
    } catch (err) {
      console.error(`❌ Error inserting token "${t}":`, err.message);
    }
  }

  console.log(`✅ Successfully inserted ${insertedCount} new token(s)`);
  mongoose.connection.close();
}

insertTokens();
