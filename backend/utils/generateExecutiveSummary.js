// backend/utils/generateExecutiveSummary.js
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.GROQ_API_URL || process.env.OLLAMA_API_URL;
const API_KEY = process.env.GROQ_API_KEY;

/**
 * Generate executive summary using AI
 */
async function generateExecutiveSummary({ filteredFeedback, filterSummary, chartList }) {
  const total = filteredFeedback.length;
  
  if (total === 0) {
    return "No feedback available for the selected filters.";
  }

  // Extract feedback descriptions (increased sample for better analysis)
  const descriptions = filteredFeedback
    .map(f => f.description || '')
    .filter(desc => desc.trim().length > 0)
    .slice(0, 300);

  // Calculate sentiment statistics
  const positive = filteredFeedback.filter(f => f.sentiment === 'positive').length;
  const negative = filteredFeedback.filter(f => f.sentiment === 'negative').length;
  const neutral = filteredFeedback.filter(f => f.sentiment === 'neutral').length;

  const posPct = ((positive / total) * 100).toFixed(1);
  const negPct = ((negative / total) * 100).toFixed(1);
  const neuPct = ((neutral / total) * 100).toFixed(1);

  // Determine source type
  const sourceType = filteredFeedback.length > 0
    ? filteredFeedback[0].source === 'staff' 
      ? 'Internal (Staff)' 
      : 'External (Patient/Visitor/Family)'
    : filterSummary.source || 'Mixed';

  const filtersText = filterSummary.filtersText || 'None';

  // Format available charts
  const chartListStr = chartList.length > 0
    ? chartList.map((c, i) => `Figure ${i + 1}: ${c.title}`).join('\n')
    : 'No charts available';

  // Extract department information
  const departments = [...new Set(filteredFeedback.map(f => f.department).filter(Boolean))];
  const departmentStr = departments.length > 0 
    ? departments.slice(0, 5).join(', ') + (departments.length > 5 ? ', and others' : '')
    : 'Multiple departments';

  // Enhanced prompt for better executive summary
  const prompt = `
You are a senior hospital Quality Assurance director writing an Executive Summary for hospital leadership. This summary will be embedded in a professionally formatted PDF report.

CONTEXT:
- Total feedback analyzed: ${total}
- Period: ${filterSummary.dateRange || 'All Time'}
- Source: ${sourceType}
- Applied filters: ${filtersText}
- Departments: ${departmentStr}
- Sentiment distribution: ${posPct}% Positive, ${neuPct}% Neutral, ${negPct}% Negative

AVAILABLE FIGURES (reference these in your analysis):
${chartListStr}

FEEDBACK DESCRIPTIONS (actual patient/staff comments):
"""
${descriptions.join('\n\n')}
"""

CRITICAL INSTRUCTIONS:
1. Base ALL claims on the actual feedback descriptions above
2. Use direct, evidence-based language only
3. NEVER use vague words: "suggests", "indicates", "may", "possibly", "appears"
4. DO use strong phrases: "Patients repeatedly report", "Staff consistently state", "As shown in Figure X"
5. Reference specific Figure numbers when discussing trends
6. Identify ONLY the most frequent and impactful themes
7. Be specific about departments, processes, and timing when mentioned in feedback
8. If feedback mentions specific staff names or individuals, anonymize them
9. Quantify claims when possible (e.g., "mentioned in 15+ feedback items")

REQUIRED STRUCTURE:

I. KEY TAKEAWAY & OVERALL SITUATION
Write 2-3 paragraphs addressing:
- What is the single most critical finding from this feedback?
- Is overall satisfaction improving, stable, or declining?
- What theme dominates the feedback period?
- Reference at least 2 figures by number
- Include direct paraphrases from feedback (NOT verbatim quotes)

Example format:
"Patients repeatedly describe extended wait times in the Emergency Department, with many stating they waited over 3 hours before being seen. This aligns with the volume spike shown in Figure 1. The issue appears most severe during evening hours, as confirmed by Figure 3's temporal analysis."

II. TOP PROBLEM AREAS
Identify 2-3 MAJOR problems only. For each:
- Clear problem title
- Specific description of what patients/staff report
- Which departments are affected
- How frequently it appears
- Which figure supports this finding
- Real paraphrases from feedback

Format as bullet points. Each bullet should be 3-5 sentences.

Example:
• Emergency Department Wait Times: Patients consistently report excessive wait times, particularly during evening shifts (6 PM - midnight). Multiple feedback items describe waits exceeding 4 hours for non-critical cases. This issue appears concentrated in the ED, though some spillover affects Radiology scheduling. Figure 2 confirms the ED receives the highest volume of negative feedback, with 42% mentioning delays.

III. SUCCESSES & POSITIVE HIGHLIGHTS
Identify 1-2 strong positive themes ONLY if they appear in multiple feedback items.
Use the same detailed format as Problem Areas.

If no strong positives exist in the data, write:
"No consistently strong positive themes emerged from the feedback during this period. Leadership should prioritize addressing the critical issues outlined above."

IV. RECOMMENDED ACTIONS
Provide 2-4 specific, actionable recommendations. Each must:
- Be concrete and implementable
- Specify who should own it (department/role)
- Reference the evidence (feedback theme + figure)
- Focus on the most critical issues only

Format as bullet points. Each bullet should be 2-4 sentences.

Example:
• Implement ED Triage Protocol Review: The Emergency Department director should conduct an immediate review of patient triage and flow protocols, particularly for evening shifts. Analysis shows 60% of complaints mention wait times during this period (Figure 2), and patients consistently describe confusion about wait time expectations. Consider adding a patient communication role during peak hours to manage expectations and provide updates.

FORMATTING REQUIREMENTS:
- Use the exact section headers above (I., II., III., IV.)
- Use bullet points (•) for lists in sections II, III, IV
- Keep paragraphs focused and concise
- No markdown formatting (no **, no ##, no ---)
- Reference figures by number: "Figure 1", "Figure 2", etc.
- Write in active voice
- Use present tense for current issues

OUTPUT ONLY THE EXECUTIVE SUMMARY TEXT. No preamble, no meta-commentary, no explanations of what you're doing.
`.trim();

  try {
    const response = await axios.post(
      API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are an expert hospital quality assurance director writing executive summaries. Output only the requested summary text with no additional commentary." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000 // 60 second timeout
      }
    );

    const summary = response.data.choices[0].message.content.trim();
    
    // Clean up any markdown formatting that might have slipped through
    const cleanedSummary = summary
      .replace(/\*\*/g, '')  // Remove bold markers
      .replace(/##\s/g, '')  // Remove header markers
      .replace(/---+/g, ''); // Remove separator lines
    
    return cleanedSummary;

  } catch (error) {
    console.error("AI summary generation error:", error.response?.data || error.message);
    
    // Provide a fallback summary
    return `EXECUTIVE SUMMARY

I. KEY TAKEAWAY & OVERALL SITUATION
Analysis of ${total} feedback items reveals a mixed satisfaction landscape. The feedback includes ${positive} positive, ${neutral} neutral, and ${negative} negative responses. Due to a technical issue with the AI analysis service, this summary is auto-generated and should be supplemented with manual review of the Supporting Charts & Analysis section below.

II. TOP PROBLEM AREAS
• Manual review recommended: Please examine Figure 1 and subsequent charts to identify the primary areas of concern in the feedback data.

III. SUCCESSES & POSITIVE HIGHLIGHTS
${positive > 0 ? `• Positive feedback: ${posPct}% of responses were positive. Review the sentiment distribution charts for details on areas of strength.` : 'No strong positive themes could be automatically identified.'}

IV. RECOMMENDED ACTIONS
• Conduct manual review: Given the AI service interruption, leadership should manually review the detailed charts and feedback descriptions to formulate specific action items.
• Re-generate report: Attempt to regenerate this report when the AI service is restored for a more detailed analysis.`;
  }
}

module.exports = { generateExecutiveSummary };