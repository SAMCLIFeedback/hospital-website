import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../assets/css/Dashboard.module.css';
import PropTypes from 'prop-types';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import Logo from '../assets/logo.png';
import ExportPDFButton from '../components/ExportPDFButton';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const socket = io(BASE_URL, { withCredentials: true });

const Header = ({ userName, userRole, date, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoading(true);
    try {
      await onLogout();
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <div className={styles.logoContainer}>
            <img src={Logo} alt="Hospital Logo" className={styles.logoImage} />
          </div>
          <div className={styles.titleContainer}>
            <h1 className={styles.mainTitle}>Department Heads Dashboard</h1>
            <p className={styles.subTitle}>Feedback Analysis for Nursing Service</p>
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
              disabled={isLoading}
              aria-label={isLoading ? 'Logging out' : 'Logout'}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Logging out...
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
  );
};

Header.propTypes = {
  userName: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

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
  selectedFeedbackIds,
  handleBulkProposeAction,
  handleBulkNoActionNeeded,
  filteredFeedback, // 2. Receive filteredFeedback data
  prepareRawFeedbackForDisplay // 3. Receive the utility function
}) => {
  const hasActiveFilters = Object.keys(filters).some(
    key => ['status', 'sentiment', 'source', 'urgent', 'feedbackType', 'rating', 'impactSeverity'].includes(key) && filters[key] !== 'all'
  );

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

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'needs_action', label: 'Needs Action' },
    { value: 'proposed', label: 'Proposed' },
    { value: 'need_revision', label: 'Needs Revision' },
    { value: 'approved', label: 'Approved' },
    { value: 'no_action_needed', label: 'No Action Needed' },
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
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            <option value="escalated">Forwarded</option>
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
            <>
              <button
                className={`${styles.actionButton} ${styles.bulkActionButton} ${styles.proposeAction}`}
                onClick={handleBulkProposeAction}
                aria-label={`Propose action for ${selectedFeedbackIds.length} selected feedback`}
              >
                <i className="fas fa-paper-plane"></i> Propose Action ({selectedFeedbackIds.length})
              </button>
              <button
                className={`${styles.actionButton} ${styles.bulkActionButton} ${styles.noActionNeeded}`}
                onClick={handleBulkNoActionNeeded}
                aria-label={`Mark no action needed for ${selectedFeedbackIds.length} selected feedback`}
              >
                <i className="fas fa-ban"></i> No Action Needed ({selectedFeedbackIds.length})
              </button>
            </>
          )}
          {hasActiveFilters && (
            <button className={`${styles.actionButton} ${styles.clearFilterButton}`} onClick={handleClearFilters}>
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.refreshButton}`}
            onClick={handleRefresh}
            disabled={loading}
            aria-label={loading ? 'Refreshing feedback' : 'Refresh feedback'}
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
            data={filteredFeedback}
            initialSelectedIds={selectedFeedbackIds}
            dashboardType="dept"
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            variant="primary"
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
  loading: PropTypes.bool.isRequired,
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleBulkProposeAction: PropTypes.func.isRequired,
  handleBulkNoActionNeeded: PropTypes.func.isRequired,
};

const FeedbackModal = ({ feedback, onClose, prepareRawFeedbackForDisplay, actionState, setActionState, user }) => {  const isProposed = feedback.dept_status === 'proposed';
  const isNoActionNeeded = feedback.dept_status === 'no_action_needed';
  const isNeedRevision = feedback.dept_status === 'need_revision';
  const isApproved = feedback.dept_status === 'approved';
  const isActionMode = isProposed || isNeedRevision || actionState[feedback.id]?.isActionMode || false;
  const actionText = actionState[feedback.id]?.actionText || '';
  const isClosed = isApproved || isNoActionNeeded;

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const handleTakeAction = () => {
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: true, actionText: actionText },
    }));
  };

  const handleCancelAction = () => {
    const hasInput = actionText.trim().length > 0;
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: false, actionText: '' },
    }));
    if (hasInput) {
      toast.warn('Input text cleared', {
        autoClose: 2000
      });
    } else {
      toast.info('Creation canceled', {
        autoClose: 2000
      });
    }
    if (isNeedRevision) {
      onClose();
    }
  };

  const handleSendForApproval = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/dept/propose-action`, {
        ids: [feedback.id],
        finalActionDescription: actionText,
      });
      toast.success(`Action for ${feedback.id} sent for approval.`, {
        autoClose: 2000
      });
      onClose();
    } catch (err) {
      console.error('Error sending for approval:', err);
      toast.error('Failed to send action for approval.');
    }
  };

  const handleActionTextChange = (e) => {
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: true, actionText: e.target.value },
    }));
  };

  const handleModalClose = () => {
    onClose();
  };

  // Prepare audit trail data
  const auditTrail = (isClosed) && feedback.actionHistory
    ? [
        {
          timestamp: new Date(feedback.date),
          action: 'Feedback Submitted',
          user: feedback.isAnonymous ? 'Anonymous' : feedback.email || 'Unknown',
          details: `Initial submission from ${feedback.source}.`,
        },
        ...feedback.actionHistory,
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={handleModalClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          {isClosed && auditTrail.length > 0 && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-history"></i> Action History</h3>
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
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td>{entry.action}</td>
                      <td>{entry.user}</td>
                      <td>{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
            <p className={styles.descriptionText}>
              {feedback.reportDetails || 'No report details available.'}
            </p>
          </div>
          {feedback.dept_status === 'needs_action' && feedback.adminNotes && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-file-signature"></i> Administrative Instructions</h3>
              <p className={styles.descriptionText}>
                {feedback.adminNotes}
              </p>
            </div>
          )}
          {isNeedRevision && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-sticky-note"></i> Revision Notes</h3>
              <p className={styles.descriptionText}>
                {feedback.revisionNotes || 'No revision notes available.'}
              </p>
            </div>
          )}
          {(isActionMode || isNoActionNeeded || isProposed || isApproved) && (
            <div className={styles.detailSection}>
              <h3>
                <i className="fas fa-tasks"></i>
                {isNoActionNeeded || isApproved ? ' Final Action' : ' Final Action Proposal'}
              </h3>
              <div className={styles.inputGroup}>
                {(isProposed || isNoActionNeeded || isApproved) ? (
                  <p className={styles.descriptionText}>
                    {isNoActionNeeded ? 'No Action Required' : feedback.finalActionDescription || 'No action description provided.'}
                  </p>
                ) : (
                  <>
                    <label className={styles.inputLabel} htmlFor="actionText">
                      Action Description<span className={styles.requiredField}>*</span>
                    </label>
                    <textarea
                      id="actionText"
                      className={styles.noteTextarea}
                      value={actionText}
                      onChange={handleActionTextChange}
                      placeholder="Describe the proposed action..."
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles.modalActions}>
          {!isActionMode && !isNoActionNeeded && !isApproved && (
            <button
              className={`${styles.actionButton} ${styles.createReportButton}`}
              onClick={handleTakeAction}
            >
              <i className="fas fa-tasks"></i> Take Action
            </button>
          )}
          {isActionMode && !isNoActionNeeded && !isApproved && (
            <>
              {isProposed ? (
                <button
                  className={`${styles.actionButton} ${styles.disabledButton}`}
                  disabled
                >
                  <i className="fas fa-hourglass-half"></i> Waiting for Approval
                </button>
              ) : (
                <>
                  {['needs_action', 'need_revision'].includes(feedback.dept_status) && (
                    <button
                      className={`${styles.actionButton} ${styles.noActionButton}`}
                      onClick={async () => {
                        if (!user?.name) {
                          toast.error('User session not loaded. Please log in again.');
                          return;
                        }
                        try {
                          await axios.patch(`${BASE_URL}/api/dept/no-action`, {
                            ids: [feedback.id],
                            userName: user.name,
                          });
                          toast.success(`Feedback ${feedback.id.toUpperCase()} marked as 'No Action Needed'.`, {
                            autoClose: 2000
                          });
                          onClose();
                        } catch (err) {
                          console.error('Error marking no action needed:', err);
                          toast.error('Failed to update feedback status.');
                        }
                      }}
                    >
                      <i className="fas fa-ban"></i> Mark No Action Needed
                    </button>
                  )}
                  <button
                    className={`${styles.actionButton} ${styles.confirmButton}`}
                    onClick={handleSendForApproval}
                    disabled={!actionText.trim()}
                  >
                    <i className="fas fa-paper-plane"></i> Send for Approval
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.cancelButton}`}
                    onClick={handleCancelAction}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  actionState: PropTypes.object.isRequired,
  setActionState: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
};

const FeedbackTable = ({
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  handleNoActionNeeded,
}) => {
  const handleSelectFeedback = (id) => {
    setSelectedFeedbackIds(prev =>
      prev.includes(id)
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const eligibleFeedback = feedback.filter(item => !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status));
    if (selectedFeedbackIds.length === eligibleFeedback.length && eligibleFeedback.length > 0) {
      setSelectedFeedbackIds([]);
    } else {
      setSelectedFeedbackIds(eligibleFeedback.map(item => item.id));
    }
  };

  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedFeedbackIds.length > 0 && selectedFeedbackIds.length === feedback.filter(item => !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status)).length}
                onChange={handleSelectAll}
                disabled={feedback.every(item => ['proposed', 'approved', 'no_action_needed'].includes(item.dept_status))}
                aria-label="Select all eligible feedback"
              />
            </th>
            <th>ID</th>
            <th>Date</th>
            <th>Source</th>
            <th>Summary</th>
            <th>Report</th>
            <th>Sentiment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feedback.length > 0 ? feedback.map((item) => (
            <tr key={item.id || `temp-${Math.random()}`} className={styles.feedbackRow}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedFeedbackIds.includes(item.id)}
                  onChange={() => handleSelectFeedback(item.id)}
                  disabled={['proposed', 'approved', 'no_action_needed'].includes(item.dept_status)}
                  aria-label={`Select feedback ${item.id}`}
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
                <div className={styles.summaryCell}>
                  <div className={styles.summaryText} title={item.description || ''}>
                    {item.description
                      ? item.description.substring(0, 70) + (item.description.length > 70 ? '...' : '')
                      : 'No description'}
                  </div>
                  {item.urgent && (
                    <span className={styles.urgentFlag}>
                      <i className="fas fa-bolt"></i> Urgent
                    </span>
                  )}
                  {item.adminNotes && (
                    <span className={styles.escalatedFlag}>
                      <i className="fas fa-user-shield"></i> Forwarded
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className={styles.summaryCell}>
                  <div className={styles.summaryText} title={item.reportDetails || ''}>
                    {item.reportDetails
                      ? item.reportDetails.substring(0, 70) + (item.reportDetails.length > 70 ? '...' : '')
                      : 'No report'}
                  </div>
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
                <div className={`${styles.statusTagBase} ${getStatusModifierClass(item.dept_status)}`}>
                  {item.dept_status
                    ? item.dept_status.charAt(0).toUpperCase() + item.dept_status.slice(1).replace(/_/g, ' ')
                    : 'Needs Action'}
                </div>
              </td>
              <td>
                <div className={styles.actionsCell}>
                  {['no_action_needed', 'approved'].includes(item.dept_status) ? (
                    <button
                      title="View History"
                      className={styles.moreActionsButton}
                      onClick={() => handleViewDetails(item)}
                    >
                      <i className="fas fa-history"></i> History
                    </button>
                  ) : (
                    <button
                      title="View Details"
                      className={styles.viewDetailsButton}
                      onClick={() => handleViewDetails(item)}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="9" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No needs action feedback entries match your current filters.</p>
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
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedFeedbackIds: PropTypes.func.isRequired,
  handleNoActionNeeded: PropTypes.func.isRequired,
};

const DepartmentHeadsDashboard = () => {
  const navigate = useNavigate();
  const [feedbackData, setFeedbackData] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [isBulkProposeModalOpen, setIsBulkProposeModalOpen] = useState(false);
  const [bulkActionDescription, setBulkActionDescription] = useState(''); 
  const [filters, setFilters] = useState({
    status: 'all',
    sentiment: 'all',
    source: 'all',
    urgent: 'all',
    feedbackType: 'all',
    rating: 'all',
    impactSeverity: 'all',
    currentPage: 1,
  });
  const [searchId, setSearchId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState({});
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [user, setUser] = useState({ name: '', role: '', department: '' });
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      setIsSessionLoading(true);
      const sessionId = sessionStorage.getItem('current_dept_session');
      if (!sessionId) {
        toast.error('No active session. Please log in.');
        navigate('/');
        return;
      }

      try {
        const userData = JSON.parse(localStorage.getItem(`dept_user_session_${sessionId}`));
        if (userData && userData.name && userData.role && userData.department) {
          setUser({ name: userData.name, role: userData.role, department: userData.department });
        } else {
          toast.error('Session invalid. Please log in again.');
          localStorage.removeItem(`dept_user_session_${sessionId}`);
          sessionStorage.removeItem('current_dept_session');
          navigate('/');
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        toast.error('Error loading session. Please log in again.');
        localStorage.removeItem(`dept_user_session_${sessionId}`);
        sessionStorage.removeItem('current_dept_session');
        navigate('/');
      } finally {
        setIsSessionLoading(false);
      }
    };

    loadSession();
  }, [navigate]);

  const fetchFeedback = async () => {
    if (!user || user.department === 'Unknown') {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/api/dept/feedback`, {
        department: user.department,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Received invalid feedback data');
      }

      const sortedData = response.data
        .map(item => ({
          ...item,
          id: item.id?.toString() || `unknown-${Date.now()}`,
          date: item.date || new Date().toISOString(),
          dept_status: item.dept_status || 'needs_action',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setFeedbackData(sortedData);
    } catch (error) {
      console.error('Error fetching feedback:', error.message);
      toast.error(`Failed to load feedback: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isSessionLoading) {
      fetchFeedback();
      
      const handleSingleUpdate = (updatedFeedback) => {
        if (!updatedFeedback || updatedFeedback.department !== user.department) return;

        setFeedbackData(prev => {
          const index = prev.findIndex(f => f.id === updatedFeedback.id);
          const newItem = {
            ...updatedFeedback,
            date: updatedFeedback.date || new Date().toISOString(),
            dept_status: updatedFeedback.dept_status || 'needs_action',
          };

          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...newItem };

            if (isModalOpen && selectedFeedback && selectedFeedback.id === updatedFeedback.id) {
              setSelectedFeedback({ ...selectedFeedback, ...newItem });
            }

            return updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          } else {
            return [newItem, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
          }
        });
      };
      
      // NEW: Handler for bulk updates
      const handleBulkUpdate = () => {
        fetchFeedback();
        setSelectedFeedbackIds([]); // Also clear any selections
      };

      socket.on('feedbackUpdate', handleSingleUpdate);
      socket.on('bulkFeedbackUpdate', handleBulkUpdate); // Listen for the new event

      return () => {
        socket.off('feedbackUpdate', handleSingleUpdate);
        socket.off('bulkFeedbackUpdate', handleBulkUpdate); // Cleanup listener
      };
    }
  }, [user, isSessionLoading, isModalOpen, selectedFeedback]);

  const handleLogout = async () => {
    const sessionId = sessionStorage.getItem('current_dept_session'); 
    if (sessionId) {
      localStorage.removeItem(`dept_user_session_${sessionId}`); 
      sessionStorage.removeItem('current_dept_session'); 
    }
    setUser(null); 
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchFeedback();
      toast.info('Feedback refreshed.', {
        autoClose: 1000
      });
    } catch (error) {
      console.error('Error refreshing feedback:', error.message);
      toast.error('Failed to refresh feedback data.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNoActionNeeded = async (id) => {
    if (!user.name) {
      toast.error('User session not loaded. Please log in again.');
      navigate('/');
      return;
    }

    try {
      await axios.patch(`${BASE_URL}/api/dept/no-action`, {
        ids: [id],
        userName: user.name,
      });
      toast.success(`Feedback ${id.toUpperCase()} marked as 'No Action Needed'.`, {
        autoClose: 2000
      });
      await fetchFeedback();
    } catch (err) {
      console.error('Error marking no action needed:', err);
      toast.error('Failed to update feedback status.');
    }
  };

  const handleBulkNoActionNeeded = async () => {
    if (!user.name) {
      toast.error('User session not loaded. Please log in again.');
      navigate('/');
      return;
    }

    if (selectedFeedbackIds.length === 0) {
      toast.warning('No feedback selected.');
      return;
    }

    try {
      await axios.patch(`${BASE_URL}/api/dept/no-action`, {
        ids: selectedFeedbackIds,
        userName: user.name,
      });
      toast.success(`${selectedFeedbackIds.length} feedback item(s) marked as 'No Action Needed'.`, {
        autoClose: 2000
      });
      setSelectedFeedbackIds([]);
      await fetchFeedback();
    } catch (err) {
      console.error('Bulk no action needed error:', err);
      toast.error('Failed to update feedback items.');
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  const handleBulkProposeAction = () => {
    if (selectedFeedbackIds.length === 0) {
      toast.warning('No feedback selected.');
      return;
    }
    setBulkActionDescription('');
    setIsBulkProposeModalOpen(true);
  };

  const prepareRawFeedbackForDisplay = feedback => {
    const displayData = {
      ID: feedback.id?.toUpperCase() || 'N/A',
    };

    if (feedback.source === 'staff') {
      displayData['Source'] = feedback.source ? feedback.source.charAt(0).toUpperCase() + feedback.source.slice(1) : 'Unknown';
      displayData['Feedback Type'] = feedback.feedbackType ? feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1) : 'Unknown';
      if (feedback.feedbackType === 'safety') {
        displayData['Immediate Attention'] = feedback.urgent ? 'Yes' : 'No';
        displayData['Urgent'] = feedback.urgent ? 'Yes' : 'No';
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
      case 'no_action_needed':
        return styles.assignedStatus;
      case 'proposed':
        return styles.proposedStatus;
      case 'need_revision':
        return styles.needsRevisionStatus;
      case 'approved':
        return styles.approvedStatus;
      case 'needs_action':
        return styles.failedStatus;
      default:
        return styles.assignedStatus;
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
        return feedbackDate >= customStartDate && feedbackDate < endOfDay;
      });
    }
    
    if (timeFilter === 'all') return data;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return data.filter(item => {
      const feedbackDate = new Date(item.date);
      switch (timeFilter) {
        case 'today':
          return feedbackDate >= today;
        case 'week':
          const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          return feedbackDate >= oneWeekAgo && feedbackDate <= now;
        case 'month':
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return feedbackDate >= oneMonthAgo && feedbackDate <= now;
        case 'quarter':
          const oneQuarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return feedbackDate >= oneQuarterAgo && feedbackDate <= now;
        default:
          return true;
      }
    });
  };

  const filteredFeedback = feedbackData.filter(item => {
    const matchesStatus = filters.status === 'all' || item.dept_status === filters.status;
    const matchesSentiment = filters.sentiment === 'all' || item.sentiment === filters.sentiment || (!item.sentiment && filters.sentiment === 'pending');
    const matchesUrgent =
      filters.urgent === 'all' ||
      (filters.urgent === 'urgent' && item.urgent) ||
      (filters.urgent === 'non-urgent' && !item.urgent) ||
      (filters.urgent === 'escalated' && item.adminNotes?.trim());
    let matchesFeedbackType = true;
    if (filters.feedbackType !== 'all') {
      const internalTypes = ['operational', 'safety', 'improvement', 'recognition', 'complaint'];
      const externalTypes = ['complaint', 'suggestion', 'compliment', 'other'];

      if (filters.feedbackType === 'other') {
        if (filters.source === 'staff') {
          matchesFeedbackType = !internalTypes.includes(item.feedbackType);
        } else {
          matchesFeedbackType = !externalTypes.includes(item.feedbackType);
        }
      } else {
        matchesFeedbackType = item.feedbackType === filters.feedbackType;
      }
    }
    const matchesRating = filters.rating === 'all' || String(item.rating) === filters.rating;
    const matchesImpactSeverity = filters.impactSeverity === 'all' ||
      (filters.impactSeverity === 'none' && (item.impactSeverity === 'none' || item.impactSeverity === null)) ||
      item.impactSeverity === filters.impactSeverity;

    let matchesSource = false;
    if (filters.source === 'all') {
      matchesSource = true;
    } else if (filters.source === 'visitor') {
      matchesSource = item.source === 'visitor' || item.source === 'family';
    } else {
      matchesSource = item.source === filters.source;
    }

    const matchesSearchId = !searchId ||
      (item.id && item.id.toLowerCase().includes(searchId.toLowerCase()));

    return matchesStatus && matchesSentiment && matchesSource && matchesUrgent && matchesFeedbackType && matchesRating && matchesImpactSeverity && matchesSearchId;
  });

  const timeFilteredFeedback = filterByTime(filteredFeedback);
  const filteredFeedbackForExport = timeFilteredFeedback;
  
  const itemsPerPage = 50;
  const totalPages = Math.ceil(timeFilteredFeedback.length / itemsPerPage);
  if (filters.currentPage > totalPages && totalPages > 0) {
    setFilters(prev => ({ ...prev, currentPage: 1 }));
  }
  const paginatedFeedback = timeFilteredFeedback.slice(
    (filters.currentPage - 1) * itemsPerPage,
    filters.currentPage * itemsPerPage
  );

  const handlePageChange = page => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, currentPage: page }));
      setSelectedFeedbackIds([]);
    }
  };

  const todayFeedbackCount = feedbackData.filter(f =>
    new Date(f.date).toDateString() === new Date().toDateString()
  ).length;
  const totalFeedback = feedbackData.length;
  const assignedCount = feedbackData.filter(f => f.dept_status === 'needs_action').length;
  const approvedCount = feedbackData.filter(f => f.dept_status === 'approved').length;
  const noActionNeeded = feedbackData.filter(f => f.dept_status === 'no_action_needed').length;

  if (isSessionLoading) {
    return (
      <div className={styles.loadingContainer}>
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-right" autoClose={3000} />
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
            <MetricCard
              title="Today's Reports"
              value={todayFeedbackCount}
              icon="fas fa-calendar-day"
              variant="today"
            />
            <MetricCard
              title="Total Reports"
              value={totalFeedback}
              icon="fas fa-comments"
              variant="primary"
            />
            <MetricCard
              title="Needs Action Reports"
              value={assignedCount}
              icon="fas fa-tasks"
              variant="warning"
            />
            <MetricCard
              title="Approved Reports"
              value={approvedCount}
              icon="fas fa-check-circle"
              variant="success"
            />
            <MetricCard 
              title="No Action Needed" 
              value={noActionNeeded} 
              icon="fas fa-folder-open" 
              variant="primary" 
            />

          </div>
        </section>
        <AnalyticsSection feedbackData={feedbackData} />
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
          selectedFeedbackIds={selectedFeedbackIds}
          handleBulkProposeAction={handleBulkProposeAction}
          handleBulkNoActionNeeded={handleBulkNoActionNeeded}
          filteredFeedback={filteredFeedbackForExport}
          prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
        />
        <FeedbackTable
          feedback={paginatedFeedback}
          handleViewDetails={handleViewDetails}
          getSentimentModifierClass={getSentimentModifierClass}
          getStatusModifierClass={getStatusModifierClass}
          selectedFeedbackIds={selectedFeedbackIds}
          setSelectedFeedbackIds={setSelectedFeedbackIds}
          handleNoActionNeeded={handleNoActionNeeded}
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
                className={`${styles.paginationButton} ${
                  filters.currentPage === index + 1 ? styles.activePage : ''
                }`}
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
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            actionState={actionState}
            setActionState={setActionState}
            user={user}
          />
        )}
        {isBulkProposeModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Propose Action for {selectedFeedbackIds.length} Feedback Item{selectedFeedbackIds.length > 1 ? 's' : ''}</h2>
                <button onClick={() => setIsBulkProposeModalOpen(false)} className={styles.closeButton}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className={styles.modalBody}>
                <label className={styles.inputLabel}>
                  Action Description<span className={styles.requiredField}>*</span>
                </label>
                <textarea
                  className={styles.noteTextarea}
                  value={bulkActionDescription}
                  onChange={(e) => setBulkActionDescription(e.target.value)}
                  placeholder="Describe the action you want to propose..."
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.actionButton} ${styles.confirmButton}`}
                  onClick={async () => {
                    if (!bulkActionDescription.trim()) {
                      toast.error('Action description is required.');
                      return;
                    }

                    try {
                      await axios.patch(`${BASE_URL}/api/dept/propose-action`, {
                        ids: selectedFeedbackIds,
                        finalActionDescription: bulkActionDescription.trim()
                      });

                      toast.success(`Proposed action for ${selectedFeedbackIds.length} feedback item(s).`, {
                        autoClose: 2000
                      });
                      setSelectedFeedbackIds([]);
                      setIsBulkProposeModalOpen(false);
                      await fetchFeedback();
                    } catch (err) {
                      console.error('Bulk propose error:', err);
                      toast.error('Failed to propose actions. Please try again.');
                    }
                  }}
                >
                  <i className="fas fa-paper-plane"></i> Send for Approval
                </button>
                <button
                  className={`${styles.actionButton} ${styles.cancelButton}`}
                  onClick={() => setIsBulkProposeModalOpen(false)}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const DepartmentHeadsDashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <DepartmentHeadsDashboard />
  </ErrorBoundary>
);

export default DepartmentHeadsDashboardWithErrorBoundary;