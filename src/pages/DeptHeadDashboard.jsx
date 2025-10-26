import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '@assets/css/Dashboard.module.css';
import PropTypes from 'prop-types';
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import Header from '@components/DeptHeadDashboard/Header';
import MetricCard from '@components/MetricCard'
import AnalyticsSection from '../sections/DeptHeadDashboard/AnalyticsSection';
import FilterSection from '../sections/DeptHeadDashboard/FilterSection';
import FeedbackModal from '../components/DeptHeadDashboard/FeedbackModal';
import FeedbackTable from '../components/DeptHeadDashboard/FeedbackTable';

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

const DepartmentHeadsDashboard = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const socket = io(BASE_URL, { withCredentials: true });
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
            BASE_URL={BASE_URL}
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