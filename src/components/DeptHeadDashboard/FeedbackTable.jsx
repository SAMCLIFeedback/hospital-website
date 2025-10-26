import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';

const FeedbackTable = ({
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  selectedFeedbackIds,
  setSelectedFeedbackIds,
  handleNoActionNeeded,
}) => {
  const handleSelectFeedback = (id) => {
    setSelectedFeedbackIds(prev =>
      prev.includes(id)
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const eligibleFeedback = feedback.filter(item => !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status));
    if (selectedFeedbackIds.length === eligibleFeedback.length && eligibleFeedback.length > 0) {
      setSelectedFeedbackIds([]);
    } else {
      setSelectedFeedbackIds(eligibleFeedback.map(item => item.id));
    }
  };

  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedFeedbackIds.length > 0 && selectedFeedbackIds.length === feedback.filter(item => !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status)).length}
                onChange={handleSelectAll}
                disabled={feedback.every(item => ['proposed', 'approved', 'no_action_needed'].includes(item.dept_status))}
                aria-label="Select all eligible feedback"
              />
            </th>
            <th>ID</th>
            <th>Date</th>
            <th>Source</th>
            <th>Summary</th>
            <th>Report</th>
            <th>Sentiment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feedback.length > 0 ? feedback.map((item) => (
            <tr key={item.id || `temp-${Math.random()}`} className={styles.feedbackRow}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedFeedbackIds.includes(item.id)}
                  onChange={() => handleSelectFeedback(item.id)}
                  disabled={['proposed', 'approved', 'no_action_needed'].includes(item.dept_status)}
                  aria-label={`Select feedback ${item.id}`}
                />
              </td>
              <td>{item.id?.toUpperCase() || 'N/A'}</td>
              <td>
                <div className={styles.dateCell}>
                  <span className={styles.dateDay}>
                    {item.date ? new Date(item.date).getDate() : 'N/A'}
                  </span>
                  <span className={styles.dateMonthYear}>
                    {item.date
                      ? new Date(item.date).toLocaleString('default', { month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles.sourceCell}>
                  <span className={styles.sourceIcon}>
                    {item.source === 'patient' && <i className="fas fa-user-injured"></i>}
                    {item.source === 'staff' && <i className="fas fa-user-md"></i>}
                    {item.source === 'visitor' && <i className="fas fa-user-friends"></i>}
                    {item.source === 'family' && <i className="fas fa-user-friends"></i>}
                    {(!item.source || item.source === 'unknown') && <i className="fas fa-question-circle"></i>}
                  </span>
                  <span className={styles.sourceLabel}>
                    {item.source && item.source !== 'unknown'
                      ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
                      : 'Unknown'}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles.summaryCell}>
                  <div className={styles.summaryText} title={item.description || ''}>
                    {item.description
                      ? item.description.substring(0, 70) + (item.description.length > 70 ? '...' : '')
                      : 'No description'}
                  </div>
                  {item.urgent && (
                    <span className={styles.urgentFlag}>
                      <i className="fas fa-bolt"></i> Urgent
                    </span>
                  )}
                  {item.adminNotes && (
                    <span className={styles.escalatedFlag}>
                      <i className="fas fa-user-shield"></i> Forwarded
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className={styles.summaryCell}>
                  <div className={styles.summaryText} title={item.reportDetails || ''}>
                    {item.reportDetails
                      ? item.reportDetails.substring(0, 70) + (item.reportDetails.length > 70 ? '...' : '')
                      : 'No report'}
                  </div>
                </div>
              </td>
              <td>
                <div className={`${styles.sentimentTagBase} ${getSentimentModifierClass(item.sentiment, item.sentiment_status)}`}>
                  <span className={styles.sentimentIcon}>
                    {item.sentiment === 'positive' && <i className="fas fa-smile"></i>}
                    {item.sentiment === 'neutral' && <i className="fas fa-meh"></i>}
                    {item.sentiment === 'negative' && <i className="fas fa-frown"></i>}
                    {item.sentiment == null && item.sentiment_status === 'pending' && <i className="fas fa-hourglass-half"></i>}
                    {item.sentiment == null && item.sentiment_status === 'failed' && <i className="fas fa-exclamation-triangle"></i>}
                  </span>
                  <span>
                    {item.sentiment
                      ? item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)
                      : item.sentiment_status === 'failed'
                        ? 'Failed'
                        : 'Pending'}
                  </span>
                </div>
              </td>
              <td>
                <div className={`${styles.statusTagBase} ${getStatusModifierClass(item.dept_status)}`}>
                  {item.dept_status
                    ? item.dept_status.charAt(0).toUpperCase() + item.dept_status.slice(1).replace(/_/g, ' ')
                    : 'Needs Action'}
                </div>
              </td>
              <td>
                <div className={styles.actionsCell}>
                  {['no_action_needed', 'approved'].includes(item.dept_status) ? (
                    <button
                      title="View History"
                      className={styles.moreActionsButton}
                      onClick={() => handleViewDetails(item)}
                    >
                      <i className="fas fa-history"></i> History
                    </button>
                  ) : (
                    <button
                      title="View Details"
                      className={styles.viewDetailsButton}
                      onClick={() => handleViewDetails(item)}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="9" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No needs action feedback entries match your current filters.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

FeedbackTable.propTypes = {
  feedback: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleViewDetails: PropTypes.func.isRequired,
  getSentimentModifierClass: PropTypes.func.isRequired,
  getStatusModifierClass: PropTypes.func.isRequired,
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedFeedbackIds: PropTypes.func.isRequired,
  handleNoActionNeeded: PropTypes.func.isRequired,
};

export default FeedbackTable;