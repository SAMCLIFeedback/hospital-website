import { toast } from 'react-toastify';

export const handleLogout = async ({sessionId, navigate, setError}) => {
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
}) => {
  return (event) => {
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

    const invalidatingActions = ['spam', 'report', 'escalate'];
    if (invalidatingActions.includes(actionType)) {
      const newSelectedIds = selectedFeedbackIds.filter(id => !idsSet.has(id));
      if (newSelectedIds.length < selectedFeedbackIds.length) {
        setSelectedFeedbackIds(newSelectedIds);
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
  setFeedbackData,
  setReportStates,
  socket,
  broadcastChannelRef,
  tabId,
  toast,
  user,
  closeReportModal,
  BASE_URL,
}) => {
  return async (feedbackId, reportContent, reportDepartment) => {
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
          userName: user.name,
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
          tabId,
        });
      }

      toast.success('Feedback escalated to Admin!', {
        autoClose: 2000,
      });
      closeReportModal();
    } catch (error) {
      toast.error(`Failed to escalate feedback: ${error.message}`);
    }
  };
};

export const handleTagAsSpamFactory = ({
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
}) => {
  return async (feedback) => {
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
          tabId,
        });
      }

      toast.success(`Feedback ${feedback.id.toUpperCase()} tagged as spam!`, {
        autoClose: 2000,
      });
    } catch (error) {
      toast.error(`Failed to tag as spam: ${error.message}`);
    }
  };
};

export const handleRestoreFactory = ({
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
}) => {
  return async (feedback) => {
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
          tabId,
        });
      }

      toast.success(`Feedback ${feedback.id.toUpperCase()} restored!`, {
        autoClose: 2000,
      });
    } catch (error) {
      toast.error(`Failed to restore feedback: ${error.message}`);
    }
  };
};

export const handleBulkSpamFactory = ({
  feedbackData,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  setFeedbackData,
  selectedFeedback,
  setSelectedFeedback,
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
}) => {
  return async () => {
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
          tabId,
        });
      }

      setSelectedFeedbackIds(prev => prev.filter(id => !validIds.includes(id)));

      toast.success(`${validIds.length} feedback items tagged as spam!`, {
        autoClose: 2000,
      });

      setFeedbackData(prev =>
        prev.map(f => (validIds.includes(f.id) ? { ...f, status: 'spam' } : f))
      );

      if (selectedFeedback && validIds.includes(selectedFeedback.id)) {
        setSelectedFeedback(prev => ({ ...prev, status: 'spam' }));
      }
    } catch (error) {
      toast.error(`Bulk spam action failed: ${error.message}`);
    }
  };
};

export const handleBulkRestoreFactory = ({
  feedbackData,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  setFeedbackData,
  selectedFeedback,
  setSelectedFeedback,
  BASE_URL,
  user,
  socket,
  broadcastChannelRef,
  tabId,
}) => {
  return async () => {
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
          tabId,
        });
      }

      setSelectedFeedbackIds(prev => prev.filter(id => !spamIds.includes(id)));

      toast.success(`${spamIds.length} feedback items restored!`, {
        autoClose: 2000,
      });

      setFeedbackData(prev =>
        prev.map(f => (spamIds.includes(f.id) ? { ...f, status: 'unassigned' } : f))
      );

      if (selectedFeedback && spamIds.includes(selectedFeedback.id)) {
        setSelectedFeedback(prev => ({ ...prev, status: 'unassigned' }));
      }
    } catch (error) {
      toast.error(`Bulk restore failed: ${error.message}`);
    }
  };
};

export const handleBulkGenerateReportFactory = ({
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
  BASE_URL
}) => async () => {
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
        tabId,
      });
    }

    toast.success(`Bulk report created and ${validIds.length} feedback items updated!`, {
      autoClose: 2000,
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
              reportDetails: bulkReportContent,
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
        reportDetails: bulkReportContent,
      }));
    }
  } catch (error) {
    toast.error(`Failed to create bulk report: ${error.message}`);
  }
};

export const handleBulkEscalateFactory = ({
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
}) => async () => {
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
        tabId,
      });
    }

    toast.success(`Bulk escalation successful for ${validIds.length} feedback items!`, {
      autoClose: 2000,
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
              reportDetails: bulkReportContent,
            }
          : f
      )
    );
  } catch (error) {
    toast.error(`Failed to escalate feedback: ${error.message}`);
  }
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