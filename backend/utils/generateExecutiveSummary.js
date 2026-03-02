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
1. Use ONLY the data explicitly provided in this prompt:
   - The feedback descriptions
   - The sentiment statistics
   - The department list
   - The figures listed
   - The computed totals and percentages

2. DO NOT:
   - Invent trends
   - Assume historical comparisons unless explicitly provided
   - Fabricate percentages
   - Estimate counts unless they are directly computable from the provided data
   - Create fictional departments, staff, timeframes, or operational details
   - Refer to figures that are not listed
   - Reference data not present in this prompt

3. If something is not explicitly present in the data:
   - State: "The available feedback does not provide sufficient evidence to determine this."
   - Do NOT speculate.
   - Do NOT generalize beyond the provided comments.

4. Every major claim must be traceable to:
   - A specific percentage provided above, OR
   - A clearly observable recurring pattern in the feedback descriptions, OR
   - A listed figure number.

5. If a section (e.g., Strengths, Opportunities, Stakeholder differences) lacks sufficient supporting evidence in the feedback, explicitly state that evidence is limited instead of inventing content.

6. Never fabricate:
   - Exact wait times
   - Equipment types
   - Process failures
   - Staff behavior patterns
   - Quantities such as “15+ reports” unless directly counted from the given descriptions

7. Do not introduce any external healthcare standards, benchmarks, or assumed best practices unless explicitly mentioned in the provided feedback.

8. Do not perform hypothetical historical trend analysis unless historical comparison data is explicitly provided in this prompt.

9. If feedback volume is insufficient to support 5-8 problem areas or 3-6 strengths, reduce the number accordingly rather than fabricating additional items.

10. Accuracy is more important than completeness. If evidence is limited, acknowledge limitations clearly.

REQUIRED STRUCTURE:

I. EXECUTIVE OVERVIEW
Write 4-6 comprehensive paragraphs addressing:

A. Critical Findings Summary
- What are the 3-5 most critical findings from this feedback?
- Prioritize findings by severity and frequency
- Reference specific figures and quantify the impact

B. Overall Satisfaction Trajectory
- Is overall satisfaction improving, stable, or declining?
- What trends appear when comparing to historical patterns?
- Reference sentiment distribution (Figure 3) and volume trends (Figure 1)
- Cite specific percentage changes if evident

C. Dominant Themes
- What 2-3 themes dominate the feedback period?
- How do these themes interconnect across departments?
- Which departments are most affected?
- Include direct paraphrases from multiple feedback items

D. Stakeholder Impact
- How are different stakeholder groups (patients, visitors, staff) experiencing the hospital?
- Are there differences in concerns between internal and external feedback?
- Reference source distribution (Figure 4)

Example format:
"Analysis of ${total} feedback items reveals three critical systemic issues requiring immediate attention. First, patients across multiple departments repeatedly describe extended wait times, with Emergency Department patients specifically stating they waited between 90 minutes and 4 hours for initial assessment. Second, equipment reliability concerns appear in approximately ${Math.round(total * 0.15)} feedback items, concentrated primarily in the Operating Room and ICU. Third, communication gaps between clinical staff and patients create recurring frustration, particularly during handoffs and discharge processes. As shown in Figure 2, these issues concentrate in five departments accounting for the majority of total feedback volume.

The overall satisfaction trajectory shows concerning decline, with negative sentiment comprising ${negPct}% of all feedback. Figure 3's sentiment distribution confirms this trend, revealing a significant imbalance between positive and negative experiences. Positive feedback, representing only ${posPct}% of total responses, concentrates primarily in specific departments where patients consistently praise staff professionalism and service efficiency..."

II. CRITICAL PROBLEM AREAS
Identify 5-8 MAJOR problems with comprehensive sub-analysis. For each:

Structure each problem as:
• [Problem Title - Department Focus]
  Overview: [2-3 sentence description of the core issue]
  
  Impact & Frequency: [Specific data on how many reports, which departments, severity level]
  
  Patient/Staff Voice: [2-3 paraphrased examples from actual feedback showing the problem]
  
  Root Cause Indicators: [What the feedback suggests about underlying causes]
  
  Data Support: [Reference specific figures and percentages]

