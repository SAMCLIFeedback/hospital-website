import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Title } from 'chart.js';
import {
  handleLogout,
  handleBroadcastMessageFactory,
  handleViewDetailsFactory,
  handleViewHistoryFactory
} from './QADashboard.handlers';
import styles from '@assets/css/Dashboard.module.css';
import io from 'socket.io-client';
import Header from '@components/QADashboard/Header';
import MetricCard from '@components/MetricCard';
import AnalyticsSection from '@sections/QADashboard/AnalyticsSection';
import FilterSection from '@sections/QADashboard/FilterSection';
import AuditTrailModal from '@components/QADashboard/AuditTrailModal';
import FeedbackTable from '@components/QADashboard/FeedbackTable';
import FeedbackModal from '@components/QADashboard/FeedbackModal';
import { departments } from '@data/departments';
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

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const QADashboard = () => {
  const navigate = useNavigate();
  const sessionId = sessionStorage.getItem('current_qa_session');
  const [feedbackData, setFeedbackData] = useState([]);
  const [tabId] = useState(uuidv4());
  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditTrailModalOpen, setIsAuditTrailModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
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

  const handleScroll = useCallback(() => {
    setIsHeaderVisible(window.scrollY <= 5);
  }, []);

  const handleBroadcastMessage = useCallback(
    handleBroadcastMessageFactory({
      tabId,
      processedEventsRef,
      selectedFeedback,
      isModalOpen,
      isAuditTrailModalOpen,
      setFeedbackData,
      setIsModalOpen,
      setIsAuditTrailModalOpen,
      setSelectedFeedback,
    }),
    [tabId, selectedFeedback, isModalOpen, isAuditTrailModalOpen]
  );

  const handleViewDetails = handleViewDetailsFactory({
    setSelectedFeedback,
    setIsModalOpen,
  });

  const handleViewHistory = handleViewHistoryFactory({
    BASE_URL,
    toast,
    setSelectedFeedback,
    setIsAuditTrailModalOpen,
  });

  const handlePageChange = page => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchFeedback();
    toast.info('Feedback refreshed.', { autoClose: 1000 });
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
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  const closeAuditTrailModal = () => {
    setIsAuditTrailModalOpen(false);
    setSelectedFeedback(null);
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
      case 'not_manage':
        return styles.unassignedStatus;
      case 'managed':
        return styles.assignedStatus;
      case 'failed':
        return styles.failedStatus;
      default:
        return '';
    }
  };

  const formatStatusLabel = status => {
    if (!status) return 'Unknown';
    if (status === 'not_manage') return 'Not Manage';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
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
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    if ('BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('feedback_updates');
      broadcastChannelRef.current.onmessage = handleBroadcastMessage;
    }

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
          actionHistory: updatedFeedback.actionHistory || [],
        };

        const index = prevData.findIndex(f => f.id === normalizedFeedback.id);
        const newData = index !== -1
          ? [...prevData.slice(0, index), { ...prevData[index], ...normalizedFeedback }, ...prevData.slice(index + 1)]
          : [normalizedFeedback, ...prevData];
        
        return Array.from(new Map(newData.map(f => [f.id, f])).values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    });

    socket.on('connect_error', (err) => toast.error('Failed to connect to real-time updates. Retrying...'));
    socket.on('disconnect', () => console.log('WebSocket disconnected'));

    return () => {
      socket.off('connect');
      socket.off('feedbackUpdate');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
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
    let matchesDepartment = filters.department === 'all' || (filters.department === 'others' ? !departments.includes(item.department) || !item.department : item.department === filters.department);
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

  const todayFeedbackCount = feedbackData.filter(f => 
    new Date(f.date).toDateString() === new Date().toDateString()
  ).length;

  const totalFeedback = feedbackData.length;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthlyFeedback = feedbackData.filter(f => {
    const date = new Date(f.date);
    return date >= currentMonthStart && date < currentMonthEnd;
  });

  const positiveThisMonth = monthlyFeedback.filter(f => f.sentiment === 'positive').length;
  const neutralThisMonth  = monthlyFeedback.filter(f => f.sentiment === 'neutral').length;
  const negativeThisMonth = monthlyFeedback.filter(f => f.sentiment === 'negative').length;

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} />
      <div className={`${styles.headerWrapper} ${isHeaderVisible ? styles.headerVisible : styles.headerHidden}`}>
        <Header
          styles={styles}
          userName={user.name}
          userRole={user.role}
          date={new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          onLogout={() => handleLogout({ sessionId, navigate, setError })}
        />
      </div>
      <main className={styles.mainContent}>
        <section className={styles.overviewSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionHeading}>Performance Overview</h2>
          </div>
          <div className={styles.metricGrid}>
            <MetricCard 
              title="Today's Feedback" 
              value={todayFeedbackCount} 
              icon="fas fa-calendar-day" 
              variant="today" 
            />
            <MetricCard 
              title="Total Feedback" 
              value={totalFeedback} 
              icon="fas fa-comments" 
              variant="primary" 
            />
            <MetricCard 
              title={`Month's Positive`} 
              value={positiveThisMonth} 
              icon="fas fa-smile" 
              variant="success" 
            />
            <MetricCard 
              title={`Month's Neutral`} 
              value={neutralThisMonth} 
              icon="fas fa-meh" 
              variant="warning" 
            />
            <MetricCard 
              title={`Month's Negative`} 
              value={negativeThisMonth} 
              icon="fas fa-frown" 
              variant="orange" 
            />
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
          departments={departments}
          filteredFeedback={feedbackData}
          prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
        />
        <FeedbackTable
          styles={styles}
          feedback={paginatedFeedback}
          handleViewDetails={handleViewDetails}
          getSentimentModifierClass={getSentimentModifierClass}
          getStatusModifierClass={getStatusModifierClass}
          formatStatusLabel={formatStatusLabel}
          handleViewHistory={handleViewHistory}
        />
        <div className={styles.tableFooter}>
          <div className={styles.resultsInfo}>
            Showing {Math.min(filters.currentPage * itemsPerPage, timeFilteredFeedback.length)} of {timeFilteredFeedback.length} feedback
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
            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
            handleViewHistory={handleViewHistory}
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