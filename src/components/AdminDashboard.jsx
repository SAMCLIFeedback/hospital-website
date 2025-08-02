import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../assets/css/Dashboard.module.css';
import PropTypes from 'prop-types';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Logo from '../assets/logo.png';
import ExportPDFButton from '../components/ExportPDFButton'; 

// Initialize Socket.IO client
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const socket = io(BASE_URL, { withCredentials: true });

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

// Header Component
const Header = ({ userName, userRole, date, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoading(true);
    try {
      // Removed artificial 2-second delay
      await onLogout(); // Now awaits the actual onLogout function completion
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
            <h1 className={styles.mainTitle}>Admin Dashboard</h1>
            <p className={styles.subTitle}>Patient & Staff Feedback Analysis</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <i className="fas fa-user-shield"></i>
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{userName || 'Guest'}</span>
              <span className={styles.userRole}>{userRole || 'Administrator'}</span>
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
  userName: PropTypes.string,
  userRole: PropTypes.string,
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

  const departmentData = {
    labels: [...new Set(feedbackData.map(f => f.department || 'Unknown'))],
    datasets: [{
      label: 'Feedback by Department',
      data: [...new Set(feedbackData.map(f => f.department || 'Unknown'))].map(dept =>
        feedbackData.filter(f => (f.department || 'Unknown') === dept).length
      ),
      backgroundColor: 'rgba(98, 0, 234, 0.6)',
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

const BulkActionModal = ({ title, onConfirm, onClose, children, confirmText, confirmIcon, isConfirmDisabled }) => (
    <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>{title}</h2>
                <button onClick={onClose} className={styles.closeButton} title="Close Modal">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className={styles.modalBody}>{children}</div>
            <div className={styles.modalActions}>
                <button className={`${styles.actionButton} ${styles.confirmButton}`} onClick={onConfirm} disabled={isConfirmDisabled}>
                    <i className={`fas ${confirmIcon}`}></i> {confirmText}
                </button>
                <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onClose}>
                    <i className="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>
);

const BulkTakeActionModal = ({ title, onClose, onNoAction, onApprove, children, isConfirmDisabled }) => (
     <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>{title}</h2>
                <button onClick={onClose} className={styles.closeButton} title="Close Modal">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className={styles.modalBody}>{children}</div>
            <div className={styles.modalActions}>
                 <button className={`${styles.actionButton} ${styles.noActionButton}`} onClick={onNoAction}>
                    <i className="fas fa-ban"></i> Mark No Action Needed
                </button>
                <button className={`${styles.actionButton} ${styles.approveActionButton}`} onClick={onApprove} disabled={isConfirmDisabled}>
                    <i className="fas fa-check-circle"></i> Approve
                </button>
                <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onClose}>
                    <i className="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>
);

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
  departments,
  selectedFeedbackIds,
  handleBulkAction,
  selectionType,
  loading,
  filteredFeedback, // 2. Receive filteredFeedback data
  prepareRawFeedbackForDisplay // 3. Receive the utility function
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
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setTimeFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </span>
            ))}
          </div>
          <button
            className={`${styles.advancedFilterButton} ${timeFilter === 'custom' ? styles.activeFilter : ''}`}
            onClick={() => setTimeFilter(timeFilter === 'custom' ? 'all' : 'custom')}
            title="Toggle advanced date filter"
          >
            <i className="fas fa-calendar-alt"></i> Advanced
          </button>
        </div>
      </div>
      
      {timeFilter === 'custom' && (
        <div className={styles.customDateRange}>
          <div className={styles.datePickerGroup}>
            <label htmlFor="startDate">From:</label>
            <DatePicker
              id="startDate"
              selected={customStartDate}
              onChange={date => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              className={styles.datePicker}
            />
          </div>
          <div className={styles.datePickerGroup}>
            <label htmlFor="endDate">To:</label>
            <DatePicker
              id="endDate"
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
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="proposed">Proposed</option>
            <option value="escalated">Escalated</option>
            <option value="approved">Approved</option>
            <option value="no_action_needed">No Action Needed</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="filterSentiment">Sentiment</label>
          <select
            id="filterSentiment"
            className={styles.filterSelect}
            value={filters.sentiment}
            onChange={e => setFilters({ ...filters, sentiment: e.target.value, currentPage: 1 })}
            aria-label="Filter by sentiment"
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
            aria-label="Filter by source"
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
            aria-label="Filter by urgency"
          >
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="non-urgent">Non-Urgent</option>
            <option value="escalated">Returned</option>
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
              aria-label={filters.source === 'staff' ? 'Filter by staff feedback type' : 'Filter by external feedback type'}
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
              aria-label="Filter by rating"
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
              aria-label="Filter by impact severity"
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
            aria-label="Filter by department"
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
        {filters.status !== 'all' ? ` Status: ${filters.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')},` : ''}
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
            aria-label="Search feedback by ID"
          />
        </div>
        <div className={styles.filterButtons}>
          <div className={styles.bulkActions}>
            {selectionType === 'proposed' && (
              <>
                <button
                  className={`${styles.actionButton} ${styles.approveActionButton}`}
                  onClick={() => handleBulkAction('approve')}
                >
                  <i className="fas fa-check-circle"></i> Approve ({selectedFeedbackIds.length})
                </button>
                <button
                  className={`${styles.actionButton} ${styles.revisionActionButton}`}
                  onClick={() => handleBulkAction('request-revision')}
                >
                  <i className="fas fa-edit"></i> Request Revision ({selectedFeedbackIds.length})
                </button>
              </>
            )}

            {selectionType === 'escalated' && (
              <>
                <button
                  className={`${styles.actionButton} ${styles.revisionActionButton}`}
                  onClick={() => handleBulkAction('assign-department')}
                >
                  <i className="fas fa-share-square"></i> Assign to Dept ({selectedFeedbackIds.length})
                </button>
                <button
                  className={`${styles.actionButton} ${styles.approveActionButton}`}
                  onClick={() => handleBulkAction('take-own-action')}
                >
                  <i className="fas fa-gavel"></i> Take Own Action ({selectedFeedbackIds.length})
                </button>
              </>
            )}

            {selectionType === 'mixed' && (
              <span className={styles.bulkActionWarning}>
                <i className="fas fa-exclamation-triangle"></i> Select items of the same type for bulk actions.
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              className={`${styles.actionButton} ${styles.clearFilterButton}`}
              onClick={handleClearFilters}
              title="Clear all active filters"
            >
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.refreshButton}`}
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh feedback data"
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
            dashboardType="admin"
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
};

// Feedback Modal Component
const FeedbackModal = ({
  feedback,
  onClose,
  prepareRawFeedbackForDisplay,
  onApproveFeedback,
  setFeedbackData,
  setSelectedFeedback,
  user,
  fetchFeedback,
}) => {
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showAssignDept, setShowAssignDept] = useState(false);
  const [showTakeAction, setShowTakeAction] = useState(false);
  const [adminAssignNotes, setAdminAssignNotes] = useState('');
  const [adminFinalAction, setAdminFinalAction] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const isApproved = feedback.dept_status === 'approved';
  const isNoActionNeeded = feedback.dept_status === 'no_action_needed';
  const isClosed = isApproved || isNoActionNeeded;

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const auditTrail = (isClosed && feedback.actionHistory)
    ? [
        {
          timestamp: new Date(feedback.date),
          action: 'Feedback Submitted',
          user: feedback.isAnonymous ? 'Anonymous' : feedback.email || 'Unknown',
          details: `Initial submission from ${feedback.source}.`,
        },
        ...feedback.actionHistory.filter((entry, index, self) => 
          index === self.findIndex(e => 
            e.action === entry.action && 
            e.timestamp === entry.timestamp
          )
        )
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            title="Close feedback details modal"
            aria-label="Close modal"
          >
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
          {feedback.reportDetails?.trim() && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
              <p className={styles.descriptionText}>{feedback.reportDetails}</p>
            </div>
          )}

          {feedback.dept_status === 'proposed' && feedback.adminNotes && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-file-signature"></i> Administrative Instructions</h3>
              <p className={styles.descriptionText}>
                {feedback.adminNotes}
              </p>
            </div>
          )}

          {(isClosed || feedback.dept_status === 'proposed') && feedback.finalActionDescription?.trim() && (
            <div className={styles.detailSection}>
              <h3>
                <i className="fas fa-tasks"></i>{' '}
                {isClosed ? 'Final Action' : 'Final Action Proposed'}
              </h3>
              <p className={styles.descriptionText}>{feedback.finalActionDescription}</p>
            </div>
          )}
          
          {!isClosed && feedback.status === 'escalated' && feedback.dept_status !== 'proposed' && (
            <div className={styles.modalActions}>
              {!showAssignDept && !showTakeAction && (
                <>
                  <button
                    className={styles.revisionActionButton}
                    onClick={() => {
                      setShowAssignDept(true);
                      setShowTakeAction(false);
                    }}
                  >
                    <i className="fas fa-share-square"></i> Assign to Department
                  </button>
                  <button
                    className={styles.approveActionButton}
                    onClick={() => {
                      setShowTakeAction(true);
                      setShowAssignDept(false);
                    }}
                  >
                    <i className="fas fa-check-circle"></i> Take Own Action
                  </button>
                </>
              )}

              {showAssignDept && (
                <div className={styles.revisionRequestSection}>
                  <label className={styles.inputLabel} htmlFor="assignNotes">
                    Admin Notes / Guidance<span className={styles.requiredField}>*</span>
                  </label>
                  <textarea
                    id="assignNotes"
                    className={styles.noteTextarea}
                    value={adminAssignNotes}
                    onChange={(e) => setAdminAssignNotes(e.target.value)}
                    placeholder="Explain why you're assigning this and what the department should do..."
                  />
                  <label className={styles.inputLabel} htmlFor="departmentSelect">
                    Select Department<span className={styles.requiredField}>*</span>
                  </label>
                  <select
                    id="departmentSelect"
                    className={styles.actionSelect}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="">-- Choose a department --</option>
                    {[
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
                    ].map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <div className={styles.revisionActions}>
                    <button
                      className={styles.revisionSendButton}
                      disabled={!adminAssignNotes.trim() || !selectedDept}
                      onClick={async () => {
                        try {
                          // MODIFIED: Payload now matches bulk endpoint signature
                          const response = await axios.patch(`${BASE_URL}/api/dept/escalate-feedback`, {
                            ids: [feedback.id], // Send as array
                            adminNotes: adminAssignNotes.trim(),
                            department: selectedDept,
                            userName: user.name, // Send userName
                          });

                          if (response.status === 200) {
                            // ... success logic ...
                            onClose();
                            toast.success('Feedback assigned to department.');
                            // The bulkFeedbackUpdate event will handle the refresh
                          } else {
                            throw new Error('Unexpected response');
                          }
                        } catch (error) {
                          console.error('Error escalating feedback:', error);
                          toast.error('Failed to assign feedback. Try again.');
                        }
                      }}
                    >
                      <i className="fas fa-share-square"></i> Assign
                    </button>
                    <button
                      className={styles.revisionCancelButton}
                      onClick={() => {
                        setShowAssignDept(false);
                        setAdminAssignNotes('');
                        setSelectedDept('');
                      }}
                    >
                      <i className="fas fa-times-circle"></i> Cancel
                    </button>
                  </div>
                </div>
              )}

              {showTakeAction && (
                <div className={styles.revisionRequestSection}>
                  <h3><i className="fas fa-tasks"></i> Final Action</h3>
                  <textarea
                    id="finalAction"
                    className={styles.noteTextarea}
                    value={adminFinalAction}
                    onChange={(e) => setAdminFinalAction(e.target.value)}
                    placeholder="Describe the final resolution or action taken..."
                  />
                  <div className={styles.revisionActions}>
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
                          setFeedbackData(prev =>
                            prev.map(f =>
                              f.id === feedback.id
                                ? {
                                    ...f,
                                    dept_status: 'no_action_needed',
                                    finalActionDescription: 'No Action Required',
                                  }
                                : f
                            )
                          );
                          setSelectedFeedback(prev => ({
                            ...prev,
                            dept_status: 'no_action_needed',
                            finalActionDescription: 'No Action Required',
                          }));
                          toast.success(`Feedback ${feedback.id.toUpperCase()} marked as 'No Action Needed'.`);
                          onClose();
                        } catch (err) {
                          console.error('Error marking no action needed:', err);
                          toast.error('Failed to update feedback status.');
                        }
                      }}
                    >
                      <i className="fas fa-ban"></i> Mark No Action Needed
                    </button>
                    <button
                      className={styles.revisionSendButton}
                      disabled={!adminFinalAction.trim()}
                      onClick={async () => {
                        try {
                          const response = await axios.patch(`${BASE_URL}/api/dept/final-approve`, {
                            ids: [feedback.id],
                            finalActionDescription: adminFinalAction.trim(),
                            userName: user.name,
                          });

                          if (response.status === 200) {
                            setFeedbackData(prev =>
                              prev.map(f =>
                                f.id === feedback.id
                                  ? { ...f, dept_status: 'approved', finalActionDescription: adminFinalAction.trim(), status: null }
                                  : f
                              )
                            );
                            toast.success('Feedback approved successfully!');
                            onClose();
                          } else {
                            throw new Error('Unexpected response');
                          }
                        } catch (err) {
                          console.error('Final approval failed:', err);
                          toast.error('Failed to approve feedback.');
                        }
                      }}
                    >
                      <i className="fas fa-check-circle"></i> Approve
                    </button>
                    <button
                      className={styles.revisionCancelButton}
                      onClick={() => {
                        setShowTakeAction(false);
                        setAdminFinalAction('');
                      }}
                    >
                      <i className="fas fa-times-circle"></i> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {!isClosed && feedback.dept_status === 'proposed' && (
          <div className={styles.modalActions}>
            {!isRequestingRevision && (
              <>
                <button
                  className={styles.approveActionButton}
                  onClick={() => onApproveFeedback(feedback.id)}
                >
                  <i className="fas fa-check-circle"></i> Approve
                </button>
                <button
                  className={styles.revisionActionButton}
                  onClick={() => setIsRequestingRevision(true)}
                >
                  <i className="fas fa-edit"></i> Request Revision
                </button>
              </>
            )}

            {isRequestingRevision && (
              <div className={styles.revisionRequestSection}>
                <label className={styles.inputLabel} htmlFor="revisionNotes">
                  Notes for Revision<span className={styles.requiredField}>*</span>
                </label>
                <textarea
                  id="revisionNotes"
                  className={styles.noteTextarea}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Explain what needs to be revised..."
                />
                <div className={styles.revisionActions}>
                  <button
                    className={styles.revisionSendButton}
                    disabled={!revisionNotes.trim()}
                    onClick={async () => {
                      try {
                        // MODIFIED: Payload now matches bulk endpoint signature
                        const response = await axios.patch(`${BASE_URL}/api/dept/request-revision`, {
                          ids: [feedback.id], // Send as array
                          notes: revisionNotes.trim(),
                          userName: user.name, // Send userName
                        });

                        if (!response.data) throw new Error('Request failed');
                        
                        toast.success('Revision request sent!');
                        setIsRequestingRevision(false);
                        setRevisionNotes('');
                        onClose();
                        // The bulkFeedbackUpdate event will handle the refresh
                      } catch (err) {
                        console.error('Failed to request revision:', err);
                        toast.error(`Failed to send revision request: ${err.response?.data?.error || err.message}`);
                      }
                    }}
                  >
                    <i className="fas fa-paper-plane"></i> Send
                  </button>
                  <button
                    className={styles.revisionCancelButton}
                    onClick={() => {
                      setIsRequestingRevision(false);
                      setRevisionNotes('');
                    }}
                  >
                    <i className="fas fa-times-circle"></i> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  onApproveFeedback: PropTypes.func.isRequired,
  setFeedbackData: PropTypes.func.isRequired,
  setSelectedFeedback: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
};

// Feedback Table Component
const FeedbackTable = ({
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  selectedFeedbackIds,
  setSelectedFeedbackIds
}) => {
  const selectAllRef = useRef();

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedFeedbackIds.length > 0 && selectedFeedbackIds.length < feedback.length;
    }
  }, [selectedFeedbackIds, feedback.length]);

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allIds = feedback.map(f => f.id);
          setSelectedFeedbackIds(allIds);
      } else {
          setSelectedFeedbackIds([]);
      }
  };
  const handleSelectOne = (id) => {
      setSelectedFeedbackIds(prev =>
          prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
  };
  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
            <th>
              <input
                ref={selectAllRef}
                type="checkbox"
                onChange={handleSelectAll}
                checked={feedback.length > 0 && selectedFeedbackIds.length === feedback.length}
                aria-label="Select all feedback on this page"
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
          {feedback.length > 0 ? feedback.map((item) => (
            <tr key={item.id || `unknown-${Date.now()}`} className={styles.feedbackRow}>
              <td>
                <input
                    type="checkbox"
                    checked={selectedFeedbackIds.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    disabled={['approved', 'no_action_needed'].includes(item.dept_status)}
                    title={
                      ['approved', 'no_action_needed'].includes(item.dept_status)
                        ? 'Cannot select resolved feedback'
                        : ''
                    }
                />
              </td>
              <td>{String(item.id || 'UNKNOWN').toUpperCase()}</td>
              <td>
                {(date => (
                  <div className={styles.dateCell}>
                    {!isNaN(date.getTime()) ? (
                      <>
                        <span className={styles.dateDay}>
                          {date.getDate()}
                        </span>
                        <span className={styles.dateMonthYear}>
                          {date.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    ) : (
                      <span>---</span>
                    )}
                  </div>
                ))(new Date(item.date))}
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
                    {item.source ? (item.source.charAt(0).toUpperCase() + item.source.slice(1)) : 'Unknown'}
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
                    {(item.description || '').substring(0, 70) + ((item.description || '').length > 70 ? '...' : '')}
                  </div>
                  {item.urgent&& (
                    <span className={styles.urgentFlag}>
                      <i className="fas fa-bolt"></i> Urgent
                    </span>
                  )}
                  {item.adminNotes && (
                    <span className={styles.escalatedFlag}>
                      <i className="fas fa-reply"></i> Returned
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className={`${styles.sentimentTagBase} ${getSentimentModifierClass(item.sentiment)}`}>
                  <span className={styles.sentimentIcon}>
                    {item.sentiment === 'positive' && <i className="fas fa-smile"></i>}
                    {item.sentiment === 'neutral' && <i className="fas fa-meh"></i>}
                    {item.sentiment === 'negative' && <i className="fas fa-frown"></i>}
                  </span>
                  <span>
                    {(item.sentiment || '').charAt(0).toUpperCase() + (item.sentiment || '').slice(1)}
                  </span>
                </div>
              </td>
              <td>
                <div
                  className={`${styles.statusTagBase} ${getStatusModifierClass(
                    item.status === 'escalated' &&
                    ['approved', 'no_action_needed', 'proposed'].includes(item.dept_status)
                      ? item.dept_status
                      : item.status === 'escalated'
                      ? 'escalated'
                      : item.dept_status
                  )}`}
                >
                  {item.status === 'escalated' &&
                  ['approved', 'no_action_needed', 'proposed'].includes(item.dept_status)
                    ? item.dept_status === 'approved'
                      ? 'Approved'
                      : item.dept_status === 'no_action_needed'
                      ? 'No Action Needed'
                      : 'Proposed'
                    : item.status === 'escalated'
                    ? 'Escalated'
                    : item.dept_status === 'proposed'
                    ? 'Proposed'
                    : item.dept_status === 'approved'
                    ? 'Approved'
                    : item.dept_status === 'no_action_needed'
                    ? 'No Action Needed'
                    : 'Unknown'}
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
                      title="View feedback details"
                      className={styles.viewDetailsButton}
                      onClick={() => handleViewDetails(item)}
                      aria-label={`View details for feedback ${item.id}`}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="8" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No feedback entries match your current filters.</p>
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
};

// Main Admin Dashboard Component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [feedbackData, setFeedbackData] = useState([]);
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
  const [searchId, setSearchId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalConfig, setBulkModalConfig] = useState({});
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('');

  // Retrieve session-specific user data and create admin-specific session
  useEffect(() => {
    const loadSession = async () => {
      setIsSessionLoading(true);
      const sessionId = sessionStorage.getItem('current_dept_session');
      if (!sessionId) {
        console.warn('No session ID found in current_dept_session, redirecting to login');
        toast.error('No active session. Please log in.');
        navigate('/adminLogin');
        return;
      }

      // Create admin-specific session by copying sessionId to current_admin_session
      sessionStorage.setItem('current_admin_session', sessionId);

      try {
        const userData = JSON.parse(localStorage.getItem(`dept_user_session_${sessionId}`));
        if (userData && userData.name && userData.role && userData.username) {
          setUser({ name: userData.name, role: userData.role, username: userData.username });
        } else {
          console.warn('Invalid user data in localStorage, redirecting to login');
          toast.error('Session invalid. Please log in again.');
          sessionStorage.removeItem('current_admin_session');
          navigate('/adminLogin');
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        toast.error('Error loading session. Please log in again.');
        sessionStorage.removeItem('current_admin_session');
        navigate('/adminLogin');
      } finally {
        setIsSessionLoading(false);
      }
    };

    loadSession();
  }, [navigate]);

  const departments = [
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
  
  // Fetch feedback data
  const fetchFeedback = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/feedback`);
      if (!response.ok) throw new Error('Failed to fetch feedback');
      const data = await response.json();
      setFeedbackData(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback data.');
    }
  };

  // Initial fetch and Socket.IO setup
  useEffect(() => {
    if (user) {
      fetchFeedback();

      socket.on('feedbackUpdate', (updatedFeedback) => {
        const shouldBeVisible =
          updatedFeedback.status === 'escalated' ||
          ['proposed', 'approved', 'no_action_needed'].includes(updatedFeedback.dept_status);

        setFeedbackData(currentFeedback => {
          const index = currentFeedback.findIndex(f => f.id === updatedFeedback.id);
          const isCurrentlyVisible = index !== -1;

          if (shouldBeVisible && !isCurrentlyVisible) {
            return [...currentFeedback, updatedFeedback].sort((a, b) => new Date(b.date) - new Date(a.date));
          }

          if (shouldBeVisible && isCurrentlyVisible) {
            const newFeedbackData = [...currentFeedback];
            newFeedbackData[index] = { ...newFeedbackData[index], ...updatedFeedback };
            return newFeedbackData;
          }

          if (!shouldBeVisible && isCurrentlyVisible) {
            return currentFeedback.filter(f => f.id !== updatedFeedback.id);
          }

          return currentFeedback;
        });
      });

      socket.on('bulkFeedbackUpdate', () => {
        fetchFeedback();
        setSelectedFeedbackIds([]);
      });

      // 👇 Cleanup both listeners when user is present
      return () => {
        socket.off('feedbackUpdate');
        socket.off('bulkFeedbackUpdate');
      };
    }
  }, [user]);

  const selectionType = useMemo(() => {
    if (selectedFeedbackIds.length === 0) return 'none';
    const selectedItems = selectedFeedbackIds
      .map(id => feedbackData.find(f => f.id === id))
      .filter(Boolean);

    if (selectedItems.length === 0) return 'none';

    const allProposed = selectedItems.every(f => f.dept_status === 'proposed');
    if (allProposed) return 'proposed';

    const allEscalated = selectedItems.every(
      f =>
        f.status === 'escalated' &&
        !['proposed', 'approved', 'no_action_needed'].includes(f.dept_status)
    );
    if (allEscalated) return 'escalated';

    return 'mixed';
  }, [selectedFeedbackIds, feedbackData]);

  // NEW: Handler for all bulk action button clicks
  const handleBulkAction = (action) => {
    setBulkNotes('');
    setBulkDepartment('');

    switch (action) {
      case 'approve':
          handleBulkApprove();
        break;

      case 'request-revision':
        setBulkModalConfig({
          type: 'request-revision',
          title: `Request Revision for ${selectedFeedbackIds.length} Item(s)`,
          confirmText: 'Send Request',
          confirmIcon: 'fa-paper-plane'
        });
        setIsBulkModalOpen(true);
        break;

      case 'assign-department':
        setBulkModalConfig({
          type: 'assign-department',
          title: `Assign ${selectedFeedbackIds.length} Item(s) to Department`,
          confirmText: 'Assign',
          confirmIcon: 'fa-share-square'
        });
        setIsBulkModalOpen(true);
        break;

      case 'take-own-action':
        setBulkModalConfig({
          type: 'take-own-action',
          title: `Take Action on ${selectedFeedbackIds.length} Item(s)`
        });
        setIsBulkModalOpen(true);
        break;

      default:
        break;
    }
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
    setBulkModalConfig({});
    setBulkNotes('');
    setBulkDepartment('');
  };

  // NEW: Specific API call handlers for each bulk action
  const handleBulkApprove = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/dept/approve`, {
        ids: selectedFeedbackIds,
        userName: user.name,
      });
      toast.success(`${selectedFeedbackIds.length} item(s) approved.`);
      // No need to clear selection here, socket event will trigger refetch and clearing
    } catch (err) {
      toast.error(`Approval failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleConfirmBulkAction = async () => {
    try {
      let endpoint = '';
      let payload = {};

      switch (bulkModalConfig.type) {
        case 'request-revision':
          endpoint = '/api/dept/request-revision';
          payload = {
            ids: selectedFeedbackIds,
            notes: bulkNotes,
            userName: user.name
          };
          break;

        case 'assign-department':
          endpoint = '/api/dept/escalate-feedback';
          payload = {
            ids: selectedFeedbackIds,
            adminNotes: bulkNotes,
            department: bulkDepartment,
            userName: user.name
          };
          break;

        default:
          throw new Error("Invalid bulk action type");
      }

      await axios.patch(`${BASE_URL}${endpoint}`, payload);
      toast.success(`Action successful for ${selectedFeedbackIds.length} item(s).`);
      closeBulkModal();
    } catch (err) {
      toast.error(`Action failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleConfirmBulkTakeAction = async (type) => {
    try {
      let endpoint = '';
      let payload = {};

      if (type === 'no-action') {
        endpoint = '/api/dept/no-action';
        payload = {
          ids: selectedFeedbackIds,
          userName: user.name
        };
      } else if (type === 'approve') {
        endpoint = '/api/dept/final-approve';
        payload = {
          ids: selectedFeedbackIds,
          finalActionDescription: bulkNotes,
          userName: user.name
        };
      } else {
        throw new Error("Invalid 'take own action' type");
      }

      await axios.patch(`${BASE_URL}${endpoint}`, payload);
      toast.success(`Action successful for ${selectedFeedbackIds.length} item(s).`);
      closeBulkModal();
    } catch (err) {
      toast.error(`Action failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleLogout = async () => {
    const sessionId = sessionStorage.getItem('current_admin_session');
    if (sessionId) {
      localStorage.removeItem(`dept_user_session_${sessionId}`);
      sessionStorage.removeItem('current_admin_session');
    }
    setUser(null);
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  const prepareRawFeedbackForDisplay = feedback => {
    const displayData = { ID: feedback.id.toUpperCase() };
    if (feedback.source === 'staff') {
      displayData['Source'] = feedback.source.charAt(0).toUpperCase() + feedback.source.slice(1);
      displayData['Feedback Type'] = feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1);
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
      displayData['Sentiment'] = feedback.sentiment.charAt(0).toUpperCase() + feedback.sentiment.slice(1);
      displayData['Date'] = new Date(feedback.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      displayData['Anonymous'] = feedback.isAnonymous ? 'Yes' : 'No';
      displayData['Email'] = feedback.isAnonymous ? 'Not provided (Anonymous)' : feedback.email || 'Not provided';
    } else {
      displayData['Source'] = feedback.source.charAt(0).toUpperCase() + feedback.source.slice(1);
      displayData['Feedback Type'] = feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1);
      displayData['Department'] = feedback.department || 'Unknown';
      displayData['Rating'] = feedback.rating != null ? `${feedback.rating} out of 5 stars` : 'N/A';
      displayData['Sentiment'] = feedback.sentiment.charAt(0).toUpperCase() + feedback.sentiment.slice(1);
      displayData['Date'] = new Date(feedback.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      displayData['Anonymous'] = feedback.isAnonymous ? 'Yes' : 'No';
      displayData['Email'] = feedback.isAnonymous ? 'Not provided (Anonymous)' : feedback.email || 'Not provided';
      displayData['Phone'] = feedback.isAnonymous ? 'Not provided (Anonymous)' : feedback.phone || 'Not provided';
    }
    return displayData;
  };

  const getStatusModifierClass = status => {
    switch (status) {
      case 'proposed': return styles.proposedStatus;
      case 'escalated': return styles.escalatedStatus;
      case 'approved': return styles.approvedStatus;
      case 'no_action_needed': return styles.assignedStatus;
      default: return '';
    }
  };

  const getSentimentModifierClass = sentiment => {
    switch (sentiment) {
      case 'positive': return styles.positiveSentiment;
      case 'neutral': return styles.neutralSentiment;
      case 'negative': return styles.negativeSentiment;
      default: return '';
    }
  };

  const handleClearFilters = () => {
    toast.info('Filters cleared.');
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
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchFeedback(); // assuming this is your data fetcher
      toast.info('Feedback refreshed.');
    } catch (error) {
      console.error('Failed to refresh feedback:', error);
      toast.error('Failed to refresh feedback.');
    } finally {
      setLoading(false);
    }
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
        case 'today': return feedbackDate >= today;
        case 'week': return feedbackDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        case 'month': return feedbackDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case 'quarter': return feedbackDate >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        default: return true;
      }
    });
  };

  // Apply initial filtering for status and dept_status
  const filteredFeedback = feedbackData
    .filter(item => item.id != null)
    .filter(item => {
    const matchesStatusFilter =
      filters.status === 'all' ||
      (filters.status === 'escalated' &&
        item.status === 'escalated' &&
        !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status)) ||
      (['proposed', 'approved', 'no_action_needed'].includes(filters.status) &&
        item.dept_status === filters.status);
      const matchesSentiment = filters.sentiment === 'all' || item.sentiment === filters.sentiment;
      const matchesUrgent = filters.urgent === 'all' || (filters.urgent === 'urgent' && item.urgent) || (filters.urgent === 'non-urgent' && !item.urgent) || (filters.urgent === 'escalated' && item.adminNotes?.trim());
      const matchesFeedbackType = filters.feedbackType === 'all' || item.feedbackType === filters.feedbackType;
      const matchesRating = filters.rating === 'all' || String(item.rating) === filters.rating;
      const matchesImpactSeverity = filters.impactSeverity === 'all' || item.impactSeverity === filters.impactSeverity;
      const matchesSource = filters.source === 'all' || (filters.source === 'visitor' ? (item.source === 'visitor' || item.source === 'family') : item.source === filters.source);
      const matchesDepartment = filters.department === 'all' || (filters.department === 'others' ? !departments.includes(item.department) || !item.department : item.department === filters.department);
      const matchesSearchId = !searchId || item.id.toLowerCase().includes(searchId.toLowerCase());
      const meetsStatusCriteria =
        item.status === 'escalated' ||
        ['proposed', 'approved', 'no_action_needed'].includes(item.dept_status);
      return meetsStatusCriteria && matchesStatusFilter && matchesSentiment && matchesSource && matchesUrgent && matchesFeedbackType && matchesRating && matchesImpactSeverity && matchesDepartment && matchesSearchId;
    });

  const timeFilteredFeedback = filterByTime(filteredFeedback);
  const filteredFeedbackForExport = timeFilteredFeedback;
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

  const totalFeedback = feedbackData.length;
  const pendingApproval = feedbackData.filter(f => f.dept_status === 'proposed').length;
  const escalatedByQA = feedbackData.filter(f => f.status === 'escalated').length;
  const approved = feedbackData.filter(f => f.dept_status === 'approved').length;
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
    return null; // Redirect handled in useEffect
  }

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
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
            <MetricCard title="Total Feedback" value={totalFeedback} icon="fas fa-comments" variant="today" />
            <MetricCard title="Pending Approval" value={pendingApproval} icon="fas fa-hourglass-half" variant="warning" />
            <MetricCard title="Escalated by QA" value={escalatedByQA} icon="fas fa-exclamation-triangle" variant="orange" />
            <MetricCard title="Approved" value={approved} icon="fas fa-check-double" variant="success" />
            <MetricCard title="No Action Needed" value={noActionNeeded} icon="fas fa-folder-open" variant="primary" />
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
          departments={departments}
          selectedFeedbackIds={selectedFeedbackIds}
          handleBulkAction={handleBulkAction}
          selectionType={selectionType}
          loading={loading}
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
        />
        <div className={styles.tableFooter}>
          <div className={styles.resultsInfo}>Showing {Math.min(filters.currentPage * itemsPerPage, filteredFeedback.length)} of {filteredFeedback.length} feedback</div>
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(filters.currentPage - 1)}
              disabled={filters.currentPage === 1}
              title="Previous page"
              aria-label="Go to previous page"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                className={`${styles.paginationButton} ${filters.currentPage === index + 1 ? styles.activePage : ''}`}
                onClick={() => handlePageChange(index + 1)}
                title={`Go to page ${index + 1}`}
                aria-label={`Go to page ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(filters.currentPage + 1)}
              disabled={filters.currentPage === totalPages}
              title="Next page"
              aria-label="Go to next page"
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
            setFeedbackData={setFeedbackData}
            setSelectedFeedback={setSelectedFeedback}
            user={user}
            fetchFeedback={fetchFeedback}
            onApproveFeedback={async (id) => {
              try {
                // Ensure user.name exists
                if (!user?.name) {
                  toast.error('User session not loaded. Please log in again.');
                  return;
                }

                const response = await axios.patch(`${BASE_URL}/api/dept/approve`, {
                  ids: [id],
                  userName: user.name,
                });

                if (response.status !== 200) {
                  throw new Error(`Approval failed: ${response.status} - ${response.data.error || 'Unknown error'}`);
                }

                setFeedbackData(prev =>
                  prev.map(f => (f.id === id ? { ...f, dept_status: 'approved' } : f))
                );
                setSelectedFeedback(prev => ({ ...prev, dept_status: 'approved' }));
                toast.success('Feedback approved successfully!');
                closeModal();
              } catch (error) {
                console.error('Error approving feedback:', error.response?.data || error.message);
                toast.error(`Failed to approve feedback: ${error.response?.data?.error || error.message}`);
              }
            }}
          />
        )}
        {isBulkModalOpen && bulkModalConfig.type === 'request-revision' && (
          <BulkActionModal
            title={bulkModalConfig.title}
            onClose={closeBulkModal}
            onConfirm={handleConfirmBulkAction}
            confirmText={bulkModalConfig.confirmText}
            confirmIcon={bulkModalConfig.confirmIcon}
            isConfirmDisabled={!bulkNotes.trim()}
          >
            <label className={styles.inputLabel}>
              Notes for Revision <span className={styles.requiredField}>*</span>
            </label>
            <textarea
              className={styles.noteTextarea}
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="Explain what needs to be revised for all selected items..."
              rows="6"
            />
          </BulkActionModal>
        )}

        {isBulkModalOpen && bulkModalConfig.type === 'assign-department' && (
          <BulkActionModal
            title={bulkModalConfig.title}
            onClose={closeBulkModal}
            onConfirm={handleConfirmBulkAction}
            confirmText={bulkModalConfig.confirmText}
            confirmIcon={bulkModalConfig.confirmIcon}
            isConfirmDisabled={!bulkNotes.trim() || !bulkDepartment}
          >
            <label className={styles.inputLabel}>
              Admin Notes / Guidance <span className={styles.requiredField}>*</span>
            </label>
            <textarea
              className={styles.noteTextarea}
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="Provide guidance for the department..."
              rows="6"
            />
            <label className={styles.inputLabel}>
              Assign to Department <span className={styles.requiredField}>*</span>
            </label>
            <select
              className={styles.actionSelect}
              value={bulkDepartment}
              onChange={(e) => setBulkDepartment(e.target.value)}
            >
              <option value="">-- Choose a department --</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </BulkActionModal>
        )}

        {isBulkModalOpen && bulkModalConfig.type === 'take-own-action' && (
          <BulkTakeActionModal
            title={bulkModalConfig.title}
            onClose={closeBulkModal}
            onNoAction={() => handleConfirmBulkTakeAction('no-action')}
            onApprove={() => handleConfirmBulkTakeAction('approve')}
            isConfirmDisabled={!bulkNotes.trim()}
          >
            <label className={styles.inputLabel}>
              Final Action Description <span className={styles.requiredField}>*</span>
            </label>
            <textarea
              className={styles.noteTextarea}
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="Describe the final resolution or action taken for all selected items. This is required for approval."
              rows="6"
            />
          </BulkTakeActionModal>
        )}
      </main>
    </div>
  );
};

const AdminDashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <AdminDashboard />
  </ErrorBoundary>
);

export default AdminDashboardWithErrorBoundary;