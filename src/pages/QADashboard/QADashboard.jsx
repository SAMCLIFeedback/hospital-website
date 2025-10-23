import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from '@assets/css/Dashboard.module.css';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom'; 
import Header from '@components/QADashboard/Header';
import MetricCard from '@components/QADashboard/MetricCard';
import AnalyticsSection from '@components/QADashboard/AnalyticsSection';
import FilterSection from '@components/QADashboard/FilterSection';
import AuditTrailModal from '@components/QADashboard/AuditTrailModal';
import FeedbackTable from '@components/QADashboard/FeedbackTable';
import FeedbackModal from '@components/QADashboard/FeedbackModal';
import ReportModal from '@components/QADashboard/ReportModal';
import BulkReportModal from '@components/QADashboard/BulkReportModal';

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

      closeBulkReportModal();

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
        styles={styles}
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