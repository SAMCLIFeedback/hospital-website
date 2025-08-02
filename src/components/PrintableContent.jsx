import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styles from '../assets/css/PrintableContent.module.css';
import Logo from '../assets/logo.png';

// --- Main Component ---
const PrintableContent = React.forwardRef(({ items, dashboardType, prepareRawFeedbackForDisplay, exportConfig }, ref) => {

    const getFontSizeClass = () => {
        switch (exportConfig.fontSize) {
            case 'small': return styles.fontSizeSmall;
            case 'large': return styles.fontSizeLarge;
            default: return styles.fontSizeMedium;
        }
    };

    const getStatusKey = (item) => {
        let key;
        if (dashboardType === 'qa') {
            key = item.status || 'Unknown';
        } else if (dashboardType === 'dept') {
            key = item.dept_status || 'Unknown';
        } else if (dashboardType === 'admin') {
            key = (item.status === 'escalated' && !['proposed', 'approved', 'no_action_needed'].includes(item.dept_status))
                ? 'Escalated'
                : item.dept_status || 'Unknown';
        }
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const groupedItems = useMemo(() => {
        if (!items || items.length === 0) return {};
        if (!exportConfig.groupByDepartment && !exportConfig.groupByStatus) {
            return { 'All Selected Feedback': items };
        }
        
        const groupKey = exportConfig.groupByDepartment ? 'department' : 'status';

        return items.reduce((acc, item) => {
            const key = groupKey === 'department' ? (item.department || 'Unknown Department') : getStatusKey(item);
            (acc[key] = acc[key] || []).push(item);
            return acc;
        }, {});

    }, [items, exportConfig.groupByDepartment, exportConfig.groupByStatus, dashboardType]);

    const renderStatistics = () => {
        if (!exportConfig.includeStatistics || !items || items.length === 0) return null;

        const total = items.length;
        const sentimentCounts = items.reduce((acc, item) => {
            const sentiment = item.sentiment || 'pending';
            acc[sentiment] = (acc[sentiment] || 0) + 1;
            return acc;
        }, {});

        const statusCounts = items.reduce((acc, item) => {
             const status = getStatusKey(item);
             acc[status] = (acc[status] || 0) + 1;
             return acc;
        }, {});

        const urgentCount = items.filter(item => item.urgent).length;
        const departmentCounts = items.reduce((acc, item) => {
            const dept = item.department || 'Unknown';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className={styles.statsSection}>
                <h2 className={styles.sectionTitle}>Summary Statistics</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <strong>Total Items:</strong> {total}
                        <br /><strong>Urgent:</strong> {urgentCount}
                    </div>
                    <div className={styles.statItem}>
                        <strong>By Sentiment:</strong>
                        <ul>
                            {Object.entries(sentimentCounts).map(([key, value]) => (
                                <li key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}: {value}</li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.statItem}>
                        <strong>By Status:</strong>
                        <ul>
                            {Object.entries(statusCounts).slice(0, 4).map(([key, value]) => (
                                <li key={key}>{key}: {value}</li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.statItem}>
                        <strong>Top Departments:</strong>
                        <ul>
                            {Object.entries(departmentCounts)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 3)
                                .map(([key, value]) => (
                                <li key={key}>{key.length > 20 ? key.substring(0, 20) + '...' : key}: {value}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div ref={ref} className={`${styles.reportContainer} ${getFontSizeClass()}`}>
            <header className={styles.reportHeader}>
                <img src={Logo} alt="Logo" className={styles.logo} />
                <h1>Feedback Export Report</h1>
                <div className={styles.headerMeta}>
                    <p><strong>Source:</strong> {dashboardType.toUpperCase()} Dashboard | <strong>Total Items:</strong> {items?.length || 0}</p>
                    {exportConfig.includeTimestamp && <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>}
                </div>
            </header>

            {renderStatistics()}

            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                <section key={groupName} className={styles.groupSection}>
                    {(exportConfig.groupByDepartment || exportConfig.groupByStatus) && (
                         <h2 className={styles.groupTitle}>{groupName} ({groupItems.length} items)</h2>
                    )}
                    {groupItems.map(item => (
                        <FeedbackItem
                            key={item.id}
                            item={item}
                            prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
                            exportConfig={exportConfig}
                            dashboardType={dashboardType}
                        />
                    ))}
                </section>
            ))}
             <footer className={styles.reportFooter}>
                <p>End of Report - {items?.length || 0} items exported</p>
            </footer>
        </div>
    );
});

PrintableContent.displayName = 'PrintableContent';

const FeedbackItem = ({ item, prepareRawFeedbackForDisplay, exportConfig, dashboardType }) => {
    const details = prepareRawFeedbackForDisplay(item);

    // Get status for display
    const currentStatus = dashboardType === 'qa' ? item.status : item.dept_status;
    
    // Create a compact details object with only the most important fields
    const compactDetails = {
        'ID': item.id?.toUpperCase(),
        'Date': new Date(item.date).toLocaleDateString(),
        'Department': item.department,
        'Source': item.source,
        'Status': currentStatus?.replace(/_/g, ' ').toUpperCase(),
        'Sentiment': item.sentiment,
        ...(item.rating && { 'Rating': `${item.rating}/5` }),
        ...(item.impactSeverity && { 'Impact': item.impactSeverity }),
        ...(item.feedbackType && { 'Type': item.feedbackType }),
    };

    // Full action history
    const fullActionHistory = useMemo(() => [
        {
            timestamp: item.date,
            action: 'Feedback Submitted',
            user: item.isAnonymous ? 'Anonymous' : item.email || 'System',
            details: `Initial submission via ${item.source || 'unknown'} source.`,
        },
        ...(item.actionHistory || [])
    ].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)), [item]);

    const getStatusBadgeClass = (status) => {
        if (item.urgent) return styles.urgent;
        if (status?.includes('pending') || status?.includes('unassigned')) return styles.pending;
        if (status?.includes('approved')) return styles.approved;
        if (status?.includes('escalated')) return styles.escalated;
        return '';
    };

    const getSentimentBadgeClass = (sentiment) => {
        if (sentiment === 'positive') return styles.positive;
        if (sentiment === 'negative') return styles.negative;
        return styles.neutral;
    };

    // Determine if this is a large item that might need special handling
    const isLargeItem = useMemo(() => {
        const contentLength = (item.description || '').length + 
                             (item.reportDetails || '').length + 
                             (item.adminNotes || '').length + 
                             (item.revisionNotes || '').length + 
                             (item.finalActionDescription || '').length;
        return contentLength > 1000 || (fullActionHistory && fullActionHistory.length > 8);
    }, [item, fullActionHistory]);

    return (
        <article className={`${styles.feedbackItem} ${isLargeItem ? styles.largeContent : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className={styles.itemTitle}>
                    {item.id.toUpperCase()}
                    {item.urgent && <span className={`${styles.statusBadge} ${styles.urgent}`}>URGENT</span>}
                    <span className={`${styles.sentimentBadge} ${getSentimentBadgeClass(item.sentiment)}`}>
                        {item.sentiment || 'pending'}
                    </span>
                </h3>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(currentStatus)}`}>
                    {currentStatus?.replace(/_/g, ' ').toUpperCase()}
                </span>
            </div>

            {exportConfig.includeDetails && (
                <div className={styles.section}>
                    <div className={styles.compactDetails}>
                        {Object.entries(compactDetails).map(([key, value]) => (
                            <div key={key} className={styles.detailItem}>
                                <div className={styles.detailLabel}>{key}:</div>
                                <div className={styles.detailValue}>{String(value || 'N/A')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {exportConfig.includeDescription && (
                <div className={styles.section}>
                    <h4 className={styles.subSectionTitle}>Description</h4>
                    <div className={`${styles.prose} ${isLargeItem && (item.description || '').length > 500 ? styles.large : ''}`}>
                        {item.description || 'N/A'}
                    </div>
                </div>
            )}

            <div className={styles.twoColumnSection}>
                {exportConfig.includeReportDetails && item.reportDetails && (
                    <div className={styles.columnItem}>
                        <div className={styles.columnTitle}>QA Report</div>
                        <div className={styles.columnContent}>
                            {item.reportDetails.length > 200 ? 
                                item.reportDetails.substring(0, 200) + '...' : 
                                item.reportDetails}
                        </div>
                    </div>
                )}

                {exportConfig.includeAdminNotes && item.adminNotes && (
                    <div className={styles.columnItem}>
                        <div className={styles.columnTitle}>Admin Notes</div>
                        <div className={styles.columnContent}>
                            {item.adminNotes.length > 200 ? 
                                item.adminNotes.substring(0, 200) + '...' : 
                                item.adminNotes}
                        </div>
                    </div>
                )}

                {exportConfig.includeRevisionNotes && item.revisionNotes && (
                    <div className={styles.columnItem}>
                        <div className={styles.columnTitle}>Revision Notes</div>
                        <div className={styles.columnContent}>
                            {item.revisionNotes.length > 200 ? 
                                item.revisionNotes.substring(0, 200) + '...' : 
                                item.revisionNotes}
                        </div>
                    </div>
                )}

                {exportConfig.includeFinalAction && item.finalActionDescription && (
                    <div className={styles.columnItem}>
                        <div className={styles.columnTitle}>Final Action</div>
                        <div className={styles.columnContent}>
                            {item.finalActionDescription.length > 200 ? 
                                item.finalActionDescription.substring(0, 200) + '...' : 
                                item.finalActionDescription}
                        </div>
                    </div>
                )}
            </div>

            {exportConfig.includeActionHistory && fullActionHistory && fullActionHistory.length > 1 && (
                <div className={styles.section}>
                     <h4 className={styles.subSectionTitle}>
                        Action History ({fullActionHistory.length} entries)
                        {fullActionHistory.length > 5 && <span style={{fontSize: '0.8em', fontWeight: 'normal'}}> - showing last 5</span>}
                     </h4>
                     <table className={styles.historyTable}>
                        <thead>
                            <tr>
                                <th style={{width: '20%'}}>Date</th>
                                <th style={{width: '25%'}}>Action</th>
                                <th style={{width: '20%'}}>User</th>
                                <th style={{width: '35%'}}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullActionHistory.slice(-5).map((entry, index) => (
                                <tr key={index}>
                                    <td>{new Date(entry.timestamp).toLocaleDateString()}</td>
                                    <td>{entry.action || 'N/A'}</td>
                                    <td>{(entry.user || 'System').length > 15 ? 
                                        (entry.user || 'System').substring(0, 15) + '...' : 
                                        (entry.user || 'System')}</td>
                                    <td>{(entry.details || 'N/A').length > 50 ? 
                                        (entry.details || 'N/A').substring(0, 50) + '...' : 
                                        (entry.details || 'N/A')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
};

// PropTypes for validation
const itemShape = PropTypes.shape({
    id: PropTypes.string.isRequired,
    date: PropTypes.string,
    description: PropTypes.string,
    reportDetails: PropTypes.string,
    adminNotes: PropTypes.string,
    revisionNotes: PropTypes.string,
    finalActionDescription: PropTypes.string,
    isAnonymous: PropTypes.bool,
    email: PropTypes.string,
    source: PropTypes.string,
    urgent: PropTypes.bool,
    sentiment: PropTypes.string,
    rating: PropTypes.number,
    impactSeverity: PropTypes.string,
    feedbackType: PropTypes.string,
    department: PropTypes.string,
    status: PropTypes.string,
    dept_status: PropTypes.string,
    actionHistory: PropTypes.arrayOf(PropTypes.shape({
        timestamp: PropTypes.string,
        action: PropTypes.string,
        user: PropTypes.string,
        details: PropTypes.string,
    })),
});

PrintableContent.propTypes = {
    items: PropTypes.arrayOf(itemShape),
    dashboardType: PropTypes.oneOf(['qa', 'dept', 'admin']).isRequired,
    prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
    exportConfig: PropTypes.object.isRequired,
};
PrintableContent.defaultProps = {
    items: [],
};

FeedbackItem.propTypes = {
    item: itemShape.isRequired,
    prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
    exportConfig: PropTypes.object.isRequired,
    dashboardType: PropTypes.oneOf(['qa', 'dept', 'admin']).isRequired,
};

export default PrintableContent;