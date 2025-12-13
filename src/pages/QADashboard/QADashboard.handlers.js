import { toast } from 'react-toastify';

export const handleLogout = async ({ sessionId, navigate, setError }) => {
  try {
    localStorage.removeItem(`qa_user_session_${sessionId}`);
    sessionStorage.removeItem('current_qa_session');
    navigate('/');
  } catch (error) {
    console.error('Logout error:', error.message);
    setError('Failed to logout. Please try again.');
  }
};

export const handleBroadcastMessageFactory = ({
  tabId,
  processedEventsRef,
  selectedFeedback,
  isModalOpen,
  isReportModalOpen,
  isAuditTrailModalOpen,
  setFeedbackData,
  setIsModalOpen,
  setIsReportModalOpen,
  setIsAuditTrailModalOpen,
  setSelectedFeedback,
}) => {
  return (event) => {
    const { feedbackIds, actionType, tabId: originTabId } = event.data;

    if (originTabId === tabId) return;

    const eventKey = `${actionType}-${originTabId}-${feedbackIds.join(',')}`;
    if (processedEventsRef.current.has(eventKey)) return;
    processedEventsRef.current.add(eventKey);

    let shouldCloseIndividualModal = false;
    let toastMessage = '';
    const idsSet = new Set(feedbackIds);
    const firstId = feedbackIds[0]?.toUpperCase();

    setFeedbackData(prev =>
      prev.map(fb => {
        if (!idsSet.has(fb.id)) return fb;
        if (actionType === 'spam') return { ...fb, status: 'spam' };
        if (actionType === 'restore') return { ...fb, status: 'not_manage' };
        if (actionType === 'report') return { ...fb, status: 'assigned', dept_status: 'needs_action' };
        if (actionType === 'escalate') return { ...fb, status: 'escalated', dept_status: 'escalated' };
        return fb;
      })
    );

    if (selectedFeedback && idsSet.has(selectedFeedback.id)) {
      if (isModalOpen || isReportModalOpen || isAuditTrailModalOpen) {
        shouldCloseIndividualModal = true;
        if (actionType === 'spam')
          toastMessage = `Feedback ${firstId} was marked as spam in another tab. Modal closed.`;
        else if (actionType === 'report')
          toastMessage = `Feedback ${firstId} was assigned in another tab. Modal closed.`;
        else if (actionType === 'escalate')
          toastMessage = `Feedback ${firstId} was escalated in another tab. Modal closed.`;
      }
    }

    if (shouldCloseIndividualModal) {
      setIsModalOpen(false);
      setIsReportModalOpen(false);
      setIsAuditTrailModalOpen(false);
      setSelectedFeedback(null);
    }

    if (toastMessage) toast.info(toastMessage);

    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);
  };
};

export const handleGenerateReportFactory = ({
  feedbackData,
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
  closeReportModal,
}) => {
  return async (feedbackId, reportContent, reportDepartment) => {
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
          tabId,
        });
      }

      toast.success('Report sent and feedback updated!', { autoClose: 2000 });
      closeReportModal();
    } catch (error) {
      toast.error(`Failed to send report: ${error.message}`);
    }
  };
};

export const handleEscalateFactory = ({
  feedbackData,
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
  toast,
  closeReportModal,
  setFeedbackData,
}) => {
  return async (feedbackId, reportContent, reportDepartment) => {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback || !reportContent) {
      toast.error('Report details are required to escalate.');
      return;
    }

    if (feedback.status === 'spam') {
      toast.error('Cannot escalate spam feedback.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/feedback/escalate-single`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: feedbackId,
          department: reportDepartment || 'Admin Escalation',
          reportDetails: reportContent,
          userName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Escalation failed');
      }

      const updatedFeedback = await response.json();

      socket.emit('feedbackUpdate', updatedFeedback);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedbackId],
          actionType: 'escalate',
          tabId,
        });
      }

      toast.success('Feedback escalated successfully!', { autoClose: 2000 });
      closeReportModal();

      setFeedbackData(prev =>
        prev.map(f =>
          f.id === feedbackId
            ? {
                ...f,
                status: 'escalated',
                dept_status: 'escalated',
                department: reportDepartment || 'Admin Escalation',
                reportDetails: reportContent,
              }
            : f
        )
      );
    } catch (error) {
      toast.error(`Failed to escalate: ${error.message}`);
    }
  };
};

export const handleTagAsSpamFactory = ({
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
  toast,
  setFeedbackData,
}) => {
  return async (feedback) => {
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

      const updated = await response.json();

      socket.emit('feedbackUpdate', updated.feedback || updated);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedback.id],
          actionType: 'spam',
          tabId,
        });
      }

      setFeedbackData(prev => prev.map(f => (f.id === feedback.id ? { ...f, status: 'spam' } : f)));
      toast.success('Feedback tagged as spam.');
    } catch (err) {
      toast.error('Failed to tag as spam.');
    }
  };
};

export const handleRestoreFactory = ({
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
  toast,
  setFeedbackData,
}) => {
  return async (feedback) => {
    try {
      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'not_manage', userName: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore');
      }

      const updated = await response.json();

      socket.emit('feedbackUpdate', updated.feedback || updated);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          feedbackIds: [feedback.id],
          actionType: 'restore',
          tabId,
        });
      }

      setFeedbackData(prev => prev.map(f => (f.id === feedback.id ? { ...f, status: 'not_manage' } : f)));
      toast.success('Feedback restored.');
    } catch (err) {
      toast.error('Failed to restore feedback.');
    }
  };
};

export const handleViewDetailsFactory = ({
  setSelectedFeedback,
  setIsModalOpen,
  reportStates,
  setReportStates,
  departmentsForAssignment
}) => feedback => {
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

export const handleViewHistoryFactory = ({
  BASE_URL,
  toast,
  setSelectedFeedback,
  setIsAuditTrailModalOpen
}) => async feedback => {
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