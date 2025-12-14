// backend/routes/report.js
const express = require('express');
const router = express.Router();
const { generateExecutiveSummary } = require('../utils/generateExecutiveSummary');

/**
 * POST /api/report/summary
 * Generate executive summary from filtered feedback
 */
router.post('/summary', async (req, res) => {
  try {
    const { filteredFeedback, filterSummary, chartList } = req.body;

    // Validate required parameters
    if (!Array.isArray(filteredFeedback)) {
      return res.status(400).json({ 
        error: 'Invalid request: filteredFeedback must be an array' 
      });
    }

    if (filteredFeedback.length === 0) {
      return res.status(400).json({ 
        error: 'No feedback data provided',
        summary: 'No feedback available for the selected filters.' 
      });
    }

    if (!filterSummary || typeof filterSummary !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid request: filterSummary object is required' 
      });
    }

    console.log(`Generating summary for ${filteredFeedback.length} feedback items`);

    // Generate the summary
    const summary = await generateExecutiveSummary({
      filteredFeedback,
      filterSummary,
      chartList: Array.isArray(chartList) ? chartList : []
    });

    // Log successful generation
    console.log(`Summary generated successfully (${summary.length} characters)`);

    res.json({ 
      summary,
      metadata: {
        feedbackCount: filteredFeedback.length,
        chartCount: chartList?.length || 0,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Provide detailed error response
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message,
      // Provide fallback summary
      summary: 'Unable to generate AI-powered summary due to a service error. Please review the charts and data manually.'
    });
  }
});

/**
 * GET /api/report/health
 * Health check endpoint for report service
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'report-generation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;