import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { handleLogout, handleBroadcastMessageFactory, handleGenerateReportFactory, handleEscalateFactory, handleTagAsSpamFactory, handleRestoreFactory, handleBulkRestoreFactory, handleBulkSpamFactory, handleBulkGenerateReportFactory, handleBulkEscalateFactory, handleViewDetailsFactory, handleViewHistoryFactory } from './QADashboard.handlers';
import styles from '@assets/css/Dashboard.module.css';
import io from 'socket.io-client';
import Header from '@components/QADashboard/Header';
import MetricCard from '@components/QADashboard/MetricCard';
import AnalyticsSection from '@components/QADashboard/AnalyticsSection';
import FilterSection from '@components/QADashboard/FilterSection';
import AuditTrailModal from '@components/QADashboard/AuditTrailModal';
import FeedbackTable from '@components/QADashboard/FeedbackTable';
import FeedbackModal from '@components/QADashboard/FeedbackModal';
import ReportModal from '@components/QADashboard/ReportModal';
import BulkReportModal from '@components/QADashboard/BulkReportModal';
import departmentsForAssignment from './departments';
import "react-datepicker/dist/react-datepicker.css";
import 'react-toastify/dist/ReactToastify.css';

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

const QADashboard = () => {
  const navigate = useNavigate();
  const sessionId = sessionStorage.getItem('current_qa_session');
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
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [bulkReportContent, setBulkReportContent] = useState('');
  const [bulkReportDepartment, setBulkReportDepartment] = useState('');
  const broadcastChannelRef = useRef(null);
  const processedEventsRef = useRef(new Set());
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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

  const user = JSON.parse(localStorage.getItem(`qa_user_session_${sessionId}`)) || {
    name: 'Unknown',
    role: 'Unknown',
  };

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

  const handleBroadcastMessage = useCallback(
    handleBroadcastMessageFactory({
      tabId,
      processedEventsRef,
      selectedFeedback,
      isModalOpen,
      isReportModalOpen,
      isAuditTrailModalOpen,
      isBulkReportModalOpen,
      selectedFeedbackIds,
      setFeedbackData,
      setSelectedFeedbackIds,
      setIsModalOpen,
      setIsReportModalOpen,
      setIsAuditTrailModalOpen,
      setSelectedFeedback,
      setIsBulkReportModalOpen,
      setBulkReportContent,
      setBulkReportDepartment,
    }),
    [
      tabId,
      selectedFeedback,
      isModalOpen,
      isReportModalOpen,
      isAuditTrailModalOpen,
      isBulkReportModalOpen,
      selectedFeedbackIds,
    ]
  );

  const closeReportModal = () => {
    setIsReportModalOpen(false);
  };

  const closeBulkReportModal = () => {
    setIsBulkReportModalOpen(false);
    setBulkReportContent('');
    setBulkReportDepartment('');
    setSelectedFeedbackIds([]);
  };

  const handleGenerateReport = handleGenerateReportFactory({
    feedbackData,
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    user,
    socket,
    broadcastChannelRef,
    tabId,
    closeReportModal,
  });

  const handleEscalate = handleEscalateFactory({
    feedbackData,
    setFeedbackData,
    setReportStates,
    socket,
    broadcastChannelRef,
    tabId,
    toast,
    user,
    closeReportModal,
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
  });

  const handleTagAsSpam = handleTagAsSpamFactory({
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    user,
    socket,
    broadcastChannelRef,
    tabId,
  });

  const handleRestore = handleRestoreFactory({
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    user,
    socket,
    broadcastChannelRef,
    tabId,
  });

  const handleBulkSpam = handleBulkSpamFactory({
    feedbackData,
    selectedFeedbackIds,
    setSelectedFeedbackIds,
    setFeedbackData,
    selectedFeedback,
    setSelectedFeedback,
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    user,
    socket,
    broadcastChannelRef,
    tabId,
  });

  const handleBulkRestore = handleBulkRestoreFactory({
    feedbackData,
    selectedFeedbackIds,
    setSelectedFeedbackIds,
    setFeedbackData,
    selectedFeedback,
    setSelectedFeedback,
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    user,
    socket,
    broadcastChannelRef,
    tabId,
  });

  const handleBulkGenerateReport = handleBulkGenerateReportFactory({
    feedbackData,
    selectedFeedbackIds,
    bulkReportContent,
    bulkReportDepartment,
    user,
    socket,
    broadcastChannelRef,
    tabId,
    toast,
    closeBulkReportModal,
    setFeedbackData,
    selectedFeedback,
    setSelectedFeedback,
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
  });

  const handleBulkEscalate = handleBulkEscalateFactory({
    feedbackData,
    selectedFeedbackIds,
    bulkReportContent,
    bulkReportDepartment,
    user,
    socket,
    broadcastChannelRef,
    tabId,
    toast,
    closeBulkReportModal,
    setFeedbackData,
    BASE_URL
  });
  
  const handleViewGeneratedReport = (feedback) => {
    setSelectedFeedback(feedback);
    setIsReportModalOpen(true);
    setReportViewed(feedback.id, true);
  };

  const handleCreateReportClick = () => {
    setIsModalOpen(false);
    setIsReportModalOpen(true);
  };

  const handleViewDetails = handleViewDetailsFactory({
    setSelectedFeedback,
    setIsModalOpen,
    reportStates,
    setReportStates,
    departmentsForAssignment
  });

  const handleViewHistory = handleViewHistoryFactory({
    BASE_URL,
    toast,
    setSelectedFeedback,
    setIsAuditTrailModalOpen
  });

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

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  const closeAuditTrailModal = () => {
    setIsAuditTrailModalOpen(false);
    setSelectedFeedback(null);
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

  useEffect(() => {
    if (user.name.toLowerCase() === 'unknown') {
      toast.info('User not authenticated. Logging out.');
      handleLogout({ sessionId, navigate, setError });
    }
  }, [user.name, sessionId, navigate, setError]);

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
  const todayFeedbackCount = feedbackData.filter(f => new Date(f.date).toDateString() === new Date().toDateString()).length;
  const totalFeedback = feedbackData.length;
  const unassignedFeedbackCount = feedbackData.filter(f => f.status === 'unassigned').length;
  const assignedFeedbackCount = feedbackData.filter(f => f.status === 'assigned').length;
  const escalateFeebackCount = feedbackData.filter(f => f.status === 'escalated').length;

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} />
      <Header
        styles={styles}
        userName={user.name}
        userRole={user.role}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        onLogout={() => handleLogout({ sessionId, navigate, setError })}
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
        <AnalyticsSection styles={styles} feedbackData={timeFilteredFeedback} />
        <FilterSection
          styles={styles}
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
          styles={styles}
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
            styles={styles}
            BASE_URL={BASE_URL}
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
            BASE_URL={BASE_URL}
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
            styles={styles}
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