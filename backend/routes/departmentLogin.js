const express = require('express');
const router = express.Router();
const DepartmentHead = require('../models/DepartmentHeads');

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await DepartmentHead.findOne({ username });

    // If user not found or wrong password
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Send back user info (excluding password)
    return res.status(200).json({
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
