// @sections/QADashboard/AnalyticsSection.jsx
import { useState, useEffect, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';

const AnalyticsSection = ({ styles, feedbackData = [] }) => {
  // Start EXPANDED (false) so charts are available for PDF generation
  // Users expect to see analytics when viewing the dashboard
  const [isCollapsed, setIsCollapsed] = useState(false);

  const safeFeedbackData = useMemo(() => Array.isArray(feedbackData) ? feedbackData : [], [feedbackData]);

  const now = useMemo(() => new Date('2025-12-14'), []); // Fixed to current date for consistency

  // ──────────────────────────────────────────────────────────────
  // 1. Feedback Volume Over Time (Fixed: No date mutation)
  // ──────────────────────────────────────────────────────────────
  const feedbackVolumeData = useMemo(() => {
    const todayStr = now.toDateString();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    const quarterAgo = new Date(now);
    quarterAgo.setMonth(now.getMonth() - 3);

    return {
      labels: ['Today', 'Week', 'Month', 'Quarter'],
      datasets: [{
        label: 'Feedback Volume',
        data: [
          safeFeedbackData.filter(f => new Date(f.date).toDateString() === todayStr).length,
          safeFeedbackData.filter(f => new Date(f.date) >= weekAgo).length,
          safeFeedbackData.filter(f => new Date(f.date) >= monthAgo).length,
          safeFeedbackData.filter(f => new Date(f.date) >= quarterAgo).length,
        ],
        backgroundColor: 'rgba(26, 115, 232, 0.6)',
      }],
    };
  }, [safeFeedbackData, now]);

  // ──────────────────────────────────────────────────────────────
  // 2. Overall Sentiment + Source (Pie Charts)
  // ──────────────────────────────────────────────────────────────
  const sentimentData = useMemo(() => ({
    labels: ['Positive', 'Neutral', 'Negative', 'Pending'],
    datasets: [{
      data: [
        safeFeedbackData.filter(f => f.sentiment === 'positive').length,
        safeFeedbackData.filter(f => f.sentiment === 'neutral').length,
        safeFeedbackData.filter(f => f.sentiment === 'negative').length,
        safeFeedbackData.filter(f => !f.sentiment && f.sentiment_status === 'pending').length,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#1a73e8'],
    }],
  }), [safeFeedbackData]);

  const sourceData = useMemo(() => ({
    labels: ['Staff', 'Patient', 'Visitor/Family'],
    datasets: [{
      data: [
        safeFeedbackData.filter(f => f.source === 'staff').length,
        safeFeedbackData.filter(f => f.source === 'patient').length,
        safeFeedbackData.filter(f => f.source === 'visitor' || f.source === 'family').length,
      ],
      backgroundColor: ['#00b7eb', '#ff6b6b', '#4caf50'],
    }],
  }), [safeFeedbackData]);

  // ──────────────────────────────────────────────────────────────
  // 3. Internal & External Feedback Type Distribution (Global Pies)
  // ──────────────────────────────────────────────────────────────
  const internalFeedback = useMemo(() => safeFeedbackData.filter(f => f.source === 'staff'), [safeFeedbackData]);
  const internalTypeCounts = useMemo(() => internalFeedback.reduce((acc, f) => {
    const type = f.feedbackType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}), [internalFeedback]);

  const internalPieData = useMemo(() => ({
    labels: ['Operational', 'Safety', 'Improvement', 'Recognition', 'Complaint', 'Other'],
    datasets: [{
      data: [
        internalTypeCounts.operational || 0,
        internalTypeCounts.safety || 0,
        internalTypeCounts.improvement || 0,
        internalTypeCounts.recognition || 0,
        internalTypeCounts.complaint || 0,
        internalTypeCounts.other || 0,
      ],
      backgroundColor: ['#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#dc2626', '#6b7280'],
    }],
  }), [internalTypeCounts]);

  const externalFeedback = useMemo(() => safeFeedbackData.filter(f => ['patient', 'visitor', 'family'].includes(f.source)), [safeFeedbackData]);
  const externalTypeCounts = useMemo(() => externalFeedback.reduce((acc, f) => {
    const type = f.feedbackType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}), [externalFeedback]);

  const externalPieData = useMemo(() => ({
    labels: ['Complaint', 'Suggestion', 'Compliment', 'Other'],
    datasets: [{
      data: [
        externalTypeCounts.complaint || 0,
        externalTypeCounts.suggestion || 0,
        externalTypeCounts.compliment || 0,
        externalTypeCounts.other || 0,
      ],
      backgroundColor: ['#ef4444', '#8b5cf6', '#10b981', '#6b7280'],
    }],
  }), [externalTypeCounts]);

  // ──────────────────────────────────────────────────────────────
  // 4. Department Volume
  // ──────────────────────────────────────────────────────────────
  const departmentCounts = useMemo(() => safeFeedbackData.reduce((acc, f) => {
    const dept = f.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {}), [safeFeedbackData]);

  const sortedDepts = useMemo(() => Object.keys(departmentCounts)
    .sort((a, b) => departmentCounts[b] - departmentCounts[a]), [departmentCounts]);

  const departmentData = useMemo(() => ({
    labels: sortedDepts,
    datasets: [{
      label: 'Feedback by Department',
      data: sortedDepts.map(d => departmentCounts[d]),
      backgroundColor: 'rgba(98, 0, 234, 0.6)',
    }],
  }), [sortedDepts, departmentCounts]);

  // ──────────────────────────────────────────────────────────────
  // 5. Department Sentiment Percentage (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getDepartmentSentimentStats = useMemo(() => () => {
    const POSITIVE_PRIOR = 1;
    const NEUTRAL_PRIOR = 1;
    const NEGATIVE_PRIOR = 1;
    const SENTIMENT_PRIOR_TOTAL = 3;

    const stats = {};

    safeFeedbackData.forEach(f => {
      const dept = f.department || 'Unknown';
      if (!stats[dept]) stats[dept] = { pos: 0, neu: 0, neg: 0, total: 0 };

      const s = f.sentiment || 'pending';
      if (s === 'positive') stats[dept].pos++;
      else if (s === 'neutral') stats[dept].neu++;
      else if (s === 'negative') stats[dept].neg++;

      stats[dept].total++;
    });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const totalAnalyzed = d.pos + d.neu + d.neg;
        const correctedTotal = totalAnalyzed + SENTIMENT_PRIOR_TOTAL;

        return {
          department: dept,
          total: d.total,
          positive: Number(((d.pos + POSITIVE_PRIOR) / correctedTotal * 100).toFixed(1)),
          neutral: Number(((d.neu + NEUTRAL_PRIOR) / correctedTotal * 100).toFixed(1)),
          negative: Number(((d.neg + NEGATIVE_PRIOR) / correctedTotal * 100).toFixed(1)),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [safeFeedbackData]);

  const allDeptStats = useMemo(() => getDepartmentSentimentStats(), [getDepartmentSentimentStats]);

  // ──────────────────────────────────────────────────────────────
  // 6. Internal Feedback Type % by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getInternalTypeByDeptStats = useMemo(() => () => {
    const OPERATIONAL_PRIOR = 1;
    const SAFETY_PRIOR = 1;
    const IMPROVEMENT_PRIOR = 1;
    const RECOGNITION_PRIOR = 1;
    const COMPLAINT_PRIOR = 1;
    const OTHER_PRIOR = 1;
    const INTERNAL_TYPE_PRIOR_TOTAL = 6;

    const stats = {};

    safeFeedbackData
      .filter(f => f.source === 'staff')
      .forEach(f => {
        const dept = f.department || 'Unknown';
        const type = f.feedbackType || 'other';

        if (!stats[dept]) {
          stats[dept] = {
            operational: 0, safety: 0, improvement: 0,
            recognition: 0, complaint: 0, other: 0, total: 0
          };
        }
        stats[dept][type]++;
        stats[dept].total++;
      });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const correctedTotal = d.total + INTERNAL_TYPE_PRIOR_TOTAL;

        return {
          department: dept,
          total: d.total,
          operational: Number((((d.operational + OPERATIONAL_PRIOR) / correctedTotal) * 100).toFixed(1)),
          safety: Number((((d.safety + SAFETY_PRIOR) / correctedTotal) * 100).toFixed(1)),
          improvement: Number((((d.improvement + IMPROVEMENT_PRIOR) / correctedTotal) * 100).toFixed(1)),
          recognition: Number((((d.recognition + RECOGNITION_PRIOR) / correctedTotal) * 100).toFixed(1)),
          complaint: Number((((d.complaint + COMPLAINT_PRIOR) / correctedTotal) * 100).toFixed(1)),
          other: Number((((d.other + OTHER_PRIOR) / correctedTotal) * 100).toFixed(1)),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [safeFeedbackData]);

  const internalTypeByDeptStats = useMemo(() => getInternalTypeByDeptStats(), [getInternalTypeByDeptStats]);

  // ──────────────────────────────────────────────────────────────
  // 7. External Feedback Type % by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getExternalTypeByDeptStats = useMemo(() => () => {
    const COMPLAINT_PRIOR = 1;
    const SUGGESTION_PRIOR = 1;
    const COMPLIMENT_PRIOR = 1;
    const OTHER_PRIOR = 1;
    const EXTERNAL_TYPE_PRIOR_TOTAL = 4;

    const stats = {};

    safeFeedbackData
      .filter(f => ['patient', 'visitor', 'family'].includes(f.source))
      .forEach(f => {
        const dept = f.department || 'Unknown';
        const type = f.feedbackType || 'other';

        if (!stats[dept]) {
          stats[dept] = { complaint: 0, suggestion: 0, compliment: 0, other: 0, total: 0 };
        }
        stats[dept][type]++;
        stats[dept].total++;
      });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const correctedTotal = d.total + EXTERNAL_TYPE_PRIOR_TOTAL;

        return {
          department: dept,
          total: d.total,
          complaint: Number((((d.complaint + COMPLAINT_PRIOR) / correctedTotal) * 100).toFixed(1)),
          suggestion: Number((((d.suggestion + SUGGESTION_PRIOR) / correctedTotal) * 100).toFixed(1)),
          compliment: Number((((d.compliment + COMPLIMENT_PRIOR) / correctedTotal) * 100).toFixed(1)),
          other: Number((((d.other + OTHER_PRIOR) / correctedTotal) * 100).toFixed(1)),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [safeFeedbackData]);

  const externalTypeByDeptStats = useMemo(() => getExternalTypeByDeptStats(), [getExternalTypeByDeptStats]);

  // ──────────────────────────────────────────────────────────────
  // 8. Average Star Rating by Department (External only)
  // ──────────────────────────────────────────────────────────────
  const getDepartmentRatingStats = useMemo(() => () => {
    const RATING_PRIOR_COUNT = 5;
    const RATING_PRIOR_SUM = 3.0 * RATING_PRIOR_COUNT;

    const stats = {};

    externalFeedback.forEach(f => {
      const dept = f.department || 'Unknown';
      if (!stats[dept]) stats[dept] = { sum: 0, count: 0, totalFeedback: 0 };

      if (f.rating != null) {
        stats[dept].sum += f.rating;
        stats[dept].count++;
      }
      stats[dept].totalFeedback++;
    });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const correctedCount = d.count + RATING_PRIOR_COUNT;
        const correctedSum = d.sum + RATING_PRIOR_SUM;
        const avgRating = correctedSum / correctedCount;

        return {
          department: dept,
          total: d.totalFeedback,
          averageRating: Number(avgRating.toFixed(2)),
          ratedCount: d.count,
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [externalFeedback]);

  const ratingByDeptStats = useMemo(() => getDepartmentRatingStats(), [getDepartmentRatingStats]);

  // ──────────────────────────────────────────────────────────────
  // 9. Impact Severity % by Department (Staff only)
  // ──────────────────────────────────────────────────────────────
  const getImpactSeverityStats = useMemo(() => () => {
    const MINOR_PRIOR = 1;
    const MODERATE_PRIOR = 1;
    const CRITICAL_PRIOR = 1;
    const IMPACT_PRIOR_TOTAL = 3;

    const stats = {};

    safeFeedbackData
      .filter(f => f.source === 'staff' && f.impactSeverity)
      .forEach(f => {
        const dept = f.department || 'Unknown';
        const severity = f.impactSeverity.toLowerCase();

        if (!stats[dept]) {
          stats[dept] = { minor: 0, moderate: 0, critical: 0, total: 0 };
        }

        if (severity === 'minor') stats[dept].minor++;
        else if (severity === 'moderate') stats[dept].moderate++;
        else if (severity === 'critical') stats[dept].critical++;

        stats[dept].total++;
      });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const correctedTotal = d.total + IMPACT_PRIOR_TOTAL;

        return {
          department: dept,
          total: d.total,
          minor: Number((((d.minor + MINOR_PRIOR) / correctedTotal) * 100).toFixed(1)),
          moderate: Number((((d.moderate + MODERATE_PRIOR) / correctedTotal) * 100).toFixed(1)),
          critical: Number((((d.critical + CRITICAL_PRIOR) / correctedTotal) * 100).toFixed(1)),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [safeFeedbackData]);

  const impactSeverityStats = useMemo(() => getImpactSeverityStats(), [getImpactSeverityStats]);

  // ──────────────────────────────────────────────────────────────
  // 10. Hospital-wide Urgency Distribution (Pie)
  // ──────────────────────────────────────────────────────────────
  const urgencyData = useMemo(() => ({
    labels: ['Urgent', 'Non-Urgent'],
    datasets: [{
      data: [
        safeFeedbackData.filter(f => f.urgent === true).length,
        safeFeedbackData.filter(f => f.urgent !== true).length,
      ],
      backgroundColor: ['#dc2626', '#94a3b8'],
    }],
  }), [safeFeedbackData]);

  // ──────────────────────────────────────────────────────────────
  // 11. Urgency Percentage by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getUrgencyByDeptStats = useMemo(() => () => {
    const URGENT_PRIOR = 1;
    const NON_URGENT_PRIOR = 1;
    const URGENCY_PRIOR_TOTAL = 2;

    const stats = {};

    safeFeedbackData.forEach(f => {
      const dept = f.department || 'Unknown';
      if (!stats[dept]) stats[dept] = { urgent: 0, nonUrgent: 0, total: 0 };

      if (f.urgent === true) stats[dept].urgent++;
      else stats[dept].nonUrgent++;

      stats[dept].total++;
    });

    return Object.entries(stats)
      .map(([dept, d]) => {
        const correctedTotal = d.total + URGENCY_PRIOR_TOTAL;

        return {
          department: dept,
          total: d.total,
          urgent: Number((((d.urgent + URGENT_PRIOR) / correctedTotal) * 100).toFixed(1)),
          nonUrgent: Number((((d.nonUrgent + NON_URGENT_PRIOR) / correctedTotal) * 100).toFixed(1)),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [safeFeedbackData]);

  const urgencyByDeptStats = useMemo(() => getUrgencyByDeptStats(), [getUrgencyByDeptStats]);

  // ──────────────────────────────────────────────────────────────
  // CRITICAL: EXPOSE CHART LIST TO WINDOW FOR PDF GENERATION
  // This allows the report generation system to know which charts
  // are rendered and their metadata (title, description)
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const chartMetadata = [
      {
        title: 'Feedback Volume Over Time',
        description: 'Distribution of feedback across Today, Last Week, Last Month, and Last Quarter periods.'
      },
      {
        title: 'Feedback Volume by Department',
        description: 'Total count of feedback items received per department, sorted by volume.'
      },
      {
        title: 'Sentiment Distribution',
        description: 'Overall breakdown of feedback sentiment: Positive, Neutral, Negative, and Pending analysis.'
      },
      {
        title: 'Source Distribution',
        description: 'Proportion of feedback from Staff (internal), Patients, and Visitors/Family (external).'
      },
      {
        title: 'Internal Feedback Type Distribution',
        description: 'Categories of staff feedback: Operational issues, Safety concerns, Improvement suggestions, Recognition, Complaints, and Other.'
      },
      {
        title: 'External Feedback Type Distribution',
        description: 'Categories of patient/visitor feedback: Complaints, Suggestions, Compliments, and Other.'
      },
      {
        title: 'Overall Urgency Distribution',
        description: 'Hospital-wide ratio of feedback marked as Urgent versus Non-Urgent.'
      },
      {
        title: 'Department Sentiment Percentage (Stabilized)',
        description: 'Normalized percentage breakdown of Positive, Neutral, and Negative sentiment by department using Bayesian smoothing.'
      },
    ];

    // Add conditional charts only if they have data
    if (internalTypeByDeptStats.length > 0) {
      chartMetadata.push({
        title: 'Internal Feedback Type Distribution by Department (%) (Stabilized)',
        description: 'Percentage distribution of staff feedback categories across departments with Bayesian stabilization.'
      });
    }

    if (externalTypeByDeptStats.length > 0) {
      chartMetadata.push({
        title: 'External Feedback Type Distribution by Department (%) (Stabilized)',
        description: 'Percentage distribution of patient/visitor feedback categories across departments with Bayesian stabilization.'
      });
    }

    if (impactSeverityStats.length > 0) {
      chartMetadata.push({
        title: 'Impact Severity Distribution by Department (%) – Staff Feedback (Stabilized)',
        description: 'Percentage breakdown of Minor, Moderate, and Critical severity levels reported by staff across departments.'
      });
    }

    if (urgencyByDeptStats.length > 0) {
      chartMetadata.push({
        title: 'Urgent Feedback Percentage by Department (Stabilized)',
        description: 'Percentage of feedback marked as urgent within each department, with Bayesian smoothing applied.'
      });
    }

    if (ratingByDeptStats.length > 0) {
      chartMetadata.push({
        title: 'Average Star Rating by Department (Patient/Visitor/Family)',
        description: 'Average satisfaction ratings (1-5 stars) given by patients, visitors, and family members for each department.'
      });
    }

    // Expose to window for PDF generation
    window.currentChartList = chartMetadata;

    // Cleanup on unmount
    return () => {
      window.currentChartList = [];
    };
  }, [
    safeFeedbackData.length,
    internalTypeByDeptStats.length,
    externalTypeByDeptStats.length,
    impactSeverityStats.length,
    urgencyByDeptStats.length,
    ratingByDeptStats.length
  ]);

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <section className={styles.analyticsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionHeading}>Analytics & Insights</h2>
        <button
          className={styles.toggleButton}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
        </button>
      </div>

      {!isCollapsed && (
        <div className={styles.analyticsContent}>

          {/* Chart 1: Feedback Volume Over Time */}
          <div className={`${styles.chartContainer} chart-for-pdf`}>
            <h3>Feedback Volume Over Time</h3>
            {safeFeedbackData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                <p>No data available – apply filters to view trends.</p>
              </div>
            ) : (
              <Bar 
                data={feedbackVolumeData} 
                options={{
                  responsive: true,
                  plugins: {
                    datalabels: {
                      display: true,
                      color: '#fff',
                      font: { weight: 'bold', size: 14 },
                      formatter: (value) => value
                    }
                  }
                }} 
              />
            )}
          </div>

          {/* Chart 2: Feedback Volume by Department */}
          <div className={`${styles.chartContainer} chart-for-pdf`}>
            <h3>Feedback Volume by Department</h3>
            {safeFeedbackData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                <p>No data available – apply filters to view department breakdown.</p>
              </div>
            ) : (
              <Bar 
                data={departmentData} 
                options={{
                  responsive: true,
                  plugins: {
                    datalabels: {
                      display: true,
                      color: '#fff',
                      font: { weight: 'bold', size: 14 },
                      formatter: (value) => value
                    }
                  }
                }} 
              />
            )}
          </div>

          {/* Charts 3 & 4: Sentiment and Source Distribution */}
          <div className={styles.distributionRow}>
            <div className={`${styles.chartContainer} chart-for-pdf`}>
              <h3>Sentiment Distribution</h3>
              {safeFeedbackData.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  <p>No sentiment data yet.</p>
                </div>
              ) : (
                <Pie 
                  data={sentimentData} 
                  options={{
                    responsive: true,
                    plugins: {
                      datalabels: {
                        display: true,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: 6,
                        font: { weight: 'bold', size: 13 },
                        formatter: (value, ctx) => {
                          if (value === 0) return '';
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value}\n(${percentage}%)`;
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
            <div className={`${styles.chartContainer} chart-for-pdf`}>
              <h3>Source Distribution</h3>
              {safeFeedbackData.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  <p>No source data yet.</p>
                </div>
              ) : (
                <Pie 
                  data={sourceData} 
                  options={{
                    responsive: true,
                    plugins: {
                      datalabels: {
                        display: true,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: 6,
                        font: { weight: 'bold', size: 13 },
                        formatter: (value, ctx) => {
                          if (value === 0) return '';
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value}\n(${percentage}%)`;
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>

          {/* Charts 5 & 6: Internal and External Feedback Types */}
          <div className={styles.distributionRow}>
            <div className={`${styles.chartContainer} chart-for-pdf`}>
              <h3>Internal Feedback Type Distribution</h3>
              {internalFeedback.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  <p>No internal feedback yet.</p>
                </div>
              ) : (
                <Pie 
                  data={internalPieData} 
                  options={{
                    responsive: true,
                    plugins: {
                      datalabels: {
                        display: true,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: 6,
                        font: { weight: 'bold', size: 13 },
                        formatter: (value, ctx) => {
                          if (value === 0) return '';
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value}\n(${percentage}%)`;
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
            <div className={`${styles.chartContainer} chart-for-pdf`}>
              <h3>External Feedback Type Distribution</h3>
              {externalFeedback.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  <p>No external feedback yet.</p>
                </div>
              ) : (
                <Pie 
                  data={externalPieData} 
                  options={{
                    responsive: true,
                    plugins: {
                      datalabels: {
                        display: true,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: 6,
                        font: { weight: 'bold', size: 13 },
                        formatter: (value, ctx) => {
                          if (value === 0) return '';
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value}\n(${percentage}%)`;
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>

          {/* Chart 7: Overall Urgency Distribution */}
          <div style={{width: '717px', margin: 'auto'}}>
            <div className={`${styles.chartContainer} chart-for-pdf`}>
              <h3>Overall Urgency Distribution</h3>
              {safeFeedbackData.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem'}}>
                  <p>No urgency data yet.</p>
                </div>
              ) : (
                <Pie 
                  data={urgencyData} 
                  options={{
                    responsive: true,
                    plugins: {
                      datalabels: {
                        display: true,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: 6,
                        font: { weight: 'bold', size: 13 },
                        formatter: (value, ctx) => {
                          if (value === 0) return '';
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value}\n(${percentage}%)`;
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>            
          </div>


          {/* Chart 8: Department Sentiment Percentage */}
          <div className={`${styles.chartContainerFull} chart-for-pdf`}>
            <h3>Department Sentiment Percentage (Stabilized)</h3>
            {safeFeedbackData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '4rem' }}>
                No feedback data available for the selected filters.
              </p>
            ) : (
              <div style={{ height: '680px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: allDeptStats.map(d => d.department),
                    datasets: [
                      { label: 'Positive', data: allDeptStats.map(d => d.positive), backgroundColor: '#10b981', stack: 'sentiment' },
                      { label: 'Neutral', data: allDeptStats.map(d => d.neutral), backgroundColor: '#f59e0b', stack: 'sentiment' },
                      { label: 'Negative', data: allDeptStats.map(d => d.negative), backgroundColor: '#ef4444', stack: 'sentiment' },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } },
                      legend: { position: 'top', labels: { font: { size: 14 }, padding: 20 } },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value) => value > 0 ? `${value}%` : ''
                      }
                    },
                    scales: {
                      x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` }, title: { display: true, text: 'Sentiment Distribution (%)' } },
                      y: { stacked: true, ticks: { autoSkip: false } },
                    },
                  }}
                />
              </div>
            )}
          </div>

          {/* Chart 9: Internal Feedback Type % by Department (Conditional) */}
          {internalTypeByDeptStats.length > 0 && (
            <div className={`${styles.chartContainerFull} chart-for-pdf`}>
              <h3>Internal Feedback Type Distribution by Department (%) (Stabilized)</h3>
              <div style={{ height: '620px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: internalTypeByDeptStats.map(d => d.department),
                    datasets: [
                      { label: 'Operational', data: internalTypeByDeptStats.map(d => d.operational), backgroundColor: '#3b82f6', stack: 'type' },
                      { label: 'Safety', data: internalTypeByDeptStats.map(d => d.safety), backgroundColor: '#ef4444', stack: 'type' },
                      { label: 'Improvement', data: internalTypeByDeptStats.map(d => d.improvement), backgroundColor: '#8b5cf6', stack: 'type' },
                      { label: 'Recognition', data: internalTypeByDeptStats.map(d => d.recognition), backgroundColor: '#10b981', stack: 'type' },
                      { label: 'Complaint', data: internalTypeByDeptStats.map(d => d.complaint), backgroundColor: '#dc2626', stack: 'type' },
                      { label: 'Other', data: internalTypeByDeptStats.map(d => d.other), backgroundColor: '#6b7280', stack: 'type' },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value) => value > 0 ? `${value}%` : ''
                      }
                    },
                    scales: { x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } }, y: { stacked: true } },
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 10: External Feedback Type % by Department (Conditional) */}
          {externalTypeByDeptStats.length > 0 && (
            <div className={`${styles.chartContainerFull} chart-for-pdf`}>
              <h3>External Feedback Type Distribution by Department (%) (Stabilized)</h3>
              <div style={{ height: '580px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: externalTypeByDeptStats.map(d => d.department),
                    datasets: [
                      { label: 'Complaint', data: externalTypeByDeptStats.map(d => d.complaint), backgroundColor: '#ef4444', stack: 'type' },
                      { label: 'Suggestion', data: externalTypeByDeptStats.map(d => d.suggestion), backgroundColor: '#8b5cf6', stack: 'type' },
                      { label: 'Compliment', data: externalTypeByDeptStats.map(d => d.compliment), backgroundColor: '#10b981', stack: 'type' },
                      { label: 'Other', data: externalTypeByDeptStats.map(d => d.other), backgroundColor: '#6b7280', stack: 'type' },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value) => value > 0 ? `${value}%` : ''
                      }
                    },
                    scales: { x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } }, y: { stacked: true } },
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 11: Impact Severity % by Department (Conditional) */}
          {impactSeverityStats.length > 0 && (
            <div className={`${styles.chartContainerFull} chart-for-pdf`}>
              <h3>Impact Severity Distribution by Department (%) – Staff Feedback (Stabilized)</h3>
              <div style={{ height: '620px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: impactSeverityStats.map(d => d.department),
                    datasets: [
                      { label: 'Minor', data: impactSeverityStats.map(d => d.minor), backgroundColor: '#94a3b8', stack: 'severity' },
                      { label: 'Moderate', data: impactSeverityStats.map(d => d.moderate), backgroundColor: '#f59e0b', stack: 'severity' },
                      { label: 'Critical', data: impactSeverityStats.map(d => d.critical), backgroundColor: '#ef4444', stack: 'severity' },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } },
                      legend: { position: 'top' },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value) => value > 0 ? `${value}%` : ''
                      }
                    },
                    scales: {
                      x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } },
                      y: { stacked: true },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 12: Urgency % by Department (Conditional) */}
          {urgencyByDeptStats.length > 0 && (
            <div className={`${styles.chartContainerFull} chart-for-pdf`}>
              <h3>Urgent Feedback Percentage by Department (Stabilized)</h3>
              <div style={{ height: '620px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: urgencyByDeptStats.map(d => d.department),
                    datasets: [
                      { label: 'Urgent', data: urgencyByDeptStats.map(d => d.urgent), backgroundColor: '#dc2626', stack: 'urgency' },
                      { label: 'Non-Urgent', data: urgencyByDeptStats.map(d => d.nonUrgent), backgroundColor: '#94a3b8', stack: 'urgency' },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: ctx => `${ctx.dataset.label}: ${ctx.raw}% (Count: ${urgencyByDeptStats[ctx.dataIndex].total})`
                        }
                      },
                      legend: { position: 'top' },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value) => value > 0 ? `${value}%` : ''
                      }
                    },
                    scales: {
                      x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } },
                      y: { stacked: true, ticks: { autoSkip: false } },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 13: Average Star Rating by Department (Conditional) */}
          {ratingByDeptStats.length > 0 && (
            <div className={`${styles.chartContainerFull} chart-for-pdf`}>
              <h3>Average Star Rating by Department (Patient/Visitor/Family)</h3>
              <div style={{ height: '620px', margin: '2rem 0' }}>
                <Bar
                  data={{
                    labels: ratingByDeptStats.map(d => d.department),
                    datasets: [{
                      label: 'Average Rating',
                      data: ratingByDeptStats.map(d => d.averageRating),
                      backgroundColor: '#fbbf24',
                    }],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: { callbacks: { label: ctx => `★ ${ctx.raw}` } },
                      legend: { display: false },
                      datalabels: {
                        display: true,
                        color: '#1f2937',
                        font: { weight: 'bold', size: 14 },
                        anchor: 'end',
                        align: 'end',
                        offset: 10,
                        formatter: (value) => `★ ${value.toFixed(2)}`
                      }
                    },
                    scales: {
                      x: { min: 0, max: 5, ticks: { stepSize: 0.5, callback: v => `★ ${v.toFixed(1)}` } },
                      y: { ticks: { autoSkip: false } },
                    },
                  }}
                />
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
};

AnalyticsSection.propTypes = {
  styles: PropTypes.object.isRequired,
  feedbackData: PropTypes.arrayOf(PropTypes.object),
};

AnalyticsSection.defaultProps = {
  feedbackData: [],
};

export default AnalyticsSection;