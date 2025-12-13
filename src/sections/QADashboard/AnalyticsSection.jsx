// @sections/QADashboard/AnalyticsSection.jsx
import { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';

const AnalyticsSection = ({ styles, feedbackData = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const safeFeedbackData = Array.isArray(feedbackData) ? feedbackData : [];

  // ──────────────────────────────────────────────────────────────
  // 1. Feedback Volume Over Time
  // ──────────────────────────────────────────────────────────────
  const feedbackVolumeData = {
    labels: ['Today', 'Week', 'Month', 'Quarter'],
    datasets: [{
      label: 'Feedback Volume',
      data: [
        safeFeedbackData.filter(f => new Date(f.date).toDateString() === new Date().toDateString()).length,
        safeFeedbackData.filter(f => new Date(f.date) >= new Date(new Date().setDate(new Date().getDate() - 7))).length,
        safeFeedbackData.filter(f => new Date(f.date) >= new Date(new Date().setMonth(new Date().getMonth() - 1))).length,
        safeFeedbackData.filter(f => new Date(f.date) >= new Date(new Date().setMonth(new Date().getMonth() - 3))).length,
      ],
      backgroundColor: 'rgba(26, 115, 232, 0.6)',
    }],
  };

  // ──────────────────────────────────────────────────────────────
  // 2. Overall Sentiment + Source (Pie Charts)
  // ──────────────────────────────────────────────────────────────
  const sentimentData = {
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
  };

  const sourceData = {
    labels: ['Staff', 'Patient', 'Visitor/Family'],
    datasets: [{
      data: [
        safeFeedbackData.filter(f => f.source === 'staff').length,
        safeFeedbackData.filter(f => f.source === 'patient').length,
        safeFeedbackData.filter(f => f.source === 'visitor' || f.source === 'family').length,
      ],
      backgroundColor: ['#00b7eb', '#ff6b6b', '#4caf50'],
    }],
  };

  // ──────────────────────────────────────────────────────────────
  // 3. Internal & External Feedback Type Distribution (Global Pies)
  // ──────────────────────────────────────────────────────────────
  const internalFeedback = safeFeedbackData.filter(f => f.source === 'staff');
  const internalTypeCounts = internalFeedback.reduce((acc, f) => {
    const type = f.feedbackType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const internalPieData = {
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
  };

  const externalFeedback = safeFeedbackData.filter(f => ['patient', 'visitor', 'family'].includes(f.source));
  const externalTypeCounts = externalFeedback.reduce((acc, f) => {
    const type = f.feedbackType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const externalPieData = {
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
  };

  // ──────────────────────────────────────────────────────────────
  // 4. Department Volume
  // ──────────────────────────────────────────────────────────────
  const departmentCounts = safeFeedbackData.reduce((acc, f) => {
    const dept = f.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const sortedDepts = Object.keys(departmentCounts)
    .sort((a, b) => departmentCounts[b] - departmentCounts[a]);

  const departmentData = {
    labels: sortedDepts,
    datasets: [{
      label: 'Feedback by Department',
      data: sortedDepts.map(d => departmentCounts[d]),
      backgroundColor: 'rgba(98, 0, 234, 0.6)',
    }],
  };

  // ──────────────────────────────────────────────────────────────
  // 5. Department Sentiment Percentage (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getDepartmentSentimentStats = () => {
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
  };

  const allDeptStats = getDepartmentSentimentStats();

  // ──────────────────────────────────────────────────────────────
  // 6. Internal Feedback Type % by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getInternalTypeByDeptStats = () => {
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
  };

  const internalTypeByDeptStats = getInternalTypeByDeptStats();

  // ──────────────────────────────────────────────────────────────
  // 7. External Feedback Type % by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getExternalTypeByDeptStats = () => {
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
  };

  const externalTypeByDeptStats = getExternalTypeByDeptStats();

  // ──────────────────────────────────────────────────────────────
  // 8. Average Star Rating by Department (External only)
  // ──────────────────────────────────────────────────────────────
  const getDepartmentRatingStats = () => {
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
  };

  const ratingByDeptStats = getDepartmentRatingStats();

  // ──────────────────────────────────────────────────────────────
  // 9. Impact Severity % by Department (Staff only)
  // ──────────────────────────────────────────────────────────────
  const getImpactSeverityStats = () => {
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
  };

  const impactSeverityStats = getImpactSeverityStats();

  // ──────────────────────────────────────────────────────────────
  // 10. NEW: Hospital-wide Urgency Distribution (Pie)
  // ──────────────────────────────────────────────────────────────
  const urgencyData = {
    labels: ['Urgent', 'Non-Urgent'],
    datasets: [{
      data: [
        safeFeedbackData.filter(f => f.urgent === true).length,
        safeFeedbackData.filter(f => f.urgent !== true).length,
      ],
      backgroundColor: ['#dc2626', '#94a3b8'],
    }],
  };

  // ──────────────────────────────────────────────────────────────
  // 11. NEW: Urgency Percentage by Department (Stabilized)
  // ──────────────────────────────────────────────────────────────
  const getUrgencyByDeptStats = () => {
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
  };

  const urgencyByDeptStats = getUrgencyByDeptStats();

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

          {/* Original Charts */}
          <div className={styles.chartContainer}>
            <h3>Feedback Volume Over Time</h3>
            <Bar data={feedbackVolumeData} options={{ responsive: true }} />
          </div>

          <div className={styles.chartContainer}>
            <h3>Feedback Volume by Department</h3>
            <Bar data={departmentData} options={{ responsive: true }} />
          </div>

          <div className={styles.distributionRow}>
            <div className={styles.chartContainer}>
              <h3>Sentiment Distribution</h3>
              <Pie data={sentimentData} options={{ responsive: true }} />
            </div>
            <div className={styles.chartContainer}>
              <h3>Source Distribution</h3>
              <Pie data={sourceData} options={{ responsive: true }} />
            </div>
          </div>

          <div className={styles.distributionRow}>
            <div className={styles.chartContainer}>
              <h3>Internal Feedback Type Distribution</h3>
              <Pie data={internalPieData} options={{ responsive: true }} />
            </div>
            <div className={styles.chartContainer}>
              <h3>External Feedback Type Distribution</h3>
              <Pie data={externalPieData} options={{ responsive: true }} />
            </div>
          </div>

          <div className={styles.chartContainer}>
            <h3>Overall Urgency Distribution</h3>
            <Pie data={urgencyData} options={{ responsive: true }} />
          </div>

          {/* Department Sentiment */}
          <div className={styles.chartContainerFull}>
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

          {/* Internal Feedback Type % by Department */}
          {internalTypeByDeptStats.length > 0 && (
            <div className={styles.chartContainerFull}>
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
                    plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } } },
                    scales: { x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } }, y: { stacked: true } },
                  }}
                />
              </div>
            </div>
          )}

          {/* External Feedback Type % by Department */}
          {externalTypeByDeptStats.length > 0 && (
            <div className={styles.chartContainerFull}>
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
                    plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } } },
                    scales: { x: { stacked: true, max: 100, ticks: { callback: v => `${v}%` } }, y: { stacked: true } },
                  }}
                />
              </div>
            </div>
          )}

          {/* Average Star Rating by Department */}
          {ratingByDeptStats.length > 0 && (
            <div className={styles.chartContainerFull}>
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
                      tooltip: { callbacks: { label: ctx => `★ ${ctx.raw} / 5.00` } },
                      legend: { display: false },
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

          {/* Impact Severity % by Department */}
          {impactSeverityStats.length > 0 && (
            <div className={styles.chartContainerFull}>
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

          {/* NEW: Urgency % by Department */}
          {urgencyByDeptStats.length > 0 && (
            <div className={styles.chartContainerFull}>
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