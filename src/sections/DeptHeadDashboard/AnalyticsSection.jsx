import { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';

const AnalyticsSection = ({ feedbackData }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

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

  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [
        feedbackData.filter(f => f.sentiment === 'positive').length,
        feedbackData.filter(f => f.sentiment === 'neutral').length,
        feedbackData.filter(f => f.sentiment === 'negative').length,
      ],
      backgroundColor: ['#4caf50', '#fabb05', '#ff6b6b'],
    }],
  };

  const sources = [...new Set(feedbackData.map(f => f.source || 'Unknown'))];
  const sourceColors = ['#00b7eb', '#ff6b6b', '#4caf50'];
  const sourceData = {
    labels: sources,
    datasets: [{
      data: sources.map(src => feedbackData.filter(f => (f.source || 'Unknown') === src).length),
      backgroundColor: sourceColors.slice(0, sources.length),
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
        </div>
      )}
    </section>
  );
};

AnalyticsSection.propTypes = {
  feedbackData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default AnalyticsSection;