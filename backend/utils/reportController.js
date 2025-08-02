const axios = require('axios');
require('dotenv').config();

async function generateFeedbackReport(req, res) {
  try {
    const { description, sentiment, variant, ratings, impact_severity, feedback_type, department } = req.body;

    if (!description || !sentiment) {
      return res.status(400).json({ error: 'Missing description or sentiment' });
    }

    let prompt = '';
    let additionalInfo = '';

    if (ratings) {
      additionalInfo += `Ratings: "${ratings}"\n`;
    }
    if (impact_severity !== null && impact_severity !== undefined) {
      additionalInfo += `Impact Severity: "${impact_severity}"\n`;
    }
    if (feedback_type) {
      additionalInfo += `Feedback Type: "${feedback_type}"\n`;
    }
    if (department) {
      additionalInfo += `Department: "${department}"\n`;
    }

    if (variant === 'retry') {
      prompt = `
You are a QA analyst writing a second perspective report on the hospital feedback below.

Feedback Description (SUPER HIGHLY WEIGHTED): "${description}"
Sentiment (HIGHLY WEIGHTED): "${sentiment}"
${additionalInfo ? additionalInfo.trim() + '\n' : ''}
If any of the above values are "null" or have no value, disregard them and focus mainly on the present values.

If the feedback does not require any solution or further action (e.g., it is a compliment, general praise, minor suggestion without impact), reply with exactly:

this feed back requires no further actions (explain why)

Otherwise, offer fresh insights, alternative phrasing, or additional considerations where applicable.

Respond only in English.

Summary: /new line
Root Cause: /new line
Recommendations: /new line
      `.trim();
    } else {
      prompt = `
You are a QA analyst generating a feedback report for a hospital.

Feedback Description (SUPER HIGHLY WEIGHTED): "${description}"
Sentiment (HIGHLY WEIGHTED): "${sentiment}"
${additionalInfo ? additionalInfo.trim() + '\n' : ''}
If any of the above values are "null" or have no value, disregard them and focus mainly on the present values.

Respond only in English.

If the feedback does not require any action, solution, or resolution (e.g., compliments, praise, general appreciation, minor observations with no impact), reply with exactly:

this feed back requires no further actions (explain why)

Otherwise, respond in this exact structure — no titles, no headers:

Summary: /new line
[one short paragraph]

Root Cause: /new line
[explanation why the issue happened]

Recommendations: /new line
[actionable suggestions, numbering]

Do not include any intro, title, explanation, or formatting above or below these 3 sections.
      `.trim();
    }

    const apiUrl = process.env.OLLAMA_API_URL;
    const apiKey = process.env.GROQ_API_KEY;

    console.log('📤 Sending prompt to Groq...');
    const response = await axios.post(
      apiUrl,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a QA analyst generating hospital feedback reports. Respond in English with the structure: Summary, Root Cause, Recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        top_p: 0.9
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const report = response.data.choices[0].message.content.trim();
    if (!report) throw new Error('Empty response from model');

    console.log('✅ Report successfully generated.');
    res.status(200).json({ message: 'Report generated successfully', report });
  } catch (err) {
    console.error('❌ Error generating report:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

module.exports = { generateFeedbackReport };
