import DatePicker from "react-datepicker";
import ExportPDFButton from '@components/ExportPDFButton';
import PropTypes from 'prop-types';

const FilterSection = ({
  styles,
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
            <option value="failed">Failed</option>
            <option value="spam">Spam</option>
            <option value="not_manage">Not Managed</option>
            <option value="managed">Managed</option>
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
        {filters.status !== 'all' ? ` Status: ${filters.status.replace('_', ' ')},` : ''}
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
          {hasActiveFilters && (
            <button className={`${styles.actionButton} ${styles.clearFilterButton}`} onClick={handleClearFilters}>
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.refreshButton}`}
            onClick={handleRefresh}
            disabled={loading}
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
            dashboardType="qa"
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            variant="primary"
            size="medium"
          />
        </div>
      </div>
    </section>
  );
};

FilterSection.propTypes = {
  styles: PropTypes.object.isRequired,
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
  loading: PropTypes.bool.isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  filteredFeedback: PropTypes.array.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
};

export default FilterSection;