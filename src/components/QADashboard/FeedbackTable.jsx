import PropTypes from 'prop-types';

const FeedbackTable = ({
  styles,
  feedback,
  handleViewDetails,
  getSentimentModifierClass,
  getStatusModifierClass,
  handleTagAsSpam,
  handleRestore,
  reportStates,
  setHasGenerated,
  setReportViewed,
  handleViewHistory,
}) => {
  return (
    <div className={styles.feedbackTableContainer}>
      <table className={styles.feedbackTable}>
        <thead>
          <tr>
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
          {feedback.length > 0 ? feedback.map((item) => {
            const isGenerating = reportStates[item.id]?.isGenerating || false;
            const hasGenerated = reportStates[item.id]?.hasGenerated || false;
            const reportViewed = reportStates[item.id]?.reportViewed || false;
            const isSpam = item.status === 'spam';
            const isLocked = item.status === 'assigned' || item.status === 'escalated';

            let buttonClass = styles.viewDetailsButton;
            let buttonText = 'View';
            let buttonIcon = 'fa-eye';

            if (!isSpam) {
              if (isGenerating) {
                buttonClass = styles.viewGeneratingButton;
                buttonText = 'Generating...';
                buttonIcon = 'fa-spinner fa-spin';
              } else if (hasGenerated && !reportViewed && !isLocked) {
                buttonClass = styles.viewReportButton;
                buttonText = 'Generated';
                buttonIcon = null;
              }
            }

            return (
              <tr key={item.id} className={styles.feedbackRow}>
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
                      {item.description
                        ? item.description.substring(0, 70) + (item.description.length > 70 ? '...' : '')
                        : 'No description'}
                    </div>
                    {item.urgent && <span className={styles.urgentFlag}><i className="fas fa-bolt"></i> Urgent</span>}
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
                  <div className={`${styles.statusTagBase} ${getStatusModifierClass(item.status)}`}>
                    {item.status === 'not_manage'
                      ? 'Not Manage'
                      : typeof item.status === 'string' && item.status
                        ? item.status
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase())
                        : 'Pending'}
                  </div>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    {isLocked ? (
                      <button
                        title="View History"
                        className={styles.moreActionsButton}
                        onClick={() => handleViewHistory(item)}
                      >
                        <i className="fas fa-history"></i> History
                      </button>
                    ) : isSpam ? (
                      <button
                        title="Restore"
                        className={`${styles.moreActionsButton} ${styles.removeSpamButton}`}
                        onClick={() => handleRestore(item)}
                      >
                        <i className="fas fa-undo"></i> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          title={buttonText}
                          className={buttonClass}
                          onClick={() => handleViewDetails(item)}
                          disabled={isGenerating || isSpam}
                        >
                          {buttonIcon && <i className={`fas ${buttonIcon}`}></i>} {buttonText}
                        </button>
                        <button
                          title="Tag as Spam"
                          className={`${styles.moreActionsButton} ${styles.tagSpamButton}`}
                          onClick={() => handleTagAsSpam(item)}
                          disabled={isSpam}
                        >
                          <i className="fas fa-exclamation-circle"></i> Spam
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan="8" className={styles.noFeedbackMessage}>
                <i className="fas fa-ghost"></i>
                <p>No feedback entries match your current filters or failed to load.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

FeedbackTable.propTypes = {
  styles: PropTypes.object.isRequired,
  feedback: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleViewDetails: PropTypes.func.isRequired,
  getSentimentModifierClass: PropTypes.func.isRequired,
  getStatusModifierClass: PropTypes.func.isRequired,
  handleTagAsSpam: PropTypes.func.isRequired,
  handleRestore: PropTypes.func.isRequired,
  reportStates: PropTypes.object.isRequired,
  setHasGenerated: PropTypes.func.isRequired,
  setReportViewed: PropTypes.func.isRequired,
  handleViewHistory: PropTypes.func.isRequired,
};

export default FeedbackTable;