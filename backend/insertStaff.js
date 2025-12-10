// scripts/insertStaff.js
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db'); // adjust path if this file is in scripts/
const Staff = require('./models/staffs'); // adjust path if needed

const staffList = [
  { email: 'lopezreinher7@gmail.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'janedoe@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'michael.brown@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'chloe.adams@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'logan.baker@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'gabriel.cox@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },
  { email: 'elena.sullivan@example.com', department: 'Emergency Room (ER)', hasSubmittedThisMonth: false },

  { email: 'dr.ana@example.com', department: 'Anesthesiology', hasSubmittedThisMonth: false },
  { email: 'dr.ben@example.com', department: 'Internal Medicine', hasSubmittedThisMonth: false },
  { email: 'dr.carl@example.com', department: 'Internal Medicine', hasSubmittedThisMonth: false },
  { email: 'sara.connor@example.com', department: 'Surgery', hasSubmittedThisMonth: false },
  { email: 'jacob.miller@example.com', department: 'Surgery', hasSubmittedThisMonth: false },
  { email: 'grace.perez@example.com', department: 'Surgery', hasSubmittedThisMonth: false },
  { email: 'benjamin.lewis@example.com', department: 'Surgery', hasSubmittedThisMonth: false },

  { email: 'alicewong@example.com', department: 'Pediatrics', hasSubmittedThisMonth: false },
  { email: 'william.taylor@example.com', department: 'Pediatrics', hasSubmittedThisMonth: false },
  { email: 'isabella.king@example.com', department: 'Pediatrics', hasSubmittedThisMonth: false },

  { email: 'dr.diane@example.com', department: 'Obstetrics and Gynecology (OB-GYNE)', hasSubmittedThisMonth: false },

  { email: 'nurse.emma@example.com', department: 'Nursing Service', hasSubmittedThisMonth: false },
  { email: 'nurse.fiona@example.com', department: 'Nursing Service', hasSubmittedThisMonth: false },
  { email: 'nurse.gary@example.com', department: 'Nursing Service', hasSubmittedThisMonth: false },
  { email: 'nurse.helen@example.com', department: 'Nursing Service', hasSubmittedThisMonth: false },

  { email: 'dr.ian@example.com', department: 'Intensive Care Unit (ICU)', hasSubmittedThisMonth: false },
  { email: 'nurse.jackie@example.com', department: 'Intensive Care Unit (ICU)', hasSubmittedThisMonth: false },

  { email: 'dr.kara@example.com', department: 'Family Medicine', hasSubmittedThisMonth: false },

  { email: 'johnsmith@example.com', department: 'Cardiology', hasSubmittedThisMonth: false },
  { email: 'olivia.wilson@example.com', department: 'Cardiology', hasSubmittedThisMonth: false },
  { email: 'lily.gomez@example.com', department: 'Cardiology', hasSubmittedThisMonth: false },

  { email: 'dr.leo@example.com', department: 'Nephrology', hasSubmittedThisMonth: false },
  { email: 'dr.maya@example.com', department: 'Dermatology', hasSubmittedThisMonth: false },
  { email: 'dr.nolan@example.com', department: 'ENT (Ear, Nose, Throat)', hasSubmittedThisMonth: false },
  { email: 'dr.pam@example.com', department: 'Ophthalmology', hasSubmittedThisMonth: false },

  { email: 'david.kim@example.com', department: 'Orthopedics', hasSubmittedThisMonth: false },
  { email: 'ava.jones@example.com', department: 'Orthopedics', hasSubmittedThisMonth: false },

  { email: 'dr.quinn@example.com', department: 'Urology', hasSubmittedThisMonth: false },
  { email: 'dr.rick@example.com', department: 'Rehabilitation Medicine', hasSubmittedThisMonth: false },

  { email: 'bobmartin@example.com', department: 'Radiology', hasSubmittedThisMonth: false },
  { email: 'sophia.lee@example.com', department: 'Radiology', hasSubmittedThisMonth: false },
  { email: 'ryan.scott@example.com', department: 'Radiology', hasSubmittedThisMonth: false },

  { email: 'dr.susan@example.com', department: 'Pathology', hasSubmittedThisMonth: false },
  { email: 'tech.tim@example.com', department: 'Diagnostics', hasSubmittedThisMonth: false },
  { email: 'pt.ursula@example.com', department: 'Physical Therapy', hasSubmittedThisMonth: false },

  { email: 'pharm.vic@example.com', department: 'Pharmacy', hasSubmittedThisMonth: false },
  { email: 'pharm.wendy@example.com', department: 'Pharmacy', hasSubmittedThisMonth: false },

  { email: 'diet.xavier@example.com', department: 'Dietary', hasSubmittedThisMonth: false },

  { email: 'admit.yara@example.com', department: 'Inpatient Department', hasSubmittedThisMonth: false },
  { email: 'admit.zane@example.com', department: 'Outpatient Department', hasSubmittedThisMonth: false },
  { email: 'clerk.anna@example.com', department: 'Outpatient Department', hasSubmittedThisMonth: false },

  { email: 'or.tech@example.com', department: 'Operating Room', hasSubmittedThisMonth: false },
  { email: 'best.health@example.com', department: 'BESTHEALTH', hasSubmittedThisMonth: false },
];

async function insertStaff() {
  try {
    await connectDB(); // use db.js for connection
    console.log('✅ Connected to MongoDB via db.js');

    const result = await Staff.insertMany(staffList, { ordered: false });
    console.log(`Inserted ${result.length} staff records successfully.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error inserting staff:', err);
    await mongoose.disconnect();
  }
}

insertStaff();
