import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../assets/css/Dashboard.module.css';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom'; 
import Loader from '../components/Loader';
import Logo from '../assets/logo.png';
import ExportPDFButton from '../components/ExportPDFButton';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    toast.error('An error occurred while rendering the dashboard. Please try again later.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorMessage}>
          <i className="fas fa-exclamation-circle"></i>
          <p>An error occurred while rendering the dashboard. Please try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Header Component
const Header = ({ userName, userRole, date, onLogout }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
  };

  return (
    <>
      {isLoggingOut && <Loader />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <img src={Logo} alt="Hospital Logo" className={styles.logoImage} />
            </div>
            <div className={styles.titleContainer}>
              <h1 className={styles.mainTitle}>Quality Assurance Dashboard</h1>
              <p className={styles.subTitle}>Patient & Staff Feedback Analysis</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <i className="fas fa-user-shield"></i>
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userRole}>{userRole}</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.headerButton} ${styles.logoutButton}`}
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Logging Out
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.dateIndicator}>
          <i className="fas fa-calendar-alt"></i>
          <span>{date}</span>
        </div>
      </header>
    </>
  );
};

Header.propTypes = {
  userName: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

// Metric Card Component
const MetricCard = ({ title, value, icon, variant }) => {
  const variantKey = `metricCard${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
  return (
    <div className={`${styles.metricCard} ${styles[variantKey]}`}>
      <div className={styles.metricIcon}>
        <i className={icon}></i>
      </div>
      <div className={styles.metricContent}>
        <h3>{title}</h3>
        <p className={styles.metricValue}>{value}</p>
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
};

// Analytics Section Component
const AnalyticsSection = ({ feedbackData }) => {
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

// Filter Section Component
const FilterSection = ({
  filters,
  setFilters,
  timeFilter,
  setTimeFilter,
  handleClearFilters,
  handleRefresh,
  searchId,
  setSearchId,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  loading,
  departments,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  handleBulkSpam,
  handleBulkGenerateReport,
  handleBulkRestore,
  filteredFeedback,
  prepareRawFeedbackForDisplay,
}) => {
  const hasActiveFilters = Object.keys(filters).some(
    key => ['status', 'sentiment', 'source', 'urgent', 'feedbackType', 'rating', 'impactSeverity', 'department'].includes(key) && filters[key] !== 'all'
  );

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept, label: dept })),
    { value: 'others', label: 'Others' }
  ];

  const feedbackTypeOptions = filters.source === 'staff' ? [
    { value: 'all', label: 'All Feedback Types' },
    { value: 'operational', label: 'Operational Issue' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'improvement', label: 'Improvement Suggestion' },
    { value: 'recognition', label: 'Recognition' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'other', label: 'Other' },
  ] : ['patient', 'visitor', 'family'].includes(filters.source) ? [
    { value: 'all', label: 'All Feedback Types' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'compliment', label: 'Compliment' },
    { value: 'other', label: 'Other' },
  ] : [];

  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '1', label: '1 Star' },
    { value: '2', label: '2 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '5', label: '5 Stars' },
  ];

  const impactSeverityOptions = filters.feedbackType === 'recognition' ? [
    { value: 'all', label: 'All Severities' },
    { value: 'none', label: 'None' },
  ] : [
    { value: 'all', label: 'All Severities' },
    { value: 'minor', label: 'Minor' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <section className={styles.feedbackInboxSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionHeading}>Feedback Management</h2>
        <div className={styles.timeFilterContainer}>
          <div className={styles.timeFilter}>
            {['all', 'today', 'week', 'month', 'quarter'].map(filter => (
              <span
                key={filter}
                className={timeFilter === filter ? styles.activeFilter : ''}
                onClick={() => {
                  setTimeFilter(filter);
                  setFilters(prev => ({ ...prev, currentPage: 1 }));
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </span>
            ))}
          </div>
          <button
            className={`${styles.advancedFilterButton} ${timeFilter === 'custom' ? styles.activeFilter : ''}`}
            onClick={() => setTimeFilter(timeFilter === 'custom' ? 'all' : 'custom')}
          >
            <i className="fas fa-calendar-alt"></i> Advanced
          </button>
        </div>
      </div>
      
      {timeFilter === 'custom' && (
        <div className={styles.customDateRange}>
          <div className={styles.datePickerGroup}>
            <label>From:</label>
            <DatePicker
              selected={customStartDate}
              onChange={date => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              className={styles.datePicker}
            />
          </div>
          <div className={styles.datePickerGroup}>
            <label>To:</label>
            <DatePicker
              selected={customEndDate}
              onChange={date => setCustomEndDate(date)}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate}
              className={styles.datePicker}
            />
          </div>
        </div>
      )}

      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="filterStatus">Status</label>
          <select
            id="filterStatus"
            className={styles.filterSelect}
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value, currentPage: 1 })}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="escalated">Escalated</option>
            <option value="spam">Spam</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="filterSentiment">Sentiment</label>
          <select
            id="filterSentiment"
            className={styles.filterSelect}
            value={filters.sentiment}
            onChange={e => setFilters({ ...filters, sentiment: e.target.value, currentPage: 1 })}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="filterSource">Source</label>
          <select
            id="filterSource"
            className={styles.filterSelect}
            value={filters.source}
            onChange={e => setFilters({ ...filters, source: e.target.value, feedbackType: 'all', rating: 'all', impactSeverity: 'all', currentPage: 1 })}
          >
            <option value="all">All Sources</option>
            <option value="patient">Patient</option>
            <option value="staff">Staff</option>
            <option value="visitor">Visitor/Family Member/Caregiver</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="filterUrgent">Urgency</label>
          <select
            id="filterUrgent"
            className={styles.filterSelect}
            value={filters.urgent}
            onChange={e => setFilters({ ...filters, urgent: e.target.value, currentPage: 1 })}
          >
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="non-urgent">Non-Urgent</option>
          </select>
        </div>
        {filters.source !== 'all' && feedbackTypeOptions.length > 0 && (
          <div className={styles.filterGroup}>
            <label htmlFor="filterFeedbackType">
              {filters.source === 'staff' ? 'Staff Feedback Type' : 'External Feedback Type'}
            </label>
            <select
              id="filterFeedbackType"
              className={styles.filterSelect}
              value={filters.feedbackType}
              onChange={e => setFilters({ ...filters, feedbackType: e.target.value, impactSeverity: e.target.value === 'recognition' ? 'none' : 'all', currentPage: 1 })}
              aria-label={filters.source === 'staff' ? 'Staff Feedback Type' : 'External Feedback Type'}
            >
              {feedbackTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {['patient', 'visitor', 'family'].includes(filters.source) && (
          <div className={styles.filterGroup}>
            <label htmlFor="filterRating">Rating</label>
            <select
              id="filterRating"
              className={styles.filterSelect}
              value={filters.rating || 'all'}
              onChange={e => setFilters({ ...filters, rating: e.target.value, currentPage: 1 })}
              aria-label="Rating"
            >
              {ratingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {filters.source === 'staff' && (
          <div className={styles.filterGroup}>
            <label htmlFor="filterImpactSeverity">Impact Severity</label>
            <select
              id="filterImpactSeverity"
              className={styles.filterSelect}
              value={filters.impactSeverity || 'all'}
              onChange={e => setFilters({ ...filters, impactSeverity: e.target.value, currentPage: 1 })}
              aria-label="Impact Severity"
            >
              {impactSeverityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.filterGroup}>
          <label htmlFor="filterDepartment">Department</label>
          <select
            id="filterDepartment"
            className={styles.filterSelect}
            value={filters.department || 'all'}
            onChange={e => setFilters({ ...filters, department: e.target.value, currentPage: 1 })}
            aria-label="Department"
          >
            {departmentOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.filterSummary}>
        Active Filters:
        {filters.status !== 'all' ? ` Status: ${filters.status},` : ''}
        {filters.sentiment !== 'all' ? ` Sentiment: ${filters.sentiment},` : ''}
        {filters.source !== 'all' ? ` Source: ${filters.source},` : ''}
        {filters.urgent !== 'all' ? ` Urgency: ${filters.urgent},` : ''}
        {filters.feedbackType !== 'all' ? ` Feedback Type: ${filters.feedbackType},` : ''}
        {filters.rating !== 'all' ? ` Rating: ${filters.rating} Star${filters.rating !== '1' ? 's' : ''},` : ''}
        {filters.impactSeverity !== 'all' ? ` Impact Severity: ${filters.impactSeverity},` : ''}
        {filters.department !== 'all' ? ` Department: ${filters.department},` : ''}
        {!Object.values(filters).some(f => f !== 'all') ? ' None' : ''}
      </div>
      <div className={styles.filterActions}>
        <div className={styles.searchContainer}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search Feedback IDs"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterButtons}>
          {selectedFeedbackIds.length > 0 && (
            <div className={styles.bulkActions}>
              <button
                className={`${styles.actionButton} ${styles.createReportButton}`}
                onClick={handleBulkGenerateReport}
              >
                <i className="fas fa-pen-alt"></i> Create Formal Report ({selectedFeedbackIds.length})
              </button>
              <button
                className={`${styles.actionButton} ${styles.tagSpamButton}`}
                onClick={handleBulkSpam}
              >
                <i className="fas fa-exclamation-circle"></i> Tag as Spam ({selectedFeedbackIds.length})
              </button>
              <button
                className={`${styles.actionButton} ${styles.removeSpamButton}`}
                onClick={handleBulkRestore}
              >
                <i className="fas fa-undo"></i> Restore ({selectedFeedbackIds.length})
              </button>
            </div>
          )}
          {hasActiveFilters && (
            <button className={`${styles.actionButton} ${styles.clearFilterButton}`} onClick={handleClearFilters}>
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.refreshButton}`}
            onClick={handleRefresh}
            disabled={loading} // Disable button during loading
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Refreshing...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt"></i> Refresh Feedback
              </>
            )}
          </button>
          <ExportPDFButton
            data={filteredFeedback} // Pass complete dataset
            initialSelectedIds={selectedFeedbackIds}
            dashboardType="qa"
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            variant="primary" // optional: default, primary, secondary, outline
            size="medium" // optional: small, medium, large
          />
        </div>
      </div>
    </section>
  );
};

FilterSection.propTypes = {
  filters: PropTypes.shape({
    status: PropTypes.string,
    sentiment: PropTypes.string,
    source: PropTypes.string,
    urgent: PropTypes.string,
    feedbackType: PropTypes.string,
    rating: PropTypes.string,
    impactSeverity: PropTypes.string,
    department: PropTypes.string,
    currentPage: PropTypes.number,
  }).isRequired,
  setFilters: PropTypes.func.isRequired,
  timeFilter: PropTypes.string.isRequired,
  setTimeFilter: PropTypes.func.isRequired,
  handleClearFilters: PropTypes.func.isRequired,
  handleRefresh: PropTypes.func.isRequired,
  searchId: PropTypes.string.isRequired,
  setSearchId: PropTypes.func.isRequired,
  customStartDate: PropTypes.instanceOf(Date),
  setCustomStartDate: PropTypes.func.isRequired,
  customEndDate: PropTypes.instanceOf(Date),
  setCustomEndDate: PropTypes.func.isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedFeedbackIds: PropTypes.func.isRequired,
  handleBulkSpam: PropTypes.func.isRequired,
  handleBulkRestore: PropTypes.func.isRequired,
  handleOpenBulkReportModal: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  filteredFeedback: PropTypes.array.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
};

// Audit Trail Modal Component
const AuditTrailModal = ({ feedback, onClose, prepareRawFeedbackForDisplay }) => {
  const [latestFeedback, setLatestFeedback] = React.useState(feedback);

  React.useEffect(() => {
    const fetchLatestFeedback = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/feedback/${feedback.id}`);
        if (!response.ok) throw new Error('Failed to fetch latest feedback');
        const updated = await response.json();
        console.log(`[AuditTrailModal] Fetched latest feedback for ${feedback.id}:`, {
          id: updated.id,
          reportDetails: updated.reportDetails,
          reportCreatedAt: updated.reportCreatedAt,
          status: updated.status,
          department: updated.department,
          actionHistory: updated.actionHistory,
        });
        setLatestFeedback(updated);
      } catch (err) {
        toast.error(`Failed to load latest feedback: ${err.message}`);
        console.error('Error fetching latest feedback:', err);
      }
    };
    fetchLatestFeedback();
  }, [feedback.id]);

  // Use actionHistory from the database, with a fallback for initial submission
  const auditTrail = [
    {
      timestamp: new Date(latestFeedback.date),
      action: 'Feedback Submitted',
      user: latestFeedback.isAnonymous ? 'Anonymous' : latestFeedback.email || 'Unknown',
      details: `Feedback ID: ${latestFeedback.id}`,
    },
    ...(latestFeedback.actionHistory || [])
      .filter(entry => [
        'Tagged as Spam',
        'Restored',
        'Report Assigned',
        'Escalated'
      ].includes(entry.action))
      .map(entry => ({
        timestamp: new Date(entry.timestamp),
        action: entry.action,
        user: entry.user,
        details: entry.details,
      })),
  ];

  const feedbackDetails = prepareRawFeedbackForDisplay(latestFeedback);
  delete feedbackDetails['Status'];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Audit Trail for Feedback (ID: {latestFeedback.id.toUpperCase()})</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-history"></i> Action History</h3>
            <div className={styles.auditTableWrapper}>
              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((entry, index) => (
                    <tr key={index}>
                      <td>{entry.timestamp.toLocaleString()}</td>
                      <td>{entry.action}</td>
                      <td>{entry.user}</td>
                      <td>{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-comment-dots"></i> Feedback Details</h3>
            <div className={styles.detailGrid}>
              {Object.entries(feedbackDetails).map(([key, value]) => (
                <div className={styles.detailItem} key={key}>
                  <div className={styles.detailLabel}>{key}</div>
                  <div className={styles.detailValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
            <p className={styles.descriptionText}>{latestFeedback.description}</p>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
            <p className={styles.descriptionText}>
              {latestFeedback.reportDetails || 'No report details available.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

AuditTrailModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
};

// Feedback Table Component
const FeedbackTable = ({
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  handleTagAsSpam,
  handleRestore, // Add new prop
  reportStates,
  setHasGenerated,
  setReportViewed,
  handleViewGeneratedReport,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  handleViewHistory,
}) => {
  const selectAllRef = useRef(null);

  const handleSelectFeedback = (id) => {
    setSelectedFeedbackIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };
  
  useEffect(() => {
    if (selectAllRef.current) {
      const selectableIds = feedback
        .filter(f => f.status !== 'assigned' && f.status !== 'escalated')
        .map(f => f.id);

      const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedFeedbackIds.includes(id));
      const noneSelected = selectableIds.every(id => !selectedFeedbackIds.includes(id));

      // Don't manually set `checked`, let it be controlled
      selectAllRef.current.indeterminate = !allSelected && !noneSelected;
    }
  }, [selectedFeedbackIds, feedback]);

  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
            <th>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={
                feedback.length > 0 &&
                feedback
                  .filter(f => f.status !== 'assigned' && f.status !== 'escalated')
                  .every(f => selectedFeedbackIds.includes(f.id))
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedFeedbackIds(
                    feedback
                      .filter(f => f.status !== 'assigned' && f.status !== 'escalated')
                      .map(f => f.id)
                  );
                } else {
                  setSelectedFeedbackIds([]);
                }
              }}
            />
            </th>
            <th>ID</th>
            <th>Date</th>
            <th>Source</th>
            <th>Department</th>
            <th>Summary</th>
            <th>Sentiment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feedback.length > 0 ? feedback.map((item) => {
            const isGenerating = reportStates[item.id]?.isGenerating || false;
            const hasGenerated = reportStates[item.id]?.hasGenerated || false;
            const reportViewed = reportStates[item.id]?.reportViewed || false;
            const isSpam = item.status === 'spam';
            const isLocked = item.status === 'assigned' || item.status === 'escalated';

            let buttonClass = styles.viewDetailsButton;
            let buttonText = 'View';
            let buttonIcon = 'fa-eye';

            if (!isSpam) {
              if (isGenerating) {
                buttonClass = styles.viewGeneratingButton;
                buttonText = 'Generating...';
                buttonIcon = 'fa-spinner fa-spin';
              } else if (hasGenerated && !reportViewed && !isLocked) {
                buttonClass = styles.viewReportButton;
                buttonText = 'Generated';
                buttonIcon = null;
              }
            }

            return (
              <tr key={item.id || `temp-${Math.random()}`} className={styles.feedbackRow}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedFeedbackIds.includes(item.id)}
                    onChange={() => handleSelectFeedback(item.id)}
                    disabled={isLocked}
                  />
                </td>
                <td>{item.id?.toUpperCase() || 'N/A'}</td>
                <td>
                  <div className={styles.dateCell}>
                    <span className={styles.dateDay}>
                      {item.date ? new Date(item.date).getDate() : 'N/A'}
                    </span>
                    <span className={styles.dateMonthYear}>
                      {item.date
                        ? new Date(item.date).toLocaleString('default', { month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className={styles.sourceCell}>
                    <span className={styles.sourceIcon}>
                      {item.source === 'patient' && <i className="fas fa-user-injured"></i>}
                      {item.source === 'staff' && <i className="fas fa-user-md"></i>}
                      {item.source === 'visitor' && <i className="fas fa-user-friends"></i>}
                      {item.source === 'family' && <i className="fas fa-user-friends"></i>}
                      {(!item.source || item.source === 'unknown') && <i className="fas fa-question-circle"></i>}
                    </span>
                    <span className={styles.sourceLabel}>
                      {item.source && item.source !== 'unknown'
                        ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
                        : 'Unknown'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className={styles.departmentCell}>
                    <span className={styles.departmentIcon}>
                      <i className="fas fa-hospital-alt"></i>
                    </span>
                    <span>{item.department || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.summaryCell}>
                    <div className={styles.summaryText} title={item.description || ''}>
                      {item.description
                        ? item.description.substring(0, 70) + (item.description.length > 70 ? '...' : '')
                        : 'No description'}
                    </div>
                    {item.urgent && <span className={styles.urgentFlag}><i className="fas fa-bolt"></i> Urgent</span>}
                  </div>
                </td>
                <td>
                  <div className={`${styles.sentimentTagBase} ${getSentimentModifierClass(item.sentiment, item.sentiment_status)}`}>
                    <span className={styles.sentimentIcon}>
                      {item.sentiment === 'positive' && <i className="fas fa-smile"></i>}
                      {item.sentiment === 'neutral' && <i className="fas fa-meh"></i>}
                      {item.sentiment === 'negative' && <i className="fas fa-frown"></i>}
                      {item.sentiment == null && item.sentiment_status === 'pending' && <i className="fas fa-hourglass-half"></i>}
                      {item.sentiment == null && item.sentiment_status === 'failed' && <i className="fas fa-exclamation-triangle"></i>}
                    </span>
                    <span>
                      {item.sentiment
                        ? item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)
                        : item.sentiment_status === 'failed'
                          ? 'Failed'
                          : 'Pending'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className={`${styles.statusTagBase} ${getStatusModifierClass(item.status)}`}>
                    {typeof item.status === 'string' && item.status
                      ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                      : 'Pending'}
                  </div>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    {isLocked ? (
                      <button
                        title="View History"
                        className={styles.moreActionsButton}
                        onClick={() => handleViewHistory(item)}
                      >
                        <i className="fas fa-history"></i> History
                      </button>
                    ) : isSpam ? (
                      <button
                        title="Restore"
                        className={`${styles.moreActionsButton} ${styles.removeSpamButton}`}
                        onClick={() => handleRestore(item)} // Use handleRestore instead of handleTagAsSpam
                      >
                        <i className="fas fa-undo"></i> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          title={buttonText}
                          className={buttonClass}
                          onClick={() =>
                            hasGenerated && !reportViewed
                              ? handleViewGeneratedReport(item)
                              : handleViewDetails(item)
                          }
                          disabled={isGenerating || isSpam}
                        >
                          {buttonIcon && <i className={`fas ${buttonIcon}`}></i>} {buttonText}
                        </button>
                        <button
                          title="Tag as Spam"
                          className={`${styles.moreActionsButton} ${styles.tagSpamButton}`}
                          onClick={() => handleTagAsSpam(item)}
                          disabled={isSpam}
                        >
                          <i className="fas fa-exclamation-circle"></i> Spam
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan="9" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No feedback entries match your current filters or failed to load.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

FeedbackTable.propTypes = {
  feedback: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleViewDetails: PropTypes.func.isRequired,
  getSentimentModifierClass: PropTypes.func.isRequired,
  getStatusModifierClass: PropTypes.func.isRequired,
  handleTagAsSpam: PropTypes.func.isRequired,
  handleRestore: PropTypes.func.isRequired, // Add prop type for handleRestore
  reportStates: PropTypes.object.isRequired,
  setHasGenerated: PropTypes.func.isRequired,
  setReportViewed: PropTypes.func.isRequired,
  handleViewGeneratedReport: PropTypes.func.isRequired,
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedFeedbackIds: PropTypes.func.isRequired,
  handleViewHistory: PropTypes.func.isRequired,
};

// Feedback Modal Component
const FeedbackModal = ({ feedback, onClose, onCreateReport, prepareRawFeedbackForDisplay, updateSentiment, handleViewHistory }) => {
  const [newSentiment, setNewSentiment] = useState(feedback.sentiment);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (newSentiment === feedback.sentiment) {
      console.log('No changes to save for sentiment.');
      return;
    }

    if (feedback.status === 'spam') {
      toast.error('Cannot update sentiment for spam feedback. Restore to unassigned first.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        sentiment: newSentiment,
        sentiment_status: 'completed',
      };

      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update feedback');
      }

      updateSentiment(feedback.id, newSentiment);
      toast.success('Sentiment updated successfully!', {
        autoClose: 2000
      });
    } catch (error) {
      console.error(`Failed to update feedback: ${error.message}`);
      toast.error(`Failed to update sentiment: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
            <p className={styles.descriptionText}>{feedback.description}</p>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-comment-dots"></i> Feedback Details</h3>
            <div className={styles.detailGrid}>
              {Object.entries(feedbackDetails).map(([key, value]) => (
                <div className={styles.detailItem} key={key}>
                  <div className={styles.detailLabel}>{key}</div>
                  <div className={styles.detailValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-smile"></i> Update Sentiment</h3>
            <div className={styles.detailValue}>
              <select
                value={newSentiment || ''}
                onChange={e => setNewSentiment(e.target.value)}
                className={styles.actionSelect}
                disabled={feedback.status === 'spam'}
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>s
                <option value="negative">Negative</option>
              </select>
              <button
                className={`${styles.actionButton} ${styles.saveSentimentButton}`}
                onClick={handleSave}
                disabled={isSaving || newSentiment === feedback.sentiment || feedback.status === 'spam'}
              >
                <i className="fas fa-save"></i> Save Changes
              </button>
            </div>
          </div>
          <div className={styles.modalActions}>
            {feedback.status !== 'assigned' ? (
              <button
                className={`${styles.actionButton} ${styles.createReportButton}`}
                onClick={onCreateReport}
                disabled={feedback.status === 'spam'}
              >
                <i className="fas fa-pen-alt"></i> Create Formal Report
              </button>
            ) : (
              <button
                className={`${styles.actionButton} ${styles.viewReportButton}`}
                onClick={onCreateReport}
              >
                <i className="fas fa-eye"></i> View Formal Report
              </button>
            )}
            {feedback.status === 'assigned' && (
              <button
                className={`${styles.actionButton} ${styles.viewReportButton}`}
                onClick={() => handleViewHistory(feedback)}
              >
                <i className="fas fa-history"></i> View History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreateReport: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  updateSentiment: PropTypes.func.isRequired,
  handleViewHistory: PropTypes.func.isRequired,
};

// Report Modal Component
const ReportModal = ({
  feedback,
  departments,
  onClose,
  onGenerateReport,
  onEscalate,
  reportContent,
  setReportContent,
  reportDepartment,
  setReportDepartment,
  prepareRawFeedbackForDisplay,
  isGenerating,
  setIsGenerating,
  hasGenerated,
  setHasGenerated,
}) => {
  const handleEscalateToAdmin = () => {
    onEscalate(feedback.id, reportContent, reportDepartment);
  };

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const isCurrentlyGenerating = isGenerating[feedback.id]?.isGenerating;
  const hasAlreadyGenerated = hasGenerated[feedback.id]?.hasGenerated;

  const handleCancel = () => {
    // Check if there is content or an ongoing generation
    const hasContent = reportContent && reportContent.trim().length > 0;
    
    if (isCurrentlyGenerating || hasContent) {
      let message = 'Report generation stopped';
      if (isCurrentlyGenerating && hasContent) {
        message = 'Report generation stopped and input text cleared.';
      } else if (hasContent) {
        message = 'Input text cleared.';
      }
      toast.warn(message, {
        autoClose: 2000
      });
    } else {
      toast.info('Report creation canceled.', {
        autoClose: 2000
      });
    }

    // Abort any ongoing generation
    if (isCurrentlyGenerating) {
      isGenerating[feedback.id]?.abortController?.abort();
    }

    // Clear the report content and department
    setReportContent(feedback.id, '');
    setIsGenerating(feedback.id, false);
    setHasGenerated(feedback.id, false);

    // Call onClose with true to indicate cancellation
    onClose(true);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Report for Feedback (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={() => onClose(false)} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          {feedback.status === 'assigned' || feedback.status === 'escalated' ? (
            <>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-clipboard-list"></i> Original Feedback Data</h3>
                <div className={styles.detailGrid}>
                  {Object.entries(feedbackDetails).map(([key, value]) => (
                    <div className={styles.detailItem} key={key}>
                      <div className={styles.detailLabel}>{key}</div>
                      <div className={styles.detailValue}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
                <p className={styles.descriptionText}>{feedback.description}</p>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
                <pre className={styles.readonlyText}>
                  {reportContent || 'No report content available.'}
                </pre>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-hospital-user"></i> Assigned Department</h3>
                <p className={styles.descriptionText}>{feedback.department || 'Unknown'}</p>
              </div>
            </>
          ) : (
            <>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-clipboard-list"></i> Original Feedback Data</h3>
                <div className={styles.detailGrid}>
                  {Object.entries(feedbackDetails).map(([key, value]) => (
                    <div className={styles.detailItem} key={key}>
                      <div className={styles.detailLabel}>{key}</div>
                      <div className={styles.detailValue}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
                <p className={styles.descriptionText}>{feedback.description}</p>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="reportContent" className={styles.inputLabel}>
                  Report Details <span className={styles.requiredField}>*</span>
                </label>
                <textarea
                  id="reportContent"
                  className={styles.noteTextarea}
                  value={reportContent}
                  onChange={e => setReportContent(feedback.id, e.target.value)}
                  placeholder="Summarize the feedback and identify key concerns or themes...
Conduct a root cause analysis to explain why the issue occurred...
Provide clear, targeted, and actionable recommendations for the department to address the issue..."
                  rows="8"
                  required
                  disabled={feedback.status === 'spam'}
                />
                <button
                  className={`${styles.actionButton} ${styles.generateReportButton}`}
                  onClick={async () => {
                    if (!feedback.description || !feedback.sentiment) {
                      console.warn("Missing feedback description or sentiment.");
                      toast.error('Missing feedback description or sentiment.');
                      return;
                    }
                    if (!reportDepartment) {
                      toast.error('Please select a department before generating the report.');
                      return;
                    }
                    if (feedback.status === 'spam') {
                      toast.error('Cannot generate report for spam feedback. Restore to unassigned first.');
                      return;
                    }

                    const controller = new AbortController();
                    setIsGenerating(feedback.id, true, controller);
                    toast.info('Generating report...', {
                      autoClose: 1000
                    });
                    try {
                      const response = await fetch(`${BASE_URL}/api/generate-report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          description: feedback.description,
                          sentiment: feedback.sentiment,
                          variant: hasAlreadyGenerated ? 'retry' : 'default',
                          ratings: feedback.rating || null,
                          impact_severity: feedback.impactSeverity || null,
                          feedback_type: feedback.feedbackType || null,
                          department: feedback.department || null,
                        }),
                        signal: controller.signal,
                      });

                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Unknown error');

                      setReportContent(feedback.id, data.report);
                      setHasGenerated(feedback.id, true);
                      toast.success('Report generated successfully!', {
                        autoClose: 2000
                      });
                    } catch (err) {
                      if (err.name === 'AbortError') {
                        toast.warn('Report generation aborted.');
                        return;
                      }
                      console.error('Error generating report:', err.message);
                      toast.error(`Error generating report: ${err.message}`);
                    } finally {
                      setIsGenerating(feedback.id, false);
                    }
                  }}
                  disabled={isCurrentlyGenerating || feedback.status === 'spam'}
                >
                  {isCurrentlyGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Generating
                    </>
                  ) : hasAlreadyGenerated ? (
                    <>
                      <i className="fas fa-redo"></i> Generate Again
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i> Generate Automatic Report
                    </>
                  )}
                </button>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="reportDepartment" className={styles.inputLabel}>
                  Assign to Department <span className={styles.requiredField}>*</span>
                </label>
                <select
                  id="reportDepartment"
                  className={styles.actionSelect}
                  value={reportDepartment}
                  onChange={e => setReportDepartment(feedback.id, e.target.value)}
                  required
                  disabled={feedback.status === 'spam'}
                >
                  <option value="">Select Department for Report</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.actionButton} ${styles.confirmButton}`}
                  onClick={() => onGenerateReport(feedback.id, reportContent, reportDepartment)}
                  disabled={
                    !reportContent ||
                    !reportDepartment ||
                    reportDepartment === '' ||
                    !departments.includes(reportDepartment) || 
                    feedback.status === 'spam'
                  }
                >
                  <i className="fas fa-paper-plane"></i> Send Report
                </button>
                <button
                  className={`${styles.actionButton} ${styles.escalateButton}`}
                  onClick={handleEscalateToAdmin}
                  disabled={feedback.status === 'spam' || !reportContent.trim()}
                >
                  <i className="fas fa-exclamation-triangle"></i> Escalate to Admin
                </button>
                <button
                  className={`${styles.actionButton} ${styles.cancelButton}`}
                  onClick={handleCancel}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ReportModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onGenerateReport: PropTypes.func.isRequired,
  onEscalate: PropTypes.func.isRequired,
  reportContent: PropTypes.string.isRequired,
  setReportContent: PropTypes.func.isRequired,
  reportDepartment: PropTypes.string.isRequired,
  setReportDepartment: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  isGenerating: PropTypes.object.isRequired,
  setIsGenerating: PropTypes.func.isRequired,
  hasGenerated: PropTypes.object.isRequired,
  setHasGenerated: PropTypes.func.isRequired,
};

// New BulkReportModal Component
const BulkReportModal = ({
  selectedFeedbackIds,
  departments,
  onClose,
  onBulkGenerateReport,
  onBulkEscalate,
  reportContent,
  setReportContent,
  reportDepartment,
  setReportDepartment,
}) => {
  const handleEscalateToAdmin = () => {
    onBulkEscalate();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Bulk Report for {selectedFeedbackIds.length} Feedback Items</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label htmlFor="bulkReportContent" className={styles.inputLabel}>
              Report Details <span className={styles.requiredField}>*</span>
            </label>
            <textarea
              id="bulkReportContent"
              className={styles.noteTextarea}
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
              placeholder="Summarize the common themes and concerns across selected feedback items...
Provide clear, targeted, and actionable recommendations for the department to address these issues..."
              rows="10"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="bulkReportDepartment" className={styles.inputLabel}>
              Assign to Department <span className={styles.requiredField}>*</span>
            </label>
            <select
              id="bulkReportDepartment"
              className={styles.actionSelect}
              value={reportDepartment}
              onChange={e => setReportDepartment(e.target.value)}
              required
            >
              <option value="">Select Department for Report</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className={styles.modalActions}>
            <button
              className={`${styles.actionButton} ${styles.confirmButton}`}
              onClick={onBulkGenerateReport}
              disabled={!reportContent || !reportDepartment}
            >
              <i className="fas fa-paper-plane"></i> Send Report
            </button>
            <button
              className={`${styles.actionButton} ${styles.escalateButton}`}
              onClick={handleEscalateToAdmin}
              disabled={!reportContent.trim()}
            >
              <i className="fas fa-exclamation-triangle"></i> Escalate to Admin
            </button>
            <button
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={onClose}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

BulkReportModal.propTypes = {
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkGenerateReport: PropTypes.func.isRequired,
  onBulkEscalate: PropTypes.func.isRequired,
  reportContent: PropTypes.string.isRequired,
  setReportContent: PropTypes.func.isRequired,
  reportDepartment: PropTypes.string.isRequired,
  setReportDepartment: PropTypes.func.isRequired,
};


// Main Dashboard Component
const QADashboard = () => {

  const navigate = useNavigate();
  const sessionId = sessionStorage.getItem('current_qa_session');
  const user = JSON.parse(localStorage.getItem(`qa_user_session_${sessionId}`)) || {
    name: 'Unknown',
    role: 'Unknown',
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem(`qa_user_session_${sessionId}`);
      sessionStorage.removeItem('current_qa_session');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error.message);
      setError('Failed to logout. Please try again.');
    }
  };

  const [feedbackData, setFeedbackData] = useState([]);
  const [tabId] = useState(uuidv4());
  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBulkReportModalOpen, setIsBulkReportModalOpen] = useState(false);
  const [isAuditTrailModalOpen, setIsAuditTrailModalOpen] = useState(false);
  const [reportStates, setReportStates] = useState({});
  const [timeFilter, setTimeFilter] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all',
    sentiment: 'all',
    source: 'all',
    urgent: 'all',
    feedbackType: 'all',
    rating: 'all',
    impactSeverity: 'all',
    department: 'all',
    currentPage: 1,
  });
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [bulkReportContent, setBulkReportContent] = useState('');
  const [bulkReportDepartment, setBulkReportDepartment] = useState('');
  const broadcastChannelRef = useRef(null);
  const processedEventsRef = useRef(new Set());

  const departmentsForAssignment = [
    'General Feedback',
    'Anesthesiology',
    'Cardiology',
    'Dermatology',
    'Internal Medicine',
    'Obstetrics and Gynecology (OB-GYNE)',
    'Pediatrics',
    'Radiology',
    'Rehabilitation Medicine',
    'Surgery',
    'Pathology',
    'Urology',
    'Nephrology',
    'Orthopedics',
    'Ophthalmology',
    'ENT (Ear, Nose, Throat)',
    'Family Medicine',
    'BESTHEALTH',
    'Dental Clinic',
    'Diagnostics',
    'Dietary',
    'Emergency Room (ER)',
    'Hemodialysis',
    'Intensive Care Unit (ICU)',
    'Inpatient Department',
    'Neonatal ICU (NICU)',
    'Nursing Service',
    'Operating Room',
    'Outpatient Department',
    'Pharmacy',
    'Physical Therapy'
  ];

  const socket = io(BASE_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,
  });

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.sentiment !== 'all') queryParams.append('sentiment', filters.sentiment);
      if (filters.source !== 'all') queryParams.append('source', filters.source);
      if (filters.urgent === 'urgent') queryParams.append('urgent', 'true');
      if (filters.urgent === 'non-urgent') queryParams.append('urgent', 'false');
      if (filters.feedbackType !== 'all') queryParams.append('feedbackType', filters.feedbackType);
      if (filters.rating !== 'all') queryParams.append('rating', filters.rating);
      if (filters.impactSeverity !== 'all') queryParams.append('impactSeverity', filters.impactSeverity);
      if (filters.department !== 'all' && filters.department !== 'others') queryParams.append('department', filters.department);

      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate;
        switch (timeFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
          default:
            startDate = null;
        }
        if (startDate) {
          queryParams.append('startDate', startDate.toISOString());
        }
      }

      const response = await fetch(`${BASE_URL}/api/feedback/all?${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch feedback`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Received invalid feedback data');
      }

      const sortedData = data
        .map(item => ({ ...item, date: item.date || new Date().toISOString() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setFeedbackData(sortedData);
      setError(null);
    } catch (err) {
      setError(`Failed to load feedback: ${err.message}`);
      toast.error(`Failed to load feedback: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleBroadcastMessage = useCallback((event) => {
    const { feedbackIds, actionType, tabId: originTabId } = event.data;

    if (originTabId === tabId) return;

    const eventKey = `${actionType}-${originTabId}-${feedbackIds.join(',')}`;
    if (processedEventsRef.current.has(eventKey)) return;
    processedEventsRef.current.add(eventKey);

    let shouldCloseIndividualModal = false;
    let shouldCloseBulkModal = false;
    let toastMessage = '';
    const idsSet = new Set(feedbackIds);
    const firstId = feedbackIds[0]?.toUpperCase();

    // 1. Update master data list using functional updates to avoid stale state
    setFeedbackData(prev =>
        prev.map(fb => {
            if (!idsSet.has(fb.id)) return fb;
            if (actionType === 'spam') return { ...fb, status: 'spam' };
            if (actionType === 'restore') return { ...fb, status: 'unassigned' };
            if (actionType === 'report') return { ...fb, status: 'assigned', dept_status: 'needs_action' };
            if (actionType === 'escalate') return { ...fb, status: 'escalated', dept_status: 'escalated' };
            return fb;
        })
    );

    // 2. Check if an individual modal is open and affected
    if (selectedFeedback && idsSet.has(selectedFeedback.id)) {
        if (isModalOpen || isReportModalOpen || isAuditTrailModalOpen) {
            shouldCloseIndividualModal = true;
            if (actionType === 'spam') toastMessage = `Feedback ${firstId} was marked as spam in another tab. Modal closed.`;
            else if (actionType === 'report') toastMessage = `Feedback ${firstId} was assigned in another tab. Modal closed.`;
            else if (actionType === 'escalate') toastMessage = `Feedback ${firstId} was escalated in another tab. Modal closed.`;
        }
    }

    // 3. Check if bulk selection/modal is affected
    const invalidatingActions = ['spam', 'report', 'escalate'];
    if (invalidatingActions.includes(actionType)) {
        // Read the current selected IDs from state
        const newSelectedIds = selectedFeedbackIds.filter(id => !idsSet.has(id));
        // If the selection has changed, update the state
        if (newSelectedIds.length < selectedFeedbackIds.length) {
            setSelectedFeedbackIds(newSelectedIds);
            // If the bulk modal was open and the selection is now empty, close it
            if (isBulkReportModalOpen && newSelectedIds.length === 0) {
                shouldCloseBulkModal = true;
                toastMessage = 'Bulk modal closed as all selected items were processed elsewhere.';
            }
        }
    }

    if (shouldCloseIndividualModal) {
        setIsModalOpen(false);
        setIsReportModalOpen(false);
        setIsAuditTrailModalOpen(false);
        setSelectedFeedback(null);
    }

    if (shouldCloseBulkModal) {
        setIsBulkReportModalOpen(false);
        setBulkReportContent('');
        setBulkReportDepartment('');
    }

    if (toastMessage) {
        toast.info(toastMessage);
    }

    // Clean up the processed event key after a delay
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);
  }, [
      tabId,
      selectedFeedback,
      isModalOpen,
      isReportModalOpen,
      isAuditTrailModalOpen,
      isBulkReportModalOpen,
      selectedFeedbackIds,
  ]);

  useEffect(() => {
    if (user.name.toLowerCase() === 'unknown') {
      toast.info('User not authenticated. Logging out.');
      handleLogout();
    }
  }, [user.name, handleLogout]);

  useEffect(() => {
    fetchFeedback();
  }, [filters, timeFilter]);

  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('feedback_updates');
    broadcastChannelRef.current.onmessage = handleBroadcastMessage;

    socket.connect();
    socket.on('connect', () => console.log('WebSocket connected:', socket.id));
    
    socket.on('feedbackUpdate', (updatedFeedback) => {
      if (!updatedFeedback || !updatedFeedback.id) {
        console.warn('Invalid feedbackUpdate data:', updatedFeedback);
        toast.error('Received invalid feedback update from server.');
        return;
      }

      setFeedbackData(prevData => {
        const normalizedFeedback = {
          ...updatedFeedback,
          date: updatedFeedback.date || new Date().toISOString(),
          reportCreatedAt: updatedFeedback.reportCreatedAt || null,
          actionHistory: updatedFeedback.actionHistory || [], // Include actionHistory
        };

        const index = prevData.findIndex(f => f.id === normalizedFeedback.id);
        const newData = index !== -1
          ? [...prevData.slice(0, index), { ...prevData[index], ...normalizedFeedback }, ...prevData.slice(index + 1)]
          : [normalizedFeedback, ...prevData];
        
        return Array.from(new Map(newData.map(f => [f.id, f])).values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    });

    socket.on('bulkFeedbackUpdate', () => {
      fetchFeedback();
      setSelectedFeedbackIds([]);
    });
    socket.on('connect_error', (err) => toast.error('Failed to connect to real-time updates. Retrying...'));
    socket.on('disconnect', () => console.log('WebSocket disconnected'));

    return () => {
      socket.off('connect');
      socket.off('feedbackUpdate');
      socket.off('bulkFeedbackUpdate');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
      broadcastChannelRef.current?.close();
      processedEventsRef.current.clear();
    };
  }, [handleBroadcastMessage]);

  const handleGenerateReport = async (feedbackId, reportContent, reportDepartment) => {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback || !reportContent || !reportDepartment) {
      toast.error('Missing required information to generate the report.');
      return;
    }
    if (feedback.status === 'spam') {
      toast.error('Cannot generate a report for spam feedback.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          dept_status: 'needs_action',
          department: reportDepartment,
          reportDetails: String(reportContent).trim(),
          reportCreatedAt: new Date().toISOString(),
          userName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update feedback');
      }
      const { feedback: updatedFeedback } = await response.json();
      socket.emit('feedbackUpdate', updatedFeedback);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedbackId],
          actionType: 'report',
          tabId
        });
      }

      toast.success('Report sent and feedback updated!', {
        autoClose: 2000
      });
      closeReportModal();
    } catch (error) {
      toast.error(`Failed to send report: ${error.message}`);
    }
  };

  const handleEscalate = async (feedbackId, reportContent, reportDepartment) => {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback || !reportContent) {
      toast.error('Missing required information to escalate.');
      return;
    }
    if (['spam', 'assigned', 'escalated'].includes(feedback.status)) {
      toast.error(`Cannot escalate feedback with status: ${feedback.status}.`);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/feedback/escalate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [feedbackId],
          department: reportDepartment,
          reportDetails: reportContent.trim(),
          userName: user.name, // Add user name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to escalate feedback');
      }

      const updated = {
        ...feedback,
        status: 'escalated',
        dept_status: 'escalated',
        department: reportDepartment,
        reportDetails: reportContent.trim(),
        reportCreatedAt: new Date().toISOString(),
      };

      setFeedbackData(prev =>
        prev.map(f => (f.id === feedbackId ? updated : f))
      );

      setReportStates(prev => {
        const newState = { ...prev };
        delete newState[feedbackId];
        return newState;
      });

      socket.emit('bulkFeedbackUpdate');

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedbackId],
          actionType: 'escalate',
          tabId
        });
      }

      toast.success('Feedback escalated to Admin!', {
        autoClose: 2000
      });
      closeReportModal();
    } catch (error) {
      toast.error(`Failed to escalate feedback: ${error.message}`);
    }
  };

  const handleTagAsSpam = async (feedback) => {
    if (!feedback?.id) return;
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'spam', userName: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to tag as spam');
      }
      const updatedFeedback = await response.json();
      socket.emit('feedbackUpdate', updatedFeedback);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedback.id],
          actionType: 'spam',
          tabId
        });
      }

      toast.success(`Feedback ${feedback.id.toUpperCase()} tagged as spam!`, {
        autoClose: 2000
      });
    } catch (error) {
      toast.error(`Failed to tag as spam: ${error.message}`);
    }
  };

  const handleRestore = async (feedback) => {
    if (!feedback?.id) return;
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unassigned', userName: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore feedback');
      }
      const updatedFeedback = await response.json();
      socket.emit('feedbackUpdate', updatedFeedback);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedback.id],
          actionType: 'restore',
          tabId
        });
      }

      toast.success(`Feedback ${feedback.id.toUpperCase()} restored!`, {
        autoClose: 2000
      });
    } catch (error) {
      toast.error(`Failed to restore feedback: ${error.message}`);
    }
  };

  const handleBulkSpam = async () => {
    const validIds = selectedFeedbackIds.filter(id => {
      const fb = feedbackData.find(f => f.id === id);
      return fb && fb.status !== 'assigned' && fb.status !== 'spam';
    });
    if (validIds.length === 0) {
      toast.warn('No valid items selected for this action.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/feedback/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: validIds, status: 'spam', userName: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk spam tagging failed');
      }

      socket.emit('bulkFeedbackUpdate');
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: validIds,
          actionType: 'spam',
          tabId
        });
      }

      setSelectedFeedbackIds(prev => prev.filter(id => !validIds.includes(id)));
      toast.success(`${validIds.length} feedback items tagged as spam!`, {
        autoClose: 2000
      });

      setFeedbackData(prev =>
        prev.map(f =>
          validIds.includes(f.id) ? { ...f, status: 'spam' } : f
        )
      );
      if (selectedFeedback && validIds.includes(selectedFeedback.id)) {
        setSelectedFeedback(prev => ({ ...prev, status: 'spam' }));
      }
    } catch (error) {
      toast.error(`Bulk spam action failed: ${error.message}`);
    }
  };
  
  const handleBulkRestore = async () => {
    const spamIds = selectedFeedbackIds.filter(id => {
      const fb = feedbackData.find(f => f.id === id);
      return fb && fb.status === 'spam';
    });
    if (spamIds.length === 0) {
      toast.warn('No spam items selected for restoration.');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: spamIds, status: 'unassigned', userName: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk restore failed');
      }

      socket.emit('bulkFeedbackUpdate');
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: spamIds,
          actionType: 'restore',
          tabId
        });
      }

      setSelectedFeedbackIds(prev => prev.filter(id => !spamIds.includes(id)));
      toast.success(`${spamIds.length} feedback items restored!`, {
        autoClose: 2000
      });

      setFeedbackData(prev =>
        prev.map(f =>
          spamIds.includes(f.id) ? { ...f, status: 'unassigned' } : f
        )
      );
      if (selectedFeedback && spamIds.includes(selectedFeedback.id)) {
        setSelectedFeedback(prev => ({ ...prev, status: 'unassigned' }));
      }
    } catch (error) {
      toast.error(`Bulk restore failed: ${error.message}`);
    }
  };

  const handleBulkGenerateReport = async () => {
    if (!bulkReportContent || !bulkReportDepartment) {
      toast.error('Please provide report details and select a department.');
      return;
    }
    const validIds = selectedFeedbackIds.filter(id => {
      const fb = feedbackData.find(f => f.id === id);
      return fb && fb.status !== 'assigned' && fb.status !== 'spam';
    });
    if (validIds.length === 0) {
      toast.error('No valid items selected for bulk report.');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/bulk-report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: validIds,
          department: bulkReportDepartment,
          reportDetails: bulkReportContent,
          dept_status: 'needs_action',
          userName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk report creation failed');
      }

      socket.emit('bulkFeedbackUpdate');
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: validIds,
          actionType: 'report',
          tabId
        });
      }

      toast.success(`Bulk report created and ${validIds.length} feedback items updated!`, {
        autoClose: 2000
      });

      setFeedbackData(prev =>
        prev.map(f =>
          validIds.includes(f.id)
            ? {
                ...f,
                status: 'assigned',
                dept_status: 'needs_action',
                department: bulkReportDepartment,
                reportDetails: bulkReportContent
              }
            : f
        )
      );
      if (selectedFeedback && validIds.includes(selectedFeedback.id)) {
        setSelectedFeedback(prev => ({
          ...prev,
          status: 'assigned',
          dept_status: 'needs_action',
          department: bulkReportDepartment,
          reportDetails: bulkReportContent
        }));
      }
    } catch (error) {
      toast.error(`Failed to create bulk report: ${error.message}`);
    }
  };

  const handleBulkEscalate = async () => {
    if (!bulkReportContent) {
      toast.error('Please provide report details to escalate.');
      return;
    }
    const validIds = selectedFeedbackIds.filter(id => {
      const fb = feedbackData.find(f => f.id === id);
      return fb && fb.status !== 'assigned' && fb.status !== 'spam' && fb.status !== 'escalated';
    });
    if (validIds.length === 0) {
      toast.error('No valid items selected for escalation.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/feedback/escalate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: validIds,
          department: bulkReportDepartment,
          reportDetails: bulkReportContent,
          userName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk escalation failed');
      }

      socket.emit('bulkFeedbackUpdate');
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: validIds,
          actionType: 'escalate',
          tabId
        });
      }

      toast.success(`Bulk escalation successful for ${validIds.length} feedback items!`, {
        autoClose: 2000
      });
      closeBulkReportModal();

      setFeedbackData(prev =>
        prev.map(f =>
          validIds.includes(f.id)
            ? {
                ...f,
                status: 'escalated',
                dept_status: 'escalated',
                department: bulkReportDepartment || 'Admin Escalation',
                reportDetails: bulkReportContent
              }
            : f
        )
      );
    } catch (error) {
      toast.error(`Failed to escalate feedback: ${error.message}`);
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);

    const existingState = reportStates[feedback.id] || {};

    let initialDepartment = '';
    if (feedback.department && departmentsForAssignment.includes(feedback.department)) {
      initialDepartment = feedback.department;
    }

    const newState = {
      ...existingState,
      reportContent: existingState.reportContent ?? feedback.reportDetails ?? '',
      reportDepartment: existingState.reportDepartment ?? initialDepartment,
      reportViewed: existingState.reportViewed ?? false,
      hasGenerated: existingState.hasGenerated ?? false,
    };

    setReportStates(prev => ({
      ...prev,
      [feedback.id]: newState,
    }));
  };

  const handleViewGeneratedReport = (feedback) => {
    setSelectedFeedback(feedback);
    setIsReportModalOpen(true);
    setReportViewed(feedback.id, true);
  };

  const handleViewHistory = async (feedback) => {
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`);
      if (!response.ok) throw new Error('Failed to fetch latest feedback');

      const updated = await response.json();
      setSelectedFeedback(updated);
      setIsAuditTrailModalOpen(true);
    } catch (err) {
      toast.error(`Failed to load history: ${err.message}`);
    }
  };

  const handleCreateReportClick = () => {
    setIsModalOpen(false);
    setIsReportModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
  };

  const closeBulkReportModal = () => {
    setIsBulkReportModalOpen(false);
    setBulkReportContent('');
    setBulkReportDepartment('');
    setSelectedFeedbackIds([]);
  };

  const closeAuditTrailModal = () => {
    setIsAuditTrailModalOpen(false);
    setSelectedFeedback(null);
  };

  const handleOpenBulkReportModal = () => {
    if (selectedFeedbackIds.length === 0) {
      toast.warn('Please select at least one feedback item.');
      return;
    }
    const invalidFeedback = selectedFeedbackIds
      .map(id => feedbackData.find(f => f.id === id))
      .filter(f => f && (f.status === 'spam' || f.status === 'assigned'));

    if (invalidFeedback.length > 0) {
      const errorMsg = invalidFeedback.map(f => `ID ${f.id} (${f.status})`).join(', ');
      toast.error(`Cannot include items that are already assigned or spam: ${errorMsg}`);
      return;
    }
    setIsBulkReportModalOpen(true);
  };

  const updateSentiment = (id, newSentiment) => {
    setFeedbackData(prevData =>
      prevData.map(f =>
        f.id === id ? {
          ...f,
          sentiment: newSentiment,
          sentiment_status: 'completed',
        } : f
      )
    );
    if (selectedFeedback?.id === id) {
      setSelectedFeedback({
        ...selectedFeedback,
        sentiment: newSentiment,
        sentiment_status: 'completed',
      });
    }
  };

  const setReportContent = (feedbackId, content) => {
    setReportStates(prev => ({
      ...prev,
      [feedbackId]: {
        ...prev[feedbackId],
        reportContent: content,
      },
    }));
  };

  const setReportDepartment = (feedbackId, department) => {
    setReportStates(prev => ({
      ...prev,
      [feedbackId]: {
        ...prev[feedbackId],
        reportDepartment: department,
      },
    }));
  };

  const setIsGenerating = (feedbackId, value, controller = null) => {
    setReportStates(prev => ({
      ...prev,
      [feedbackId]: {
        ...prev[feedbackId],
        isGenerating: value,
        ...(controller ? { abortController: controller } : {}),
      },
    }));
  };

  const setHasGenerated = (feedbackId, value) => {
    setReportStates(prev => ({
      ...prev,
      [feedbackId]: {
        ...prev[feedbackId],
        hasGenerated: value,
        reportViewed: value ? false : prev[feedbackId]?.reportViewed,
      },
    }));
  };

  const setReportViewed = (feedbackId, value) => {
    setReportStates(prev => ({
      ...prev,
      [feedbackId]: {
        ...prev[feedbackId],
        reportViewed: value,
      },
    }));
  };

  const prepareRawFeedbackForDisplay = feedback => {
    const displayData = { ID: feedback.id?.toUpperCase() || 'N/A' };

    if (feedback.source === 'staff') {
      displayData['Source'] = feedback.source ? feedback.source.charAt(0).toUpperCase() + feedback.source.slice(1) : 'Unknown';
      displayData['Feedback Type'] = feedback.feedbackType ? feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1) : 'Unknown';
      if (feedback.feedbackType === 'safety') {
        displayData['Immediate Attention'] = feedback.urgent ? 'Yes' : 'No';
        displayData['Urgent'] = feedback.urgent ? 'Yes' : 'No';
      }
      displayData['Department'] = feedback.department || 'Unknown';
      if (feedback.feedbackType?.toLowerCase() !== 'recognition' && feedback.impactSeverity != null) {
        displayData['Impact Severity'] = ['minor', 'moderate', 'critical'].includes(feedback.impactSeverity?.toLowerCase())
          ? feedback.impactSeverity.charAt(0).toUpperCase() + feedback.impactSeverity.slice(1)
          : 'Unknown';
      } else if (feedback.feedbackType?.toLowerCase() === 'recognition') {
        displayData['Impact Severity'] = 'None';
      }
      displayData['Sentiment'] = feedback.sentiment ? feedback.sentiment.charAt(0).toUpperCase() + feedback.sentiment.slice(1) : feedback.sentiment_status === 'pending' ? 'Pending' : 'Failed';
      displayData['Date'] = feedback.date ? new Date(feedback.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
      displayData['Anonymous'] = feedback.isAnonymous ? 'Yes' : 'No';
      if (!feedback.isAnonymous) {
        displayData['Email'] = feedback.email || 'Not provided';
      } else {
        displayData['Email'] = 'Not provided (Anonymous)';
      }
    } else {
      displayData['Source'] = feedback.source ? feedback.source.charAt(0).toUpperCase() + feedback.source.slice(1) : 'Unknown';
      displayData['Feedback Type'] = feedback.feedbackType ? feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1) : 'Unknown';
      displayData['Department'] = feedback.department || 'Unknown';
      displayData['Rating'] = feedback.rating != null ? `${feedback.rating} out of 5 stars` : 'N/A';
      displayData['Sentiment'] = feedback.sentiment ? feedback.sentiment.charAt(0).toUpperCase() + feedback.sentiment.slice(1) : feedback.sentiment_status === 'pending' ? 'Pending' : 'Failed';
      displayData['Date'] = feedback.date ? new Date(feedback.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
      displayData['Anonymous'] = feedback.isAnonymous ? 'Yes' : 'No';
      if (!feedback.isAnonymous) {
        displayData['Email'] = feedback.email || 'Not provided';
        displayData['Phone'] = feedback.phone || 'Not provided';
      } else {
        displayData['Email'] = 'Not provided (Anonymous)';
        displayData['Phone'] = 'Not provided (Anonymous)';
      }
    }
    return displayData;
  };

  const getStatusModifierClass = status => {
    switch (status) {
      case 'pending':
        return styles.pendingStatus;
      case 'unassigned':
        return styles.unassignedStatus;
      case 'assigned':
        return styles.assignedStatus;
      case 'escalated':
        return styles.escalatedStatus;
      case 'spam':
        return styles.spamStatus;
      case 'failed':
        return styles.failedStatus;
      default:
        return '';
    }
  };

  const getSentimentModifierClass = (sentiment, sentiment_status) => {
    if (sentiment === 'positive') return styles.positiveSentiment;
    if (sentiment === 'neutral') return styles.neutralSentiment;
    if (sentiment === 'negative') return styles.negativeSentiment;
    if (sentiment == null && sentiment_status === 'pending') return styles.pendingSentiment;
    if (sentiment == null && sentiment_status === 'failed') return styles.failedSentiment;
    return '';
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      sentiment: 'all',
      source: 'all',
      urgent: 'all',
      feedbackType: 'all',
      rating: 'all',
      impactSeverity: 'all',
      department: 'all',
      currentPage: 1,
    });
    setTimeFilter('all');
    setSearchId('');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSelectedFeedbackIds([]);
  };

  const filterByTime = data => {
    if (timeFilter === 'custom' && customStartDate && customEndDate) {
      const endOfDay = new Date(customEndDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      return data.filter(item => {
        const feedbackDate = new Date(item.date);
        return !isNaN(feedbackDate.getTime()) && feedbackDate >= customStartDate && feedbackDate < endOfDay;
      });
    }
    if (timeFilter === 'all') return data;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return data.filter(item => {
      const feedbackDate = new Date(item.date);
      if (isNaN(feedbackDate.getTime())) return true;
      switch (timeFilter) {
        case 'today':
          return feedbackDate >= today;
        case 'week':
          return feedbackDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        case 'month':
          return feedbackDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case 'quarter':
          return feedbackDate >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        default:
          return true;
      }
    });
  };

  const filteredFeedback = feedbackData.filter(item => {
    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    const matchesSentiment = filters.sentiment === 'all' || item.sentiment === filters.sentiment || (!item.sentiment && filters.sentiment === 'pending');
    const matchesUrgent = filters.urgent === 'all' || (filters.urgent === 'urgent' && item.urgent) || (filters.urgent === 'non-urgent' && !item.urgent);
    let matchesFeedbackType = filters.feedbackType === 'all' || item.feedbackType === filters.feedbackType;
    const matchesRating = filters.rating === 'all' || String(item.rating) === filters.rating;
    const matchesImpactSeverity = filters.impactSeverity === 'all' || item.impactSeverity === filters.impactSeverity;
    let matchesSource = filters.source === 'all' || (filters.source === 'visitor' ? (item.source === 'visitor' || item.source === 'family') : item.source === filters.source);
    let matchesDepartment = filters.department === 'all' || (filters.department === 'others' ? !departmentsForAssignment.includes(item.department) || !item.department : item.department === filters.department);
    const matchesSearchId = !searchId || (item.id && item.id.toLowerCase().includes(searchId.toLowerCase()));
    
    return matchesStatus && matchesSentiment && matchesSource && matchesUrgent && matchesFeedbackType && matchesRating && matchesImpactSeverity && matchesDepartment && matchesSearchId;
  });

  const timeFilteredFeedback = filterByTime(filteredFeedback);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(timeFilteredFeedback.length / itemsPerPage);
  if (filters.currentPage > totalPages && totalPages > 0) {
    setFilters(prev => ({ ...prev, currentPage: 1 }));
  }
  const paginatedFeedback = timeFilteredFeedback.slice((filters.currentPage - 1) * itemsPerPage, filters.currentPage * itemsPerPage);

  const handlePageChange = page => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchFeedback();
    toast.info('Feedback refreshed.', {
      autoClose: 1000
    });
    setLoading(false);
  };

  const todayFeedbackCount = feedbackData.filter(f => new Date(f.date).toDateString() === new Date().toDateString()).length;
  const totalFeedback = feedbackData.length;
  const unassignedFeedbackCount = feedbackData.filter(f => f.status === 'unassigned').length;
  const assignedFeedbackCount = feedbackData.filter(f => f.status === 'assigned').length;
  const escalateFeebackCount = feedbackData.filter(f => f.status === 'escalated').length;

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} />
      <Header
        userName={user.name}
        userRole={user.role}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        onLogout={handleLogout}
      />
      <main className={styles.mainContent}>
        <section className={styles.overviewSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionHeading}>Performance Overview</h2>
          </div>
          <div className={styles.metricGrid}>
            <MetricCard title="Today's Feedback" value={todayFeedbackCount} icon="fas fa-calendar-day" variant="today" />
            <MetricCard title="Total Feedback" value={totalFeedback} icon="fas fa-comments" variant="primary" />
            <MetricCard title="Unassigned Feedback" value={unassignedFeedbackCount} icon="fas fa-folder-open" variant="warning" />
            <MetricCard title="Assigned" value={assignedFeedbackCount} icon="fas fa-check-double" variant="success" />
            <MetricCard title="Escalated" value={escalateFeebackCount} icon="fas fa-exclamation" variant="orange" />
          </div>
        </section>
        {error && (
          <div className={styles.errorMessage}>
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
          </div>
        )}
        <AnalyticsSection feedbackData={timeFilteredFeedback} />
        <FilterSection
          filters={filters}
          setFilters={setFilters}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          handleClearFilters={handleClearFilters}
          handleRefresh={handleRefresh}
          searchId={searchId}
          setSearchId={setSearchId}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          loading={loading}
          departments={departmentsForAssignment}
          selectedFeedbackIds={selectedFeedbackIds}
          setSelectedFeedbackIds={setSelectedFeedbackIds}
          handleBulkSpam={handleBulkSpam}
          handleBulkRestore={handleBulkRestore}
          handleBulkGenerateReport={handleOpenBulkReportModal}
          filteredFeedback={feedbackData}
          prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
        />
        <FeedbackTable
          feedback={paginatedFeedback}
          handleViewDetails={handleViewDetails}
          getSentimentModifierClass={getSentimentModifierClass}
          getStatusModifierClass={getStatusModifierClass}
          handleTagAsSpam={handleTagAsSpam}
          handleRestore={handleRestore}
          reportStates={reportStates}
          setHasGenerated={setHasGenerated}
          setReportViewed={setReportViewed}
          handleViewGeneratedReport={handleViewGeneratedReport}
          selectedFeedbackIds={selectedFeedbackIds}
          setSelectedFeedbackIds={setSelectedFeedbackIds}
          handleViewHistory={handleViewHistory}
        />
        <div className={styles.tableFooter}>
          <div className={styles.resultsInfo}>
            Showing {Math.min(filters.currentPage * itemsPerPage, filteredFeedback.length)} of {filteredFeedback.length} feedback
          </div>
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(filters.currentPage - 1)}
              disabled={filters.currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                className={`${styles.paginationButton} ${filters.currentPage === index + 1 ? styles.activePage : ''}`}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(filters.currentPage + 1)}
              disabled={filters.currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        {isModalOpen && selectedFeedback && (
          <FeedbackModal
            feedback={selectedFeedback}
            onClose={closeModal}
            onCreateReport={handleCreateReportClick}
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            updateSentiment={updateSentiment}
            handleViewHistory={handleViewHistory}
          />
        )}
        {isReportModalOpen && selectedFeedback && (
          <ReportModal
            feedback={selectedFeedback}
            departments={departmentsForAssignment}
            onClose={closeReportModal}
            onGenerateReport={handleGenerateReport}
            onEscalate={handleEscalate}
            reportContent={reportStates[selectedFeedback.id]?.reportContent || ''}
            setReportContent={setReportContent}
            reportDepartment={reportStates[selectedFeedback.id]?.reportDepartment || ''}
            setReportDepartment={setReportDepartment}
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            isGenerating={reportStates}
            setIsGenerating={setIsGenerating}
            hasGenerated={reportStates}
            setHasGenerated={setHasGenerated}
          />
        )}
        {isBulkReportModalOpen && (
          <BulkReportModal
            selectedFeedbackIds={selectedFeedbackIds}
            departments={departmentsForAssignment}
            onClose={closeBulkReportModal}
            onBulkGenerateReport={handleBulkGenerateReport}
            onBulkEscalate={handleBulkEscalate}
            reportContent={bulkReportContent}
            setReportContent={setBulkReportContent}
            reportDepartment={bulkReportDepartment}
            setReportDepartment={setBulkReportDepartment}
          />
        )}
        {isAuditTrailModalOpen && selectedFeedback && (
          <AuditTrailModal
            feedback={selectedFeedback}
            onClose={closeAuditTrailModal}
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
          />
        )}
      </main>
    </div>
  );
};

const QADashboardWithErrorBoundary = () => (
    <ErrorBoundary>
        <QADashboard />
    </ErrorBoundary>
);

export default QADashboardWithErrorBoundary;