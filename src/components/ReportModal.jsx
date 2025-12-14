// src/components/QADashboard/ReportModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from "react-datepicker";
import { departments } from '@data/departments';
import { format } from 'date-fns';
import PropTypes from 'prop-types';
import { Bar, Pie } from 'react-chartjs-2';

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
  const [showPreview, setShowPreview] = useState(false);

  // Sync with parent when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
      setTimeFilter(currentTimeFilter);
      setCustomStart(currentCustomStart);
      setCustomEnd(currentCustomEnd);
      setShowPreview(false);
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

  const filteredData = useMemo(() => applyFilters(), [
    filters, 
    timeFilter, 
    customStart, 
    customEnd, 
    allFeedbackData
  ]);

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
             'External (Patient/Visitor/Family)',
      department: filters.department === 'all' ? 'All Departments' :
                 filters.department === 'others' ? 'Others' :
                 filters.department
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
        return `${format(customStart, 'MMM d, yyyy')} — ${format(customEnd, 'MMM d, yyyy')}`;
      } else if (customStart) {
        return `From ${format(customStart, 'MMM d, yyyy')}`;
      }
    }
    return 'Custom Range';
  };

  const filterSummary = buildFilterSummary();

  // =================================================================================
  // DATA PREPARATION FOR CHARTS
  // =================================================================================
  const now = useMemo(() => new Date(), []);

  // 1. Feedback Volume Over Time
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
          filteredData.filter(f => new Date(f.date).toDateString() === todayStr).length,
          filteredData.filter(f => new Date(f.date) >= weekAgo).length,
          filteredData.filter(f => new Date(f.date) >= monthAgo).length,
          filteredData.filter(f => new Date(f.date) >= quarterAgo).length,
        ],
        backgroundColor: 'rgba(26, 115, 232, 0.6)',
      }],
    };
  }, [filteredData, now]);

  // 2. Sentiment Distribution
  const sentimentData = useMemo(() => ({
    labels: ['Positive', 'Neutral', 'Negative', 'Pending'],
    datasets: [{
      data: [
        filteredData.filter(f => f.sentiment === 'positive').length,
        filteredData.filter(f => f.sentiment === 'neutral').length,
        filteredData.filter(f => f.sentiment === 'negative').length,
        filteredData.filter(f => !f.sentiment && f.sentiment_status === 'pending').length,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#1a73e8'],
    }],
  }), [filteredData]);

  // 3. Source Distribution
  const sourceData = useMemo(() => ({
    labels: ['Staff', 'Patient', 'Visitor/Family'],
    datasets: [{
      data: [
        filteredData.filter(f => f.source === 'staff').length,
        filteredData.filter(f => f.source === 'patient').length,
        filteredData.filter(f => f.source === 'visitor' || f.source === 'family').length,
      ],
      backgroundColor: ['#00b7eb', '#ff6b6b', '#4caf50'],
    }],
  }), [filteredData]);

  // 4. Department Volume
  const departmentCounts = useMemo(() => filteredData.reduce((acc, f) => {
    const dept = f.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {}), [filteredData]);

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

  // 5. Internal Feedback Type Distribution (Pie)
  const internalFeedback = useMemo(() => filteredData.filter(f => f.source === 'staff'), [filteredData]);
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

  // 6. External Feedback Type Distribution (Pie)
  const externalFeedback = useMemo(() => filteredData.filter(f => ['patient', 'visitor', 'family'].includes(f.source)), [filteredData]);
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

  // 7. Overall Urgency Distribution (Pie)
  const urgencyData = useMemo(() => ({
    labels: ['Urgent', 'Non-Urgent'],
    datasets: [{
      data: [
        filteredData.filter(f => f.urgent === true).length,
        filteredData.filter(f => f.urgent !== true).length,
      ],
      backgroundColor: ['#dc2626', '#94a3b8'],
    }],
  }), [filteredData]);

  // 8. Department Sentiment Percentage (Stabilized)
  const getDepartmentSentimentStats = useMemo(() => () => {
    const POSITIVE_PRIOR = 1;
    const NEUTRAL_PRIOR = 1;
    const NEGATIVE_PRIOR = 1;
    const SENTIMENT_PRIOR_TOTAL = 3;

    const stats = {};

    filteredData.forEach(f => {
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
  }, [filteredData]);
  const allDeptStats = useMemo(() => getDepartmentSentimentStats(), [getDepartmentSentimentStats]);

  // 9. Internal Feedback Type % by Department (Stabilized)
  const getInternalTypeByDeptStats = useMemo(() => () => {
    const OPERATIONAL_PRIOR = 1;
    const SAFETY_PRIOR = 1;
    const IMPROVEMENT_PRIOR = 1;
    const RECOGNITION_PRIOR = 1;
    const COMPLAINT_PRIOR = 1;
    const OTHER_PRIOR = 1;
    const INTERNAL_TYPE_PRIOR_TOTAL = 6;

    const stats = {};

    filteredData
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
  }, [filteredData]);
  const internalTypeByDeptStats = useMemo(() => getInternalTypeByDeptStats(), [getInternalTypeByDeptStats]);

  // 10. External Feedback Type % by Department (Stabilized)
  const getExternalTypeByDeptStats = useMemo(() => () => {
    const COMPLAINT_PRIOR = 1;
    const SUGGESTION_PRIOR = 1;
    const COMPLIMENT_PRIOR = 1;
    const OTHER_PRIOR = 1;
    const EXTERNAL_TYPE_PRIOR_TOTAL = 4;

    const stats = {};

    filteredData
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
  }, [filteredData]);
  const externalTypeByDeptStats = useMemo(() => getExternalTypeByDeptStats(), [getExternalTypeByDeptStats]);

  // 11. Average Star Rating by Department (External only)
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

  // 12. Impact Severity % by Department (Staff only)
  const getImpactSeverityStats = useMemo(() => () => {
    const MINOR_PRIOR = 1;
    const MODERATE_PRIOR = 1;
    const CRITICAL_PRIOR = 1;
    const IMPACT_PRIOR_TOTAL = 3;

    const stats = {};

    filteredData
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
  }, [filteredData]);
  const impactSeverityStats = useMemo(() => getImpactSeverityStats(), [getImpactSeverityStats]);

  // 13. Urgency Percentage by Department (Stabilized)
  const getUrgencyByDeptStats = useMemo(() => () => {
    const URGENT_PRIOR = 1;
    const NON_URGENT_PRIOR = 1;
    const URGENCY_PRIOR_TOTAL = 2;

    const stats = {};

    filteredData.forEach(f => {
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
  }, [filteredData]);
  const urgencyByDeptStats = useMemo(() => getUrgencyByDeptStats(), [getUrgencyByDeptStats]);


  // =================================================================================
  // GENERATE CHART METADATA FOR PDF
  // =================================================================================
  const chartList = useMemo(() => {
    const charts = [
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

    if (internalTypeByDeptStats.length > 0) {
      charts.push({
        title: 'Internal Feedback Type Distribution by Department (%) (Stabilized)',
        description: 'Percentage distribution of staff feedback categories across departments with Bayesian stabilization.'
      });
    }

    if (externalTypeByDeptStats.length > 0) {
      charts.push({
        title: 'External Feedback Type Distribution by Department (%) (Stabilized)',
        description: 'Percentage distribution of patient/visitor feedback categories across departments with Bayesian stabilization.'
      });
    }

    if (impactSeverityStats.length > 0) {
      charts.push({
        title: 'Impact Severity Distribution by Department (%) – Staff Feedback (Stabilized)',
        description: 'Percentage breakdown of Minor, Moderate, and Critical severity levels reported by staff across departments.'
      });
    }

    if (urgencyByDeptStats.length > 0) {
      charts.push({
        title: 'Urgent Feedback Percentage by Department (Stabilized)',
        description: 'Percentage of feedback marked as urgent within each department, with Bayesian smoothing applied.'
      });
    }

    if (ratingByDeptStats.length > 0) {
      charts.push({
        title: 'Average Star Rating by Department (Patient/Visitor/Family)',
        description: 'Average satisfaction ratings (1-5 stars) given by patients, visitors, and family members for each department.'
      });
    }

    return charts;
  }, [
    internalTypeByDeptStats.length,
    externalTypeByDeptStats.length,
    impactSeverityStats.length,
    urgencyByDeptStats.length,
    ratingByDeptStats.length
  ]);

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
      <div className={styles.reportModal} style={{ maxWidth: showPreview ? '95vw' : '800px', maxHeight: '90vh', overflow: 'auto' }}>
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

          {/* Chart Preview Toggle */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className={`fas fa-chart-${showPreview ? 'line' : 'bar'}`}></i> {showPreview ? 'Hide' : 'Show'} Chart Preview
            </button>
          </div>

          {/* Hidden Charts for PDF Generation */}
          <div style={{ display: showPreview ? 'block' : 'none' }}>
            <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#1f2937' }}>Report Charts Preview</h3>
            
            {/* Chart 1 */}
            <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '15px' }}>Feedback Volume Over Time</h4>
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
            </div>

            {/* Chart 2 */}
            <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '15px' }}>Feedback Volume by Department</h4>
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
            </div>

            {/* Charts 3 & 4 (Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="report-chart-container chart-for-pdf" style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Sentiment Distribution</h4>
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
              </div>

              <div className="report-chart-container chart-for-pdf" style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Source Distribution</h4>
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
              </div>
            </div>

            {/* Charts 5 & 6 (Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="report-chart-container chart-for-pdf" style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Internal Feedback Type Distribution</h4>
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
              </div>

              <div className="report-chart-container chart-for-pdf" style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>External Feedback Type Distribution</h4>
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
              </div>
            </div>

            {/* Chart 7 */}
            <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', maxWidth: '720px', margin: '0 auto 30px auto' }}>
              <h4 style={{ marginBottom: '15px' }}>Overall Urgency Distribution</h4>
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
            </div>

            {/* Chart 8 */}
            <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '15px' }}>Department Sentiment Percentage (Stabilized)</h4>
              <div style={{ height: '600px' }}>
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
            </div>

            {/* Chart 9 (Conditional) */}
            {internalTypeByDeptStats.length > 0 && (
              <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Internal Feedback Type Distribution by Department (%) (Stabilized)</h4>
                <div style={{ height: '600px' }}>
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

            {/* Chart 10 (Conditional) */}
            {externalTypeByDeptStats.length > 0 && (
              <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>External Feedback Type Distribution by Department (%) (Stabilized)</h4>
                <div style={{ height: '600px' }}>
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

            {/* Chart 11 (Conditional) */}
            {impactSeverityStats.length > 0 && (
              <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Impact Severity Distribution by Department (%) – Staff Feedback (Stabilized)</h4>
                <div style={{ height: '600px' }}>
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

            {/* Chart 12 (Conditional) */}
            {urgencyByDeptStats.length > 0 && (
              <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Urgent Feedback Percentage by Department (Stabilized)</h4>
                <div style={{ height: '600px' }}>
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

            {/* Chart 13 (Conditional) */}
            {ratingByDeptStats.length > 0 && (
              <div className="report-chart-container chart-for-pdf" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px' }}>Average Star Rating by Department (Patient/Visitor/Family)</h4>
                <div style={{ height: '600px' }}>
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
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button
            onClick={async () => {
              // If charts aren't visible, show them briefly to capture
              if (!showPreview) {
                setShowPreview(true);
                // Wait for charts to render
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              onGenerate({
                filteredData,
                filterSummary,
                chartList
              });
            }}
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