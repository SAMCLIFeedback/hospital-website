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
  // 2. Overall Sentiment + Source
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
    labels: ['Staff', 'Patient', 'Visitor'],
    datasets: [{
      data: ['staff', 'patient', 'visitor'].map(src =>
        safeFeedbackData.filter(f => (f.source || '').toLowerCase() === src).length
      ),
      backgroundColor: ['#00b7eb', '#ff6b6b', '#4caf50'],
    }],
  };

  // ──────────────────────────────────────────────────────────────
  // 3. Department Volume
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
  // 4. FINAL CHART: Stacked Sentiment % by Department (ALL DEPTS)
  // ──────────────────────────────────────────────────────────────
  const getDepartmentSentimentStats = () => {
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
      .map(([dept, d]) => ({
        department: dept,
        total: d.total,
        positive: Number(((d.pos / d.total) * 100).toFixed(1)),
        neutral: Number(((d.neu / d.total) * 100).toFixed(1)),
        negative: Number(((d.neg / d.total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.total - a.total);
  };

  const allDeptStats = getDepartmentSentimentStats();

  // ──────────────────────────────────────────────────────────────
  // NEW: Internal Feedback Type % (Pie Chart)
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

  // ──────────────────────────────────────────────────────────────
  // NEW: External Feedback Type % (Pie Chart)
  // ──────────────────────────────────────────────────────────────
  const externalFeedback = safeFeedbackData.filter(f => f.source === 'patient' || f.source === 'visitor');
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

          {/* Existing Charts */}
          <div className={styles.chartContainer}>
            <h3>Feedback Volume Over Time</h3>
            <Bar data={feedbackVolumeData} options={{ responsive: true }} />
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
            <h3>Feedback Volume by Department</h3>
            <Bar data={departmentData} options={{ responsive: true }} />
          </div>

          {/* FINAL MASTERPIECE: One Stacked Sentiment Chart */}
          <div className={styles.chartContainerFull}>
            <h3>Department Sentiment Overview</h3>

            {safeFeedbackData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '4rem' }}>
                No feedback data available for the selected filters.
              </p>
            ) : (
              <>
                <div style={{ height: '680px', margin: '2rem 0' }}>
                  <Bar
                    data={{
                      labels: allDeptStats.map(d => d.department),
                      datasets: [
                        {
                          label: 'Positive',
                          data: allDeptStats.map(d => d.positive),
                          backgroundColor: '#10b981',
                          stack: 'sentiment',
                        },
                        {
                          label: 'Neutral',
                          data: allDeptStats.map(d => d.neutral),
                          backgroundColor: '#f59e0b',
                          stack: 'sentiment',
                        },
                        {
                          label: 'Negative',
                          data: allDeptStats.map(d => d.negative),
                          backgroundColor: '#ef4444',
                          stack: 'sentiment',
                        },
                      ],
                    }}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
                          },
                        },
                        legend: {
                          position: 'top',
                          labels: { font: { size: 14 }, padding: 20 },
                        },
                      },
                      scales: {
                        x: {
                          stacked: true,
                          max: 100,
                          ticks: { callback: (v) => `${v}%` },
                          title: { display: true, text: 'Sentiment Distribution (%)', font: { size: 14 } },
                        },
                        y: {
                          stacked: true,
                          ticks: {
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0,
                            font: { size: 13, weight: '500' },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </>
            )}
          </div>

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