import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '@assets/css/Dashboard.module.css';
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Header from '@components/AdminDashboard/Header'
import MetricCard from '@components/MetricCard'
import AnalyticsSection from '@sections/AdminDashboard/AnalyticsSection';
import BulkActionModal from '@components/AdminDashboard/BulkActionModal';
import BulkTakeActionModal from '@components/AdminDashboard/BulkTakeActionModal';
import FilterSection from '@sections/AdminDashboard/FilterSection';
import FeedbackModal from '@components/AdminDashboard/FeedbackModal';
import FeedbackTable from '@components/AdminDashboard/FeedbackTable';
import { departments } from '@data/departments';

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

const AdminDashboard = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const socket = io(BASE_URL, { withCredentials: true });
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

  const handleBulkApprove = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/dept/approve`, {
        ids: selectedFeedbackIds,
        userName: user.name,
      });
      toast.success(`${selectedFeedbackIds.length} item(s) approved.`, {
        autoClose: 2000,
      });
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
      toast.success(`Action successful for ${selectedFeedbackIds.length} item(s).`, {
        autoClose: 2000,
      });
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
      toast.success(`Action successful for ${selectedFeedbackIds.length} item(s).`, {
        autoClose: 2000,
      });
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
      toast.info('Feedback refreshed.', {
        autoClose: 1000,
      });
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
            BASE_URL={BASE_URL}
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
                toast.success('Feedback approved successfully!', {
                  autoClose: 2000,
                });
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