// src/components/QADashboard/ReportModal.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import { departments } from '@data/departments';
import { format } from 'date-fns';
import PropTypes from 'prop-types';

const ReportModal = ({
  isOpen,
  onClose,
  currentFilters,
  currentTimeFilter,
  currentCustomStart,
  currentCustomEnd,
  allFeedbackData,
  onGenerate,
  generating,
  styles,
}) => {
  const [filters, setFilters] = useState(currentFilters);
  const [timeFilter, setTimeFilter] = useState(currentTimeFilter);
  const [customStart, setCustomStart] = useState(currentCustomStart);
  const [customEnd, setCustomEnd] = useState(currentCustomEnd);

  // Sync with parent when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
      setTimeFilter(currentTimeFilter);
      setCustomStart(currentCustomStart);
      setCustomEnd(currentCustomEnd);
    }
  }, [isOpen, currentFilters, currentTimeFilter, currentCustomStart, currentCustomEnd]);

  const applyFilters = () => {
    let filtered = allFeedbackData;

    // Status
    if (filters.status !== 'all') {
      filtered = filtered.filter(f => f.status === filters.status);
    }

    // Sentiment
    if (filters.sentiment !== 'all') {
      if (filters.sentiment === 'pending') {
        filtered = filtered.filter(f => !f.sentiment);
      } else {
        filtered = filtered.filter(f => f.sentiment === filters.sentiment);
      }
    }

    // Source
    if (filters.source !== 'all') {
      if (filters.source === 'visitor') {
        filtered = filtered.filter(f => f.source === 'visitor' || f.source === 'family');
      } else {
        filtered = filtered.filter(f => f.source === filters.source);
      }
    }

    // Urgency
    if (filters.urgent === 'urgent') {
      filtered = filtered.filter(f => f.urgent === true);
    } else if (filters.urgent === 'non-urgent') {
      filtered = filtered.filter(f => f.urgent !== true);
    }

    // Feedback Type
    if (filters.feedbackType !== 'all') {
      filtered = filtered.filter(f => f.feedbackType === filters.feedbackType);
    }

    // Rating
    if (filters.rating !== 'all') {
      filtered = filtered.filter(f => f.rating === parseInt(filters.rating));
    }

    // Impact Severity
    if (filters.impactSeverity !== 'all') {
      filtered = filtered.filter(f => f.impactSeverity === filters.impactSeverity);
    }

    // Department
    if (filters.department !== 'all') {
      if (filters.department === 'others') {
        filtered = filtered.filter(f => !f.department || !departments.includes(f.department));
      } else {
        filtered = filtered.filter(f => f.department === filters.department);
      }
    }

    // Time filtering
    if (timeFilter !== 'all' && timeFilter !== 'custom') {
      const now = new Date();
      let startDate;
      switch (timeFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        default:
          startDate = null;
      }
      if (startDate) {
        filtered = filtered.filter(f => new Date(f.date) >= startDate);
      }
    } else if (timeFilter === 'custom' && customStart) {
      filtered = filtered.filter(f => new Date(f.date) >= customStart);
      if (customEnd) {
        const endPlusOne = new Date(customEnd);
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        filtered = filtered.filter(f => new Date(f.date) < endPlusOne);
      }
    }

    return filtered;
  };

  const filteredData = applyFilters();
  const count = filteredData.length;

  // Build human-readable filter summary and date range
  const buildFilterSummary = () => {
    const parts = [];

    if (filters.department !== 'all') {
      const label = filters.department === 'others' ? 'Others' : filters.department;
      parts.push(`Department: ${label}`);
    }
    if (filters.source !== 'all') {
      const label = filters.source === 'visitor' ? 'Visitor/Family' : filters.source.charAt(0).toUpperCase() + filters.source.slice(1);
      parts.push(`Source: ${label}`);
    }
    if (filters.sentiment !== 'all') {
      const label = filters.sentiment === 'pending' ? 'Pending' : filters.sentiment.charAt(0).toUpperCase() + filters.sentiment.slice(1);
      parts.push(`Sentiment: ${label}`);
    }
    if (filters.urgent !== 'all') {
      parts.push(`Urgency: ${filters.urgent.charAt(0).toUpperCase() + filters.urgent.slice(1)}`);
    }

    return {
      filtersText: parts.length > 0 ? parts.join(' | ') : 'None',
      dateRange: getDateRangeText(),
      source: filters.source === 'all' ? 'Mixed' : 
             filters.source === 'staff' ? 'Internal (Staff)' : 
             'External (Patient/Visitor/Family)'
    };
  };

  const getDateRangeText = () => {
    if (timeFilter === 'all') return 'All Time';
    if (timeFilter === 'today') return 'Today';
    if (timeFilter === 'week') return 'Last 7 Days';
    if (timeFilter === 'month') return 'Last Month';
    if (timeFilter === 'quarter') return 'Last Quarter';
    if (timeFilter === 'custom') {
      if (customStart && customEnd) {
        return `${format(customStart, 'MMM d, yyyy')} – ${format(customEnd, 'MMM d, yyyy')}`;
      } else if (customStart) {
        return `From ${format(customStart, 'MMM d, yyyy')}`;
      }
    }
    return 'Custom Range';
  };

  const filterSummary = buildFilterSummary();

  // Get chart list from AnalyticsSection (exposed via window)
  const chartList = window.currentChartList || [];

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map(d => ({ value: d, label: d })),
    { value: 'others', label: 'Others' },
  ];

  const getFeedbackTypeOptions = () => {
    if (filters.source === 'staff') {
      return [
        { value: 'all', label: 'All Feedback Types' },
        { value: 'operational', label: 'Operational Issue' },
        { value: 'safety', label: 'Safety Concern' },
        { value: 'improvement', label: 'Improvement Suggestion' },
        { value: 'recognition', label: 'Recognition' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'other', label: 'Other' },
      ];
    }
    if (['patient', 'visitor'].includes(filters.source)) {
      return [
        { value: 'all', label: 'All Feedback Types' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'suggestion', label: 'Suggestion' },
        { value: 'compliment', label: 'Compliment' },
        { value: 'other', label: 'Other' },
      ];
    }
    return [];
  };

  const feedbackTypeOptions = getFeedbackTypeOptions();

  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '1', label: '1 Star' },
    { value: '2', label: '2 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '5', label: '5 Stars' },
  ];

  const impactOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'minor', label: 'Minor' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'critical', label: 'Critical' },
  ];

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.reportModal}>
        <div className={styles.modalHeader}>
          <h2>Create Executive Report</h2>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.reportInfo}>
            <strong>{count}</strong> feedback items will be included in the report based on current filters.
          </p>

          <p className={styles.previewSummary}>
            <strong>Period:</strong> {filterSummary.dateRange}<br />
            <strong>Source:</strong> {filterSummary.source}<br />
            <strong>Filters Applied:</strong> {filterSummary.filtersText}
          </p>

          {/* Time Filter Tabs */}
          <div className={styles.timeFilterContainer}>
            <div className={styles.timeFilter}>
              {['all', 'today', 'week', 'month', 'quarter'].map(f => (
                <span
                  key={f}
                  className={`${styles.timeFilterTab} ${timeFilter === f ? styles.activeFilter : ''}`}
                  onClick={() => setTimeFilter(f)}
                >
                  {f === 'all' ? 'All Time' : f.charAt(0).toUpperCase() + f.slice(1)}
                </span>
              ))}
            </div>
            <button
              className={`${styles.advancedFilterButton} ${timeFilter === 'custom' ? styles.activeFilter : ''}`}
              onClick={() => setTimeFilter(timeFilter === 'custom' ? 'all' : 'custom')}
            >
              <i className="fas fa-calendar-alt"></i> Custom Range
            </button>
          </div>

          {/* Custom Date Pickers */}
          {timeFilter === 'custom' && (
            <div className={styles.customDateRange}>
              <div className={styles.datePickerGroup}>
                <label>From:</label>
                <DatePicker
                  selected={customStart}
                  onChange={setCustomStart}
                  selectsStart
                  startDate={customStart}
                  endDate={customEnd}
                  className={styles.datePicker}
                  placeholderText="Select start date"
                />
              </div>
              <div className={styles.datePickerGroup}>
                <label>To:</label>
                <DatePicker
                  selected={customEnd}
                  onChange={setCustomEnd}
                  selectsEnd
                  startDate={customStart}
                  endDate={customEnd}
                  minDate={customStart}
                  className={styles.datePicker}
                  placeholderText="Select end date"
                />
              </div>
            </div>
          )}

          {/* Filters Grid */}
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Status</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="not_manage">Not Managed</option>
                <option value="managed">Managed</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Sentiment</label>
              <select value={filters.sentiment} onChange={e => setFilters({ ...filters, sentiment: e.target.value })}>
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="pending">Pending Analysis</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Source</label>
              <select
                value={filters.source}
                onChange={e => setFilters({
                  ...filters,
                  source: e.target.value,
                  feedbackType: 'all',
                  rating: 'all',
                  impactSeverity: 'all'
                })}
              >
                <option value="all">All Sources</option>
                <option value="staff">Staff Only</option>
                <option value="patient">Patient Only</option>
                <option value="visitor">Visitor/Family</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Urgency</label>
              <select value={filters.urgent} onChange={e => setFilters({ ...filters, urgent: e.target.value })}>
                <option value="all">All</option>
                <option value="urgent">Urgent Only</option>
                <option value="non-urgent">Non-Urgent Only</option>
              </select>
            </div>

            {feedbackTypeOptions.length > 0 && (
              <div className={styles.filterGroup}>
                <label>Feedback Type</label>
                <select value={filters.feedbackType} onChange={e => setFilters({ ...filters, feedbackType: e.target.value })}>
                  {feedbackTypeOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {['patient', 'visitor'].includes(filters.source) && (
              <div className={styles.filterGroup}>
                <label>Star Rating</label>
                <select value={filters.rating} onChange={e => setFilters({ ...filters, rating: e.target.value })}>
                  {ratingOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {filters.source === 'staff' && (
              <div className={styles.filterGroup}>
                <label>Impact Severity</label>
                <select value={filters.impactSeverity} onChange={e => setFilters({ ...filters, impactSeverity: e.target.value })}>
                  {impactOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.filterGroup}>
              <label>Department</label>
              <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })}>
                {departmentOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button
            onClick={() => onGenerate({
              filteredData,
              filterSummary,
              chartList
            })}
            disabled={generating || count === 0}
            className={styles.generateBtn}
          >
            {generating ? 'Generating Report...' : `Generate Report (${count} items)`}
          </button>
        </div>
      </div>
    </div>
  );
};

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentFilters: PropTypes.object.isRequired,
  currentTimeFilter: PropTypes.string.isRequired,
  currentCustomStart: PropTypes.instanceOf(Date),
  currentCustomEnd: PropTypes.instanceOf(Date),
  allFeedbackData: PropTypes.array.isRequired,
  onGenerate: PropTypes.func.isRequired,
  generating: PropTypes.bool.isRequired,
  styles: PropTypes.object.isRequired,
};

export default ReportModal;