Example:
• Emergency Department Wait Times - Critical Access Issue
  Overview: Patients consistently report excessive and unexplained wait times in the Emergency Department, particularly during evening and weekend hours. The issue affects both critical and non-critical cases, with patients describing waits ranging from 2 to 6 hours before initial physician contact.
  
  Impact & Frequency: This concern appears in numerous feedback items, making it one of the most frequently mentioned problems. The issue affects the ED primarily but also impacts other services due to downstream scheduling conflicts.
  
  Patient/Staff Voice: Patients describe arriving with urgent symptoms but experiencing extended waiting periods with minimal updates. Others report significant discrepancies between estimated and actual wait times. Staff feedback corroborates this, noting capacity challenges during peak hours and lack of clear communication protocols.
  
  Root Cause Indicators: The feedback points to contributing factors including staffing levels during peak hours, absence of patient communication protocols, and inefficient triage processes. Several staff reports mention equipment delays and handoff challenges as exacerbating factors.
  
  Data Support: Figure 2 shows the department receives substantial feedback volume. Figure 8 reveals predominantly negative sentiment in this area. Figure 12 indicates a high proportion of urgent-flagged feedback originates from this department.

III. OPERATIONAL EXCELLENCE OPPORTUNITIES
Identify 3-5 significant operational challenges requiring attention:

Structure each as:
• [Opportunity Title]
  Current State: [What feedback reveals about current operations]
  
  Stakeholder Impact: [Who is affected and how]
  
  Improvement Potential: [What could be achieved by addressing this]
  
  Evidence: [Specific feedback examples and figure references]

Example:
• Equipment Reliability and Maintenance Systems
  Current State: Staff across multiple clinical areas report recurring equipment failures and maintenance delays. Issues range from minor inconveniences to critical safety concerns. Maintenance requests reportedly take extended periods to address, even for critical equipment.
  
  Stakeholder Impact: Clinical staff experience workflow disruptions and increased stress when essential equipment fails. Patients face delayed procedures and extended stay times. Critical departments have experienced service interruptions due to equipment unavailability.
  
  Improvement Potential: Implementing predictive maintenance schedules and rapid-response protocols for critical equipment could significantly reduce downtime. This would improve staff satisfaction, enhance patient safety, and prevent service interruptions.
  
  Evidence: Equipment concerns appear across multiple departments in the feedback. Staff mention specific instances of equipment failures affecting patient care. Figure data shows equipment-related complaints constitute a notable portion of internal feedback.

IV. STRENGTHS AND POSITIVE PERFORMANCE
Identify 3-6 areas of excellence (if evidence exists):

Structure each as:
• [Strength Title - Department/Team]
  Performance Summary: [What the data shows]
  
  Stakeholder Feedback: [Specific positive comments paraphrased]
  
  Success Factors: [What appears to be working well]
  
  Replication Opportunity: [How this could be scaled to other areas]
  
  Evidence: [Figure references and data points]

Example:
• Radiology Excellence - Patient-Centered Service Model
  Performance Summary: Radiology consistently receives highly positive feedback, with strong positive sentiment and above-average ratings. Patients praise both technical competence and interpersonal care.
  
  Stakeholder Feedback: Patients repeatedly describe staff as professional and caring, noting clear explanations and comfortable experiences. Others mention efficient scheduling and minimal wait times. Even patients with concerns elsewhere specifically exclude this department from criticism.
  
  Success Factors: The feedback indicates effective appointment scheduling, strong patient communication training, and consistent quality standards. The department demonstrates strong leadership and team cohesion.
  
  Replication Opportunity: This service model—particularly patient communication protocols and scheduling efficiency—should be studied and adapted for high-volume departments. The approach to setting and managing patient expectations could serve as a hospital-wide template.
  
  Evidence: Figure 13 shows strong average ratings. Figure 8 confirms predominantly positive sentiment. The majority of feedback items contain positive comments focused on service quality rather than facilities.

If fewer than 3 strong positives exist, include this note:
"Limited positive themes emerged during this period. While individual staff members receive occasional praise, no department demonstrated consistently strong positive performance across multiple feedback items. This absence of positive feedback is significant and suggests systemic issues requiring comprehensive intervention."

V. STRATEGIC RECOMMENDATIONS
Provide 6-10 specific, prioritized, actionable recommendations:

Structure each as:
• [Recommendation Title] - Priority: [High/Medium]
  Action Required: [Specific steps to take]
  
  Responsible Party: [Which department/role should own this]
  
  Expected Outcomes: [What success looks like]
  
  Evidence Base: [Which problems/figures support this recommendation]
  
  Timeline: [Suggested implementation timeframe]
  
  Resource Implications: [What resources are needed]

