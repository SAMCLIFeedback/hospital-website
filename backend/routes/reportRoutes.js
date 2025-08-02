const express = require('express');
const router = express.Router();
const { generateFeedbackReport } = require('../utils/reportController');

router.post('/generate-report', generateFeedbackReport);

module.exports = router;
