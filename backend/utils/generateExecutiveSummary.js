const axios = require('axios');
require('dotenv').config();

// Note: If using Ollama locally, ensure it is routed through the OpenAI compatibility endpoint (/v1/chat/completions)
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

  // Extract and randomize feedback descriptions to prevent chronological or departmental bias
  const validDescriptions = filteredFeedback
    .map(f => f.description || '')
    .filter(desc => desc.trim().length > 0);

  // Simple Fisher-Yates shuffle for true randomization of the sample
  for (let i = validDescriptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validDescriptions[i], validDescriptions[j]] = [validDescriptions[j], validDescriptions[i]];
  }

  // Slice after shuffling
  const descriptions = validDescriptions.slice(0, 300);

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

  // Enhanced prompt for comprehensive executive summary
  const prompt = `
You are a senior hospital Quality Assurance director writing a comprehensive Executive Summary for hospital leadership. This summary will be embedded in a professionally formatted PDF report and must provide deep, actionable insights.

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

CRITICAL INSTRUCTIONS - STRICT EVIDENCE MODE:

You are operating in STRICT EVIDENCE MODE.

NON-NEGOTIABLE RULES:
1. Use ONLY the data explicitly provided in this prompt.
2. DO NOT invent trends, assume historical comparisons, fabricate percentages, or estimate counts unless they are directly computable from the provided data.
3. If something is not explicitly present in the data, state: "The available feedback does not provide sufficient evidence to determine this."
4. Every major claim must be traceable to a specific percentage, observable recurring pattern, or listed figure number.
5. If a section lacks sufficient supporting evidence, explicitly state that evidence is limited instead of inventing content.
6. Never fabricate exact wait times, equipment types, process failures, or staff behavior patterns.
7. Do not introduce any external healthcare standards, benchmarks, or assumed best practices.
8. Accuracy is more important than completeness.
9. If feedback volume is genuinely insufficient to support the requested number of items, reduce the number accordingly rather than fabricating.
10. DIVERSIFICATION: Where the data supports it, spread analysis across at least 4-6 departments. If fewer departments have sufficient evidence, explicitly state that evidence is concentrated in a smaller number of departments instead of forcing weak claims.
11. DEPTH & LENGTH: Write in-depth, multi-sentence paragraphs for every subsection (Overview, Impact, Voice, etc.) rather than brief single sentences. Expand on the context, implications, and specifics.

REQUIRED STRUCTURE:

I. EXECUTIVE OVERVIEW
Write 4-6 comprehensive, detailed paragraphs addressing:
A. Critical Findings Summary (Prioritize findings, reference specific figures and quantify the impact)
B. Overall Satisfaction Profile (What is the current state of overall satisfaction? Reference sentiment distribution and volume trends. Cite specific percentages without assuming historical movement unless explicitly provided in the data.)
C. Dominant Themes (How themes interconnect across MULTIPLE departments)
D. Stakeholder Impact (Differences in concerns between internal and external feedback)

II. CRITICAL PROBLEM AREAS
Identify 3-5 MAJOR problems covering MULTIPLE DIFFERENT departments. Write detailed, multi-sentence paragraphs for each subsection:

Structure each problem as:
• [Problem Title - Department Focus]
  Overview: [Provide a detailed, 3-5 sentence description of the core issue, context, and immediate consequences.]
  
  Impact & Frequency: [Provide specific data on how many reports mention this, which departments are affected, and the severity level. Explain the ripple effect on hospital operations.]
  
  Patient/Staff Voice: [Provide 3-4 paraphrased examples from actual feedback showing the problem in detail.]
  
  Root Cause Indicators: [Analyze what the feedback suggests about underlying systemic causes in depth.]
  
  Data Support: [Reference specific figures and percentages and explain how they prove this problem.]

III. OPERATIONAL EXCELLENCE OPPORTUNITIES
Identify 2-4 significant operational challenges spanning MULTIPLE departments. Write detailed, multi-sentence paragraphs:

Structure each as:
• [Opportunity Title]
  Current State: [Provide an in-depth explanation of what feedback reveals about current operations and workflows.]
  
  Stakeholder Impact: [Explain in detail who is affected (staff vs patients) and exactly how it impacts their day-to-day experience.]
  
  Improvement Potential: [Explain deeply what could be achieved by addressing this, including long-term benefits.]
  
  Evidence: [Reference specific feedback examples and figure data.]

IV. STRENGTHS AND POSITIVE PERFORMANCE
*CRITICAL: THIS SECTION IS MANDATORY. DO NOT SKIP THIS HEADER.*
Identify 2-4 areas of excellence highlighting DIFFERENT departments. Write detailed, multi-sentence paragraphs:

If you found positive feedback, structure each as:
• [Strength Title - Department/Team]
  Performance Summary: [Provide a detailed, 3-5 sentence explanation of what the positive data shows for this specific department.]
  
  Stakeholder Feedback: [Provide multiple specific positive comments paraphrased in detail.]
  
  Success Factors: [Analyze deeply what workflows, attitudes, or processes appear to be working exceptionally well here.]
  
  Replication Opportunity: [Explain specifically how this department's success could be scaled to struggling areas of the hospital.]
  
  Evidence: [Cite specific figures, star ratings, and data points that prove this strength.]

If there is little to no positive feedback, you MUST include the "IV. STRENGTHS AND POSITIVE PERFORMANCE" header and output ONLY this exact structure underneath it:
• [No Distinct Strengths Identified - Hospital Wide]
  Performance Summary: Limited positive themes emerged during this period. While individual staff members receive occasional praise, no department demonstrated consistently strong positive performance across multiple feedback items. This absence of positive feedback is significant and suggests systemic issues requiring comprehensive intervention.

V. STRATEGIC RECOMMENDATIONS
Provide 6-10 specific, prioritized, actionable recommendations targeting MULTIPLE departments:

Structure each as:
• [Recommendation Title] - Priority: [High/Medium]
  Action Required: [Provide a highly detailed, multi-step explanation of the specific actions to take.]
  
  Responsible Party: [List specific departments/roles that should own this.]
  
  Expected Outcomes: [Detail the exact metrics, workflows, or satisfaction scores that will improve.]
  
  Evidence Base: [Tie this deeply back to the specific problems and figures mentioned earlier in the report.]
  
  Timeline: [Suggested multi-phase implementation timeframe.]
  
  Resource Implications: [Detail the specific staffing, IT, or financial resources needed.]

FORMATTING REQUIREMENTS:
- Use the exact section headers above (I., II., III., IV., V.)
- Use bullet points (•) for major items in sections II-V
- Use sub-bullets or paragraphs for detailed analysis within each bullet
- No markdown formatting (no **, no ##, no ---)
- Reference figures by number: "Figure 1", "Figure 2", etc.
- Write in active voice
- OUTPUT ONLY THE EXECUTIVE SUMMARY TEXT. No preamble.
`.trim();

  try {
    const response = await axios.post(
      API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are an expert hospital quality assurance director writing comprehensive executive summaries. Output only the requested summary text with no additional commentary. Write detailed, multi-sentence, evidence-based analyses covering multiple departments." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 5000,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 90000 // 90 second timeout for longer generation
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
    
    // Provide a fallback summary (now properly aligned with the PDF parser's requirements)
    return `EXECUTIVE SUMMARY

I. EXECUTIVE OVERVIEW
Analysis of ${total} feedback items reveals significant opportunities for service improvement across multiple departments. Due to a technical issue with the AI analysis service, this summary is auto-generated and should be supplemented with manual review of the Supporting Charts & Analysis section below.

The sentiment distribution shows ${negPct}% negative, ${neuPct}% neutral, and ${posPct}% positive responses during the ${filterSummary.dateRange || 'analysis period'}. This data, combined with the detailed charts provided, offers critical insights into patient and staff experiences.

II. CRITICAL PROBLEM AREAS
• [Manual Review Recommended - Hospital Wide]
  Overview: Due to the AI service interruption, leadership should examine Figure 1 and subsequent charts to identify the primary areas of concern in the feedback data.
  
  Impact & Frequency: Please analyze the departmental breakdown in Figure 2 and sentiment distribution in Figure 3 to understand the scope and severity of issues.
  
  Patient/Staff Voice: Specific voice references are unavailable in this auto-generated fallback.
  
  Root Cause Indicators: Root causes must be determined via manual review of the attached charts.
  
  Data Support: All figures provided below contain essential data for understanding current challenges.

III. OPERATIONAL EXCELLENCE OPPORTUNITIES
• [Data Analysis Required - Hospital Wide]
  Current State: The detailed charts and statistics sections provide comprehensive data on operational performance across departments.
  
  Stakeholder Impact: Impact must be assessed manually.
  
  Improvement Potential: Reviewing the charts will highlight areas for significant operational improvement.
  
  Evidence: Review Figures 8-12 for department-specific performance metrics and trend analysis.

IV. STRENGTHS AND POSITIVE PERFORMANCE
${positive > 0 ? `• [Positive Feedback Present - Various Departments]\n  Performance Summary: ${posPct}% of responses were positive. Review the sentiment distribution charts and department-specific data for details on areas of strength.\n  \n  Stakeholder Feedback: Positive themes are present but require manual review.\n  \n  Success Factors: To be determined via manual analysis.\n  \n  Replication Opportunity: To be determined via manual analysis.\n  \n  Evidence: Figure 3 and departmental charts.` : '• [No Distinct Strengths Identified - Hospital Wide]\n  Performance Summary: Limited positive themes emerged during this period. While individual staff members receive occasional praise, no department demonstrated consistently strong positive performance across multiple feedback items. This absence of positive feedback is significant and suggests systemic issues requiring comprehensive intervention.'}

V. STRATEGIC RECOMMENDATIONS
• [Re-generate Report] - Priority: HIGH
  Action Required: Attempt to regenerate this report when the AI service is restored for comprehensive strategic analysis.
  
  Responsible Party: Quality Assurance Department
  
  Expected Outcomes: A fully realized, data-driven executive summary.
  
  Evidence Base: AI service interruption.
  
  Timeline: As soon as service is available.
  
  Resource Implications: Minimal.

• [Conduct Manual Analysis] - Priority: HIGH
  Action Required: Leadership should manually review the detailed charts and feedback descriptions to formulate specific action items based on the ${total} feedback items analyzed.
  
  Responsible Party: Department Directors and QA Team
  
  Expected Outcomes: Actionable insights derived manually from the attached data.
  
  Evidence Base: The comprehensive chart suite provided below.
  
  Timeline: Within 1 week.
  
  Resource Implications: Requires dedicated administrative time.`;
  }
}

/**
 * Generate interpretations for all charts in parallel
 */
async function generateChartInterpretations(chartList) {
  // Map over the charts and create an array of promises
  const interpretationPromises = chartList.map(async (chart) => {
    if (!chart.dataSummary) {
      return "No data available to interpret.";
    }

    const prompt = `
      You are a Quality Assurance analyst for a hospital.
      Analyze the following data for a chart titled "${chart.title}".
      Description: ${chart.description}
      Data: ${chart.dataSummary}

      Write a concise, 1-2 paragraph professional interpretation of what this data means. Point out the most significant finding. Do not mention "The chart shows" or "Based on the data". Get straight to the insights.
    `;

    try {
      const response = await axios.post(
        API_URL,
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 300,
        },
        { 
          headers: { Authorization: `Bearer ${API_KEY}` },
          timeout: 30000 // 30-second timeout per chart
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error interpreting chart ${chart.title}:`, error.message);
      return "Data interpretation unavailable due to service error.";
    }
  });

  // Wait for all charts to be interpreted simultaneously
  return Promise.all(interpretationPromises);
}

module.exports = { generateExecutiveSummary, generateChartInterpretations };