import { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';

const AnalyticsSection = ({ styles, feedbackData }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Feedback Volume Data
  const feedbackVolumeData = {
    labels: ['Today', 'Week', 'Month', 'Quarter'],
    datasets: [{
      label: 'Feedback Volume',
      data: [
        feedbackData.filter(f => new Date(f.date).toDateString() === new Date().toDateString()).length,
        feedbackData.filter(f => new Date(f.date) >= new Date(new Date().setDate(new Date().getDate() - 7))).length,
        feedbackData.filter(f => new Date(f.date) >= new Date(new Date().setMonth(new Date().getMonth() - 1))).length,
        feedbackData.filter(f => new Date(f.date) >= new Date(new Date().setMonth(new Date().getMonth() - 3))).length,
      ],
      backgroundColor: 'rgba(26, 115, 232, 0.6)',
    }],
  };

  // Sentiment Distribution Data
  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative', 'Pending'],
    datasets: [{
      data: [
        feedbackData.filter(f => f.sentiment === 'positive').length,
        feedbackData.filter(f => f.sentiment === 'neutral').length,
        feedbackData.filter(f => f.sentiment === 'negative').length,
        feedbackData.filter(f => !f.sentiment && f.sentiment_status === 'pending').length,
      ],
      backgroundColor: ['#4caf50', '#fabb05', '#ff6b6b', '#1a73e8'],
    }],
  };

  // Department Distribution Data
  const departments = [...new Set(feedbackData.map(f => f.department || 'Unknown'))];
  const departmentData = {
    labels: departments,
    datasets: [{
      label: 'Feedback by Department',
      data: departments.map(dept => feedbackData.filter(f => (f.department || 'Unknown') === dept).length),
      backgroundColor: 'rgba(98, 0, 234, 0.6)',
    }],
  };

  const fixedSources = ['staff', 'patient', 'visitor'];
  const fixedSourceColors = {
    staff: '#00b7eb',     // Blue
    patient: '#ff6b6b',   // Coral
    visitor: '#4caf50',   // Green
  };

  const sourceData = {
    labels: fixedSources,
    datasets: [{
      data: fixedSources.map(src =>
        feedbackData.filter(f => (f.source || '').toLowerCase() === src).length
      ),
      backgroundColor: fixedSources.map(src => fixedSourceColors[src]),
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
          <div className={styles.chartContainer}>
            <h3>Feedback Volume Over Time</h3>
            <Bar data={feedbackVolumeData} options={{ responsive: true }} />
          </div>

          {/* New horizontal row for sentiment + source */}
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

          <div className={styles.chartContainer}>
            <h3>Departmental Feedback</h3>
            <Bar data={departmentData} options={{ responsive: true }} />
          </div>
        </div>
      )}
    </section>
  );
};

AnalyticsSection.propTypes = {
  feedbackData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default AnalyticsSection;