Example:
• Implement Comprehensive Patient Flow Redesign - Priority: HIGH
  Action Required: Establish a multidisciplinary task force to redesign patient flow systems, including: (1) real-time capacity monitoring, (2) revised triage protocols, (3) dedicated patient communication role during peak hours, (4) fast-track system for appropriate cases, and (5) improved handoff procedures.
  
  Responsible Party: Department Medical Director and Nursing Director, with support from IT (for monitoring system), Hospital Administration (for staffing), and Quality Assurance (for protocol development and monitoring).
  
  Expected Outcomes: Reduce average wait times significantly within 6 months. Decrease patient complaints related to access. Improve staff satisfaction scores. Increase patient satisfaction ratings to target levels. Reduce patients who leave without being seen.
  
  Evidence Base: Wait time concerns dominate feedback. Figure 2 shows high feedback volume in affected areas. Figure 8 reveals predominantly negative sentiment. Figure 12 shows substantial urgent-flagged feedback. Multiple patient reports describe extended waits and lack of communication.
  
  Timeline: Task force formation: 2 weeks. Assessment phase: 4 weeks. Pilot program: 8-12 weeks. Full implementation: 6 months. Ongoing monitoring: continuous.
  
  Resource Implications: Requires: (1) IT investment in monitoring systems, (2) additional staff for patient communication role during peak hours, (3) staff time for task force participation, (4) potential external consultation for best practices review.

FORMATTING REQUIREMENTS:
- Use the exact section headers above (I., II., III., IV., V.)
- Use bullet points (•) for major items in sections II-V
- Use sub-bullets or paragraphs for detailed analysis within each bullet
- No markdown formatting (no **, no ##, no ---)
- Reference figures by number: "Figure 1", "Figure 2", etc.
- Write in active voice
- Use present tense for current issues
- Be specific with numbers, percentages, and timeframes
- Each major section should be substantial and comprehensive

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
            content: "You are an expert hospital quality assurance director writing comprehensive executive summaries. Output only the requested summary text with no additional commentary. Write detailed, evidence-based analyses." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000, // Increased for longer output
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
    
    // Provide a fallback summary
    return `EXECUTIVE SUMMARY

I. EXECUTIVE OVERVIEW
Analysis of ${total} feedback items reveals significant opportunities for service improvement across multiple departments. Due to a technical issue with the AI analysis service, this summary is auto-generated and should be supplemented with manual review of the Supporting Charts & Analysis section below.

The sentiment distribution shows ${negPct}% negative, ${neuPct}% neutral, and ${posPct}% positive responses during the ${filterSummary.dateRange || 'analysis period'}. This data, combined with the detailed charts provided, offers critical insights into patient and staff experiences.

II. CRITICAL PROBLEM AREAS
• Manual Review Recommended
  Overview: Due to the AI service interruption, leadership should examine Figure 1 and subsequent charts to identify the primary areas of concern in the feedback data.
  
  Impact & Frequency: Please analyze the departmental breakdown in Figure 2 and sentiment distribution in Figure 3 to understand the scope and severity of issues.
  
  Data Support: All figures provided below contain essential data for understanding current challenges.

III. OPERATIONAL EXCELLENCE OPPORTUNITIES
• Data Analysis Required
  Current State: The detailed charts and statistics sections provide comprehensive data on operational performance across departments.
  
  Evidence: Review Figures 8-12 for department-specific performance metrics and trend analysis.

IV. STRENGTHS AND POSITIVE PERFORMANCE
${positive > 0 ? `• Positive Feedback Present\n  Performance Summary: ${posPct}% of responses were positive. Review the sentiment distribution charts and department-specific data for details on areas of strength.` : '• Limited positive feedback could be automatically identified. Manual review recommended.'}

V. STRATEGIC RECOMMENDATIONS
• Re-generate Report - Priority: HIGH
  Action Required: Attempt to regenerate this report when the AI service is restored for comprehensive strategic analysis.
  
  Responsible Party: Quality Assurance Department
  
  Timeline: As soon as service is available

• Conduct Manual Analysis - Priority: HIGH
  Action Required: Leadership should manually review the detailed charts and feedback descriptions to formulate specific action items based on the ${total} feedback items analyzed.
  
  Responsible Party: Department Directors and QA Team
  
  Timeline: Within 1 week`;
  }
}

/**
 * Generate interpretations for each chart sequentially
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