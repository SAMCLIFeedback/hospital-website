import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from '../assets/css/ExportModal.module.css';
import PrintableContent from './PrintableContent';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ExportPDFModal = ({
    isOpen,
    onClose,
    initialData,
    initialSelectedIds,
    dashboardType,
    prepareRawFeedbackForDisplay
}) => {
    // --- STATE MANAGEMENT ---
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [feedbackData, setFeedbackData] = useState(initialData);
    const [selectedForExport, setSelectedForExport] = useState(new Set(initialSelectedIds));
    const [printableItems, setPrintableItems] = useState(null);
    const printableRef = useRef();

    // --- FILTERS STATE ---
    const [filters, setFilters] = useState({
        searchId: '',
        startDate: null,
        endDate: null,
        department: '',
        source: 'all',
        status: 'all',
        sentiment: 'all',
        urgent: 'all',
        feedbackType: 'all',
        rating: 'all',
        impactSeverity: 'all'
    });

    const [timeFilter, setTimeFilter] = useState('all');

    // --- EXPORT CONFIGURATION STATE ---
    const [exportConfig, setExportConfig] = useState({});

    // --- DERIVED VALUES (MEMOIZED) ---
    const uniqueValues = useMemo(() => {
        const departments = [
            'General Feedback', 'Anesthesiology', 'Cardiology', 'Dermatology', 'Internal Medicine',
            'Obstetrics and Gynecology (OB-GYNE)', 'Pediatrics', 'Radiology', 'Rehabilitation Medicine',
            'Surgery', 'Pathology', 'Urology', 'Nephrology', 'Orthopedics', 'Ophthalmology',
            'ENT (Ear, Nose, Throat)', 'Family Medicine', 'BESTHEALTH', 'Dental Clinic', 'Diagnostics',
            'Dietary', 'Emergency Room (ER)', 'Hemodialysis', 'Intensive Care Unit (ICU)',
            'Inpatient Department', 'Neonatal ICU (NICU)', 'Nursing Service', 'Operating Room',
            'Outpatient Department', 'Pharmacy', 'Physical Therapy'
        ];
        const sources = ['all', 'staff', 'patient', 'visitor'];
        const statuses = {
            qa: ['all', 'pending', 'unassigned', 'assigned', 'escalated', 'spam', 'failed'],
            dept: ['all', 'needs_action', 'proposed', 'approved', 'need_revision', 'no_action_needed'],
            admin: ['all', 'escalated', 'proposed', 'approved', 'no_action_needed'],
        };
        const urgencies = {
            qa: ['all', 'urgent', 'non-urgent'],
            dept: ['all', 'urgent', 'non-urgent', 'forwarded'],
            admin: ['all', 'urgent', 'non-urgent', 'returned'],
        };
        const externalFeedbackTypes = ['all', 'Complaint', 'Compliment', 'Suggestion', 'Inquiry'];
        const internalFeedbackTypes = ['all', 'Incident Report', 'Process Improvement Suggestion', 'Policy/Procedure Feedback', 'Inter-departmental Communication'];
        const ratings = ['all', '1', '2', '3', '4', '5'];
        const severities = ['all', 'Low', 'Medium', 'High', 'Critical'];

        return {
            departments,
            sources,
            statuses: statuses[dashboardType] || [],
            urgencies: urgencies[dashboardType] || [],
            externalFeedbackTypes,
            internalFeedbackTypes,
            ratings,
            severities
        };
    }, [dashboardType]);

    const contentOptions = useMemo(() => {
        const options = [
            { key: 'includeDescription', label: 'Description', types: ['qa', 'dept', 'admin'] },
            { key: 'includeDetails', label: 'Feedback Details', types: ['qa', 'dept', 'admin'] },
            { key: 'includeReportDetails', label: 'QA Report', types: ['qa', 'dept', 'admin'] },
            { key: 'includeAdminNotes', label: 'Admin Notes', types: ['dept'] },
            { key: 'includeRevisionNotes', label: 'Revision Notes', types: ['dept'] },
            { key: 'includeFinalAction', label: 'Final Action', types: ['dept', 'admin'] },
            { key: 'includeActionHistory', label: 'Action History', types: ['qa', 'dept', 'admin'] },
        ];
        return options.filter(opt => opt.types.includes(dashboardType));
    }, [dashboardType]);

    const processedData = useMemo(() => {
        let filtered = feedbackData.filter(item => {
            const feedbackDate = new Date(item.date);
            const matchesDateRange = !filters.startDate || !filters.endDate ||
                (feedbackDate >= filters.startDate && feedbackDate <= new Date(new Date(filters.endDate).setDate(filters.endDate.getDate() + 1)));

            const matchesSearch = !filters.searchId || item.id.toLowerCase().includes(filters.searchId.toLowerCase());
            const matchesDepartment = !filters.department || item.department === filters.department;
            const matchesSource = filters.source === 'all' || item.source === filters.source;
            const matchesUrgent = filters.urgent === 'all' ||
                (filters.urgent === 'urgent' && item.urgent) ||
                (filters.urgent === 'non-urgent' && !item.urgent) ||
                (filters.urgent === 'forwarded' && dashboardType === 'dept' && item.adminNotes) ||
                (filters.urgent === 'returned' && dashboardType === 'admin' && item.adminNotes);
            const matchesSentiment = filters.sentiment === 'all' || item.sentiment === filters.sentiment;
            const itemStatus = dashboardType === 'qa' ? item.status : item.dept_status;
            const matchesStatus = filters.status === 'all' || itemStatus === filters.status;

            const matchesFeedbackType = filters.feedbackType === 'all' || item.feedbackType === filters.feedbackType;
            const matchesRating = filters.rating === 'all' || String(item.rating) === filters.rating;
            const matchesImpact = filters.impactSeverity === 'all' || item.impactSeverity === filters.impactSeverity;

            let conditionalMatch = true;
            if (filters.source === 'staff') {
                conditionalMatch = matchesFeedbackType && matchesImpact;
            } else if (filters.source === 'patient' || filters.source === 'visitor') {
                conditionalMatch = matchesFeedbackType && matchesRating;
            }

            return matchesSearch && matchesDateRange && matchesDepartment && matchesSource && matchesUrgent && matchesSentiment && matchesStatus && conditionalMatch;
        });

        filtered.sort((a, b) => {
            let aValue, bValue;
            switch (exportConfig.sortBy) {
                case 'id': aValue = a.id; bValue = b.id; break;
                case 'department': aValue = a.department || ''; bValue = b.department || ''; break;
                case 'status':
                    aValue = (dashboardType === 'qa' ? a.status : a.dept_status) || '';
                    bValue = (dashboardType === 'qa' ? b.status : b.dept_status) || '';
                    break;
                case 'urgency': aValue = a.urgent ? 1 : 0; bValue = b.urgent ? 1 : 0; break;
                default: aValue = new Date(a.date); bValue = new Date(b.date); break;
            }
            if (exportConfig.sortOrder === 'asc') {
                return String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
            }
            return String(bValue).localeCompare(String(aValue), undefined, { numeric: true });
        });

        return filtered;
    }, [feedbackData, filters, exportConfig.sortBy, exportConfig.sortOrder, dashboardType]);

    // --- HANDLERS ---
    const clearFilters = () => {
      setFilters({
        searchId: '',
        startDate: null,
        endDate: null,
        department: '',
        source: 'all',
        status: 'all',
        sentiment: 'all',
        urgent: 'all',
        feedbackType: 'all',
        rating: 'all',
        impactSeverity: 'all'
      });
      setTimeFilter('all');
    };

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        if (key === 'source') {
            setFilters(prev => ({ ...prev, feedbackType: 'all', rating: 'all', impactSeverity: 'all' }));
        }
    };

    const updateExportConfig = (key, value) => setExportConfig(prev => ({ ...prev, [key]: value }));
    const handleToggleSelection = (id) => {
        setSelectedForExport(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };
    const handleSelectAll = () => setSelectedForExport(new Set(processedData.map(item => item.id)));
    const handleDeselectAll = () => setSelectedForExport(new Set());
    const handleTimeFilterChange = (filter) => {
        setTimeFilter(filter);
        let startDate = null;
        let endDate = new Date();
        if (filter !== 'all' && filter !== 'custom') {
            startDate = new Date();
            if (filter === 'today') startDate.setHours(0, 0, 0, 0);
            if (filter === 'week') startDate.setDate(startDate.getDate() - 7);
            if (filter === 'month') startDate.setMonth(startDate.getMonth() - 1);
            if (filter === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
        }
        updateFilter('startDate', startDate);
        updateFilter('endDate', filter === 'today' ? startDate : endDate);
    };

    useEffect(() => {
        if (isOpen) {
            setExportConfig({
                includeDescription: true,
                includeDetails: true,
                includeReportDetails: dashboardType !== 'qa',
                includeAdminNotes: dashboardType === 'dept',
                includeRevisionNotes: dashboardType === 'dept',
                includeFinalAction: dashboardType !== 'qa',
                includeActionHistory: false,
                groupByDepartment: false,
                groupByStatus: false,
                sortBy: 'date',
                sortOrder: 'desc',
                pageOrientation: 'portrait',
                fontSize: 'medium',
                includeStatistics: true,
                includeTimestamp: true,
            });
            setFeedbackData(initialData);
            setSelectedForExport(new Set(initialSelectedIds));
            setIsFetching(false);
        } else {
            setPrintableItems(null);
            setIsGenerating(false);
            setGenerationStatus('');
        }
    }, [isOpen, initialData, initialSelectedIds, dashboardType]);

    useEffect(() => {
        if (printableItems) {
            const generatePdf = async () => {
                try {
                    setGenerationStatus('Generating PDF...');
                    const content = printableRef.current;
                    const canvas = await html2canvas(content, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const pdf = new jsPDF({ orientation: exportConfig.pageOrientation, unit: 'mm', format: 'a4', compress: true });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgHeight = canvas.height * pdfWidth / canvas.width;
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                    heightLeft -= pdfHeight;

                    while (heightLeft > 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                        heightLeft -= pdfHeight;
                    }

                    const timestamp = new Date().toISOString().split('T')[0];
                    pdf.save(`feedback-report-${dashboardType}-${timestamp}.pdf`);
                    toast.success('PDF generated successfully!');
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    toast.error('Could not generate PDF. Please try again.');
                } finally {
                    setIsGenerating(false);
                    setGenerationStatus('');
                    setPrintableItems(null);
                }
            };
            setTimeout(generatePdf, 500);
        }
    }, [printableItems, exportConfig]);

    const handleExport = async () => {
        if (selectedForExport.size === 0) {
            toast.warn('No items selected for export.');
            return;
        }
        setIsGenerating(true);
        try {
            setGenerationStatus(`Fetching details for ${selectedForExport.size} item(s)...`);
            const selectedIds = Array.from(selectedForExport);
            const promises = selectedIds.map(id =>
                fetch(`${BASE_URL}/api/feedback/${id}`).then(async (res) => {
                    if (!res.ok) throw new Error(`Failed for ID ${id}: ${res.statusText}`);
                    return res.json();
                })
            );
            const detailedItems = await Promise.all(promises);

            detailedItems.sort((a, b) => {
                let aValue, bValue;
                switch (exportConfig.sortBy) {
                    case 'id': aValue = a.id; bValue = b.id; break;
                    case 'department': aValue = a.department || ''; bValue = b.department || ''; break;
                    case 'status':
                        aValue = (dashboardType === 'qa' ? a.status : a.dept_status) || '';
                        bValue = (dashboardType === 'qa' ? b.status : b.dept_status) || '';
                        break;
                    case 'urgency': aValue = a.urgent ? 1 : 0; bValue = b.urgent ? 1 : 0; break;
                    default: aValue = new Date(a.date); bValue = new Date(b.date); break;
                }
                if (exportConfig.sortOrder === 'asc') {
                    return String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
                }
                return String(bValue).localeCompare(String(aValue), undefined, { numeric: true });
            });

            setPrintableItems(detailedItems);
        } catch (error) {
            console.error("Export process failed:", error);
            toast.error(`Export failed: ${error.message}`);
            setIsGenerating(false);
            setGenerationStatus('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}><i className="fas fa-file-pdf"></i> Advanced PDF Export</h2>
                    <button onClick={onClose} className={styles.closeButton} title="Close Modal"><i className="fas fa-times"></i></button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.leftPanel}>
                        <div className={styles.exportSection}>
                            <h3><i className="fas fa-filter"></i> Step 1: Filter Data</h3>
                            <div className={styles.timeFilterBar}>
                              {['all', 'today', 'week', 'month', 'quarter'].map(tf => (
                                <button key={tf} onClick={() => handleTimeFilterChange(tf)} className={timeFilter === tf ? styles.active : ''}>
                                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                                </button>
                              ))}
                            </div>

                            <div className={styles.filterGroup}>
                                <label>Search Feedback ID:</label>
                                <input type="text" value={filters.searchId} onChange={e => updateFilter('searchId', e.target.value)} placeholder="Enter ID to search..." className={styles.filterInput} />
                            </div>
                            <div className={styles.filterGrid}>
                                <div className={styles.filterGroup}>
                                    <label>Start Date:</label>
                                    <DatePicker selected={filters.startDate} onChange={date => updateFilter('startDate', date)} placeholderText="Start Date" className={styles.datePicker} />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>End Date:</label>
                                    <DatePicker selected={filters.endDate} onChange={date => updateFilter('endDate', date)} placeholderText="End Date" className={styles.datePicker} />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Status:</label>
                                    <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className={styles.filterSelect}>
                                        {uniqueValues.statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Sentiment:</label>
                                    <select value={filters.sentiment} onChange={e => updateFilter('sentiment', e.target.value)} className={styles.filterSelect}>
                                        <option value="all">All Sentiments</option>
                                        <option value="positive">Positive</option>
                                        <option value="negative">Negative</option>
                                        <option value="neutral">Neutral</option>
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Source:</label>
                                    <select value={filters.source} onChange={e => updateFilter('source', e.target.value)} className={styles.filterSelect}>
                                        {uniqueValues.sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Urgency:</label>
                                    <select value={filters.urgent} onChange={e => updateFilter('urgent', e.target.value)} className={styles.filterSelect}>
                                        {uniqueValues.urgencies.map(u => (
                                            <option key={u} value={u}>
                                                {u === 'all' ? 'All' : u === 'urgent' ? 'Urgent' : u === 'non-urgent' ? 'Non-Urgent' : u.charAt(0).toUpperCase() + u.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Department:</label>
                                <select value={filters.department} onChange={e => updateFilter('department', e.target.value)} className={styles.filterSelect}>
                                    <option value="">All Departments</option>
                                    {uniqueValues.departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                            </div>
                            <button
                              onClick={clearFilters}
                              title="Clear all filters"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#f44336',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                                transition: 'background-color 0.25s ease, transform 0.2s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d32f2f')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f44336')}
                              onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                              <i className="fas fa-eraser" style={{ fontSize: '16px' }}></i> Clear Filters
                            </button>              
                            {(filters.source === 'patient' || filters.source === 'visitor') && (
                                <div className={styles.filterGrid}>
                                    <div className={styles.filterGroup}>
                                        <label>Feedback Type:</label>
                                        <select value={filters.feedbackType} onChange={e => updateFilter('feedbackType', e.target.value)} className={styles.filterSelect}>
                                            {uniqueValues.externalFeedbackTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <label>Rating:</label>
                                        <select value={filters.rating} onChange={e => updateFilter('rating', e.target.value)} className={styles.filterSelect}>
                                            {uniqueValues.ratings.map(r => <option key={r} value={r}>{r === 'all' ? 'All Ratings' : `${r} Star(s)`}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {filters.source === 'staff' && (
                                <div className={styles.filterGrid}>
                                    <div className={styles.filterGroup}>
                                        <label>Feedback Type:</label>
                                        <select value={filters.feedbackType} onChange={e => updateFilter('feedbackType', e.target.value)} className={styles.filterSelect}>
                                            {uniqueValues.internalFeedbackTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <label>Impact / Severity:</label>
                                        <select value={filters.impactSeverity} onChange={e => updateFilter('impactSeverity', e.target.value)} className={styles.filterSelect}>
                                            {uniqueValues.severities.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.middlePanel}>
                        <div className={styles.exportSection}>
                            <h3><i className="fas fa-check-square"></i> Step 2: Select Items</h3>
                            <div className={styles.selectionActions}>
                                <button className={styles.actionButton} onClick={handleSelectAll}>Select All ({processedData.length})</button>
                                <button className={styles.actionButton} onClick={handleDeselectAll}>Deselect All</button>
                            </div>
                            <div className={styles.selectionList}>
                                {isFetching ? <p className={styles.loadingText}>Loading...</p> : processedData.length > 0 ? (
                                    processedData.map(item => (
                                        <div key={item.id} className={styles.selectionItem} onClick={() => handleToggleSelection(item.id)}>
                                            <input type="checkbox" checked={selectedForExport.has(item.id)} readOnly />
                                            <div className={styles.selectionItemContent}>
                                                <div className={styles.selectionItemId}>
                                                    {item.id.toUpperCase()}
                                                    {item.urgent && <span className={styles.urgentTag}>URGENT</span>}
                                                </div>
                                                <div className={styles.selectionItemMeta}>
                                                    <span>{new Date(item.date).toLocaleDateString()} | {item.department}</span>
                                                    <span className={`${styles.statusTag} ${styles[item.status]}`}>{dashboardType === 'qa' ? item.status : item.dept_status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : <p className={styles.emptyState}>No feedback matches your filters.</p>}
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightPanel}>
                        <div className={styles.exportSection}>
                            <h3><i className="fas fa-cog"></i> Step 3: Configure Export</h3>
                            <div className={styles.configGrid}>
                                <div>
                                    <h4 className={styles.configHeader}>Content to Include:</h4>
                                    {contentOptions.map(option => (
                                        <label key={option.key} className={styles.checkboxLabel}>
                                            <input type="checkbox" checked={!!exportConfig[option.key]} onChange={e => updateExportConfig(option.key, e.target.checked)} />
                                            {option.label}
                                        </label>
                                    ))}
                                    <label className={styles.checkboxLabel}><input type="checkbox" checked={exportConfig.includeStatistics} onChange={e => updateExportConfig('includeStatistics', e.target.checked)} />Summary Statistics</label>
                                </div>
                                <div>
                                    <h4 className={styles.configHeader}>Format Options:</h4>
                                    <div className={styles.configOption}>
                                        <label>Sort By:</label>
                                        <select value={exportConfig.sortBy} onChange={e => updateExportConfig('sortBy', e.target.value)} className={styles.configSelect}>
                                            <option value="date">Date</option>
                                            <option value="id">ID</option>
                                            <option value="department">Department</option>
                                            <option value="status">Status</option>
                                            <option value="urgency">Urgency</option>
                                        </select>
                                    </div>
                                    <div className={styles.configOption}>
                                        <label>Order:</label>
                                        <select value={exportConfig.sortOrder} onChange={e => updateExportConfig('sortOrder', e.target.value)} className={styles.configSelect}>
                                            <option value="desc">Descending</option>
                                            <option value="asc">Ascending</option>
                                        </select>
                                    </div>
                                    <div className={styles.configOption}>
                                        <label>Group By:</label>
                                        <select value={exportConfig.groupByDepartment ? 'department' : exportConfig.groupByStatus ? 'status' : 'none'} onChange={e => {
                                            updateExportConfig('groupByDepartment', e.target.value === 'department');
                                            updateExportConfig('groupByStatus', e.target.value === 'status');
                                        }} className={styles.configSelect}>
                                            <option value="none">None</option>
                                            <option value="department">Department</option>
                                            <option value="status">Status</option>
                                        </select>
                                    </div>
                                    <div className={styles.configOption}>
                                        <label>Page Orientation:</label>
                                        <select value={exportConfig.pageOrientation} onChange={e => updateExportConfig('pageOrientation', e.target.value)} className={styles.configSelect}>
                                            <option value="portrait">Portrait</option>
                                            <option value="landscape">Landscape</option>
                                        </select>
                                    </div>
                                    <div className={styles.configOption}>
                                        <label>Font Size:</label>
                                        <select value={exportConfig.fontSize} onChange={e => updateExportConfig('fontSize', e.target.value)} className={styles.configSelect}>
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                        </select>
                                    </div>
                                    <label className={styles.checkboxLabel} title="Includes a 'Generated on...' timestamp at the top of the report.">
                                        <input type="checkbox" checked={exportConfig.includeTimestamp} onChange={e => updateExportConfig('includeTimestamp', e.target.checked)} />
                                        Include Generation Timestamp
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className={styles.exportSection}>
                            <h3><i className="fas fa-file-export"></i> Step 4: Generate Report</h3>
                            <div className={styles.exportSummary}>
                                <div className={styles.summaryStats}>
                                    <div><span className={styles.summaryStatNumber}>{selectedForExport.size}</span><span className={styles.summaryStatLabel}>Selected</span></div>
                                    <div><span className={styles.summaryStatNumber}>{processedData.length}</span><span className={styles.summaryStatLabel}>Filtered</span></div>
                                    <div><span className={styles.summaryStatNumber}>{feedbackData.length}</span><span className={styles.summaryStatLabel}>Total</span></div>
                                </div>
                            </div>
                            <div className={styles.actionButtons}>
                                <button className={`${styles.actionButton} ${styles.confirmButton}`} onClick={handleExport} disabled={isGenerating || selectedForExport.size === 0}>
                                    {isGenerating ? <><i className="fas fa-spinner fa-spin"></i> {generationStatus}</> : <><i className="fas fa-download"></i> Generate & Download</>}
                                </button>
                                <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onClose} disabled={isGenerating}><i className="fas fa-times"></i> Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.printableContent}>
                <PrintableContent
                    ref={printableRef}
                    items={printableItems}
                    dashboardType={dashboardType}
                    prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
                    exportConfig={exportConfig}
                />
            </div>
        </div>
    );
};

ExportPDFModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    initialData: PropTypes.array.isRequired,
    initialSelectedIds: PropTypes.array.isRequired,
    dashboardType: PropTypes.oneOf(['qa', 'dept', 'admin']).isRequired,
    prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
};

export default ExportPDFModal;