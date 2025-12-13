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
  isAuditTrailModalOpen,
  setFeedbackData,
  setIsModalOpen,
  setIsAuditTrailModalOpen,
  setSelectedFeedback,
}) => {
  return (event) => {
    // Minimal/no-op for future extensibility
    const { tabId: originTabId } = event.data;
    if (originTabId === tabId) return;
  };
};

export const handleViewDetailsFactory = ({
  setSelectedFeedback,
  setIsModalOpen,
}) => feedback => {
  setSelectedFeedback(feedback);
  setIsModalOpen(true);
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