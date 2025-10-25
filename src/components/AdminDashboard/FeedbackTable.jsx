import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';

const FeedbackTable = ({
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  selectedFeedbackIds,
  setSelectedFeedbackIds
}) => {
  const selectableFeedback = feedback.filter(
    f => !['approved', 'no_action_needed'].includes(f.dept_status)
  );

  const selectAllRef = useRef();

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedFeedbackIds.length > 0 && selectedFeedbackIds.length < feedback.length;
    }
  }, [selectedFeedbackIds, feedback.length]);

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allSelectableIds = feedback
              .filter(f => !['approved', 'no_action_needed'].includes(f.dept_status)) // ✅ match your UI logic
              .map(f => f.id);
          setSelectedFeedbackIds(allSelectableIds);
      } else {
          setSelectedFeedbackIds([]);
      }
  };

  const handleSelectOne = (id) => {
      setSelectedFeedbackIds(prev =>
          prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
  };
  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
            <th>
              <input
                ref={selectAllRef}
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  selectableFeedback.length > 0 &&
                  selectedFeedbackIds.length === selectableFeedback.length
                }
                aria-label="Select all feedback on this page"
              />
            </th>
            <th>ID</th>
            <th>Date</th>
            <th>Source</th>
            <th>Department</th>
            <th>Summary</th>
            <th>Sentiment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feedback.length > 0 ? feedback.map((item) => (
            <tr key={item.id || `unknown-${Date.now()}`} className={styles.feedbackRow}>
              <td>
                <input
                    type="checkbox"
                    checked={selectedFeedbackIds.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    disabled={['approved', 'no_action_needed'].includes(item.dept_status)}
                    title={
                      ['approved', 'no_action_needed'].includes(item.dept_status)
                        ? 'Cannot select resolved feedback'
                        : ''
                    }
                />
              </td>
              <td>{String(item.id || 'UNKNOWN').toUpperCase()}</td>
              <td>
                {(date => (
                  <div className={styles.dateCell}>
                    {!isNaN(date.getTime()) ? (
                      <>
                        <span className={styles.dateDay}>
                          {date.getDate()}
                        </span>
                        <span className={styles.dateMonthYear}>
                          {date.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    ) : (
                      <span>---</span>
                    )}
                  </div>
                ))(new Date(item.date))}
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
                    {item.source ? (item.source.charAt(0).toUpperCase() + item.source.slice(1)) : 'Unknown'}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles.departmentCell}>
                  <span className={styles.departmentIcon}>
                    <i className="fas fa-hospital-alt"></i>
                  </span>
                  <span>{item.department || 'Unknown'}</span>
                </div>
              </td>
              <td>
                <div className={styles.summaryCell}>
                  <div className={styles.summaryText} title={item.description || ''}>
                    {(item.description || '').substring(0, 70) + ((item.description || '').length > 70 ? '...' : '')}
                  </div>
                  {item.urgent&& (
                    <span className={styles.urgentFlag}>
                      <i className="fas fa-bolt"></i> Urgent
                    </span>
                  )}
                  {item.adminNotes && (
                    <span className={styles.escalatedFlag}>
                      <i className="fas fa-reply"></i> Returned
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className={`${styles.sentimentTagBase} ${getSentimentModifierClass(item.sentiment)}`}>
                  <span className={styles.sentimentIcon}>
                    {item.sentiment === 'positive' && <i className="fas fa-smile"></i>}
                    {item.sentiment === 'neutral' && <i className="fas fa-meh"></i>}
                    {item.sentiment === 'negative' && <i className="fas fa-frown"></i>}
                  </span>
                  <span>
                    {(item.sentiment || '').charAt(0).toUpperCase() + (item.sentiment || '').slice(1)}
                  </span>
                </div>
              </td>
              <td>
                <div
                  className={`${styles.statusTagBase} ${getStatusModifierClass(
                    item.status === 'escalated' &&
                    ['approved', 'no_action_needed', 'proposed'].includes(item.dept_status)
                      ? item.dept_status
                      : item.status === 'escalated'
                      ? 'escalated'
                      : item.dept_status
                  )}`}
                >
                  {item.status === 'escalated' &&
                  ['approved', 'no_action_needed', 'proposed'].includes(item.dept_status)
                    ? item.dept_status === 'approved'
                      ? 'Approved'
                      : item.dept_status === 'no_action_needed'
                      ? 'No Action Needed'
                      : 'Proposed'
                    : item.status === 'escalated'
                    ? 'Escalated'
                    : item.dept_status === 'proposed'
                    ? 'Proposed'
                    : item.dept_status === 'approved'
                    ? 'Approved'
                    : item.dept_status === 'no_action_needed'
                    ? 'No Action Needed'
                    : 'Unknown'}
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
                      title="View feedback details"
                      className={styles.viewDetailsButton}
                      onClick={() => handleViewDetails(item)}
                      aria-label={`View details for feedback ${item.id}`}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="8" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No feedback entries match your current filters.</p>
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
};

export default FeedbackTable;