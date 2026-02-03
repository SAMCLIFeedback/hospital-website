import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { io } from 'socket.io-client'; 
// [FIX] Added TableLayoutType to imports
import { Document, Packer, Paragraph, Table, TableRow, TableCell, ImageRun, TextRun, WidthType, AlignmentType, BorderStyle, TableLayoutType } from "docx"; 
import { saveAs } from "file-saver"; 
import 'react-toastify/dist/ReactToastify.css';
import styles from '@assets/css/QRManagement.module.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const QRManagement = () => {
  const navigate = useNavigate();

  // ── tabs & filters ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('patient');
  const [activeFilter, setActiveFilter] = useState('all');

  // ── generation state ────────────────────────────────────────
  const [isGeneratingTokens, setIsGeneratingTokens] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generationStep, setGenerationStep] = useState(null);

  // ── export state ────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCount, setExportCount] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  // ── data ────────────────────────────────────────────────────
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── lightbox ────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState(null); // stores the initial click object

  // ── fetch ───────────────────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    // If we have tokens, don't show full loading spinner on live updates
    setLoading((prev) => (tokens.length > 0 ? false : true));
    try {
      const res = await fetch(`${BASE_URL}/api/tokens`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokens(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Failed to fetch tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { 
      fetchTokens(); 
  }, [fetchTokens]);

  // ── Socket.io Connection (Live Rendering) ───────────────────
  useEffect(() => {
    // Connect to the Socket.io server
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to socket server for live updates');
    });

    // LISTENS FOR BOTH API EVENTS AND DB CHANGE STREAMS
    socket.on('tokens_updated', () => {
      console.log('Received tokens_updated event, refreshing...');
      fetchTokens();
    });

    socket.on('token_generated', () => fetchTokens());
    socket.on('token_used', () => fetchTokens());

    // Cleanup on unmount
    return () => {
      socket.off('tokens_updated');
      socket.disconnect();
    };
  }, [fetchTokens]);

  // ── Escape closes lightbox ──────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setLightbox(null); 
        setShowExportModal(false);
      }
    };
    if (lightbox || showExportModal) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [lightbox, showExportModal]);

  // ── generation ──────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerationStep('tokens');
    setIsGeneratingTokens(true);
    try {
      const r = await fetch(`${BASE_URL}/api/tokens/generate`, { method: 'POST' });
      if (!r.ok) throw new Error('Token generation failed');
      toast.success('Tokens generated successfully.');
    } catch (err) {
      toast.error(err.message);
      setGenerationStep(null);
      setIsGeneratingTokens(false);
      return;
    }
    setIsGeneratingTokens(false);

    setGenerationStep('qr');
    setIsGeneratingQR(true);
    try {
      const r = await fetch(`${BASE_URL}/api/tokens/generate-qr`, { method: 'POST' });
      if (!r.ok) throw new Error('QR generation failed');
      toast.success('QR codes generated successfully.');
    } catch (err) {
      toast.error(err.message);
      setGenerationStep(null);
      setIsGeneratingQR(false);
      return;
    }
    setIsGeneratingQR(false);
    setGenerationStep('done');
    await fetchTokens();
    setTimeout(() => setGenerationStep(null), 3000);
  };

  // ── export logic ────────────────────────────────────────────
  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      // 1. Filter only active tokens for the current tab
      const activeTokens = tokens.filter(t => t.type === activeTab && !t.used);

      if (activeTokens.length === 0) {
        toast.warning(`No active ${activeTab} tokens available to export.`);
        setIsExporting(false);
        return;
      }

      // 2. Limit by user selection
      const tokensToExport = activeTokens.slice(0, exportCount);

      // 3. Fetch image blobs for each token
      const imageBuffers = await Promise.all(
        tokensToExport.map(async (t) => {
          try {
            const res = await fetch(getQRUrl(t));
            if (!res.ok) throw new Error('Failed to load image');
            const blob = await res.blob();
            // [FIX] Convert ArrayBuffer to Uint8Array to prevent XML corruption in Word
            const arrayBuffer = await blob.arrayBuffer();
            return { token: t.token, buffer: new Uint8Array(arrayBuffer) };
          } catch (e) {
            console.error(e);
            return null;
          }
        })
      );

      const validImages = imageBuffers.filter(i => i !== null);

      // 4. Create Grid Layout 
      const COLS = 5; 
      const rows = [];
      let cells = [];

      for (let i = 0; i < validImages.length; i++) {
        const { token, buffer } = validImages[i];

        cells.push(
          new TableCell({
            width: { size: 100 / COLS, type: WidthType.PERCENTAGE },
            // [FIX] Cleanest way to remove borders without triggering Word errors
            borders: {
              top: { style: BorderStyle.NIL, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NIL, size: 0, color: "auto" },
              left: { style: BorderStyle.NIL, size: 0, color: "auto" },
              right: { style: BorderStyle.NIL, size: 0, color: "auto" },
            },
            // Padding inside cell to ensure "space apart"
            margins: { top: 100, bottom: 100, left: 100, right: 100 }, 
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: buffer,
                    // Approx 2.5cm size (roughly 100x100 in DOCX units)
                    transformation: { width: 100, height: 100 }, 
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20 }, // Minimal space between QR and text
                children: [
                  new TextRun({ 
                    text: token, 
                    bold: true, 
                    font: "Consolas", 
                    size: 16 // Smaller font (8pt)
                  })
                ],
              }),
            ],
          })
        );

        // Close row if we hit column limit or it's the last item
        if (cells.length === COLS || i === validImages.length - 1) {
          // If the last row is incomplete, we should pad it with empty cells 
          // to ensure the grid structure remains valid for Word
          while (cells.length < COLS) {
             cells.push(new TableCell({
                 width: { size: 100 / COLS, type: WidthType.PERCENTAGE },
                 borders: {
                     top: { style: BorderStyle.NIL, size: 0, color: "auto" },
                     bottom: { style: BorderStyle.NIL, size: 0, color: "auto" },
                     left: { style: BorderStyle.NIL, size: 0, color: "auto" },
                     right: { style: BorderStyle.NIL, size: 0, color: "auto" },
                 },
                 children: [new Paragraph({})], // Empty paragraph required
             }));
          }
          rows.push(new TableRow({ children: cells }));
          cells = [];
        }
      }

      // 5. Build Document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              // Minimal margins as requested (approx 0.5cm edge safety)
              margin: {
                top: 280,
                right: 280,
                bottom: 280,
                left: 280,
              },
            },
          },
          children: [
            // Simple Title
            new Paragraph({
              text: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} QR Codes`,
              heading: "Heading2",
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Table({
              rows: rows,
              // [FIX] Explicitly set table layout to FIXED to prevent layout crashes
              layout: TableLayoutType.FIXED,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                  top: { style: BorderStyle.NIL, size: 0, color: "auto" },
                  bottom: { style: BorderStyle.NIL, size: 0, color: "auto" },
                  left: { style: BorderStyle.NIL, size: 0, color: "auto" },
                  right: { style: BorderStyle.NIL, size: 0, color: "auto" },
                  insideHorizontal: { style: BorderStyle.NIL, size: 0, color: "auto" },
                  insideVertical: { style: BorderStyle.NIL, size: 0, color: "auto" },
              }
            })
          ],
        }],
      });

      // 6. Save
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${activeTab}_stickers_${validImages.length}.docx`);
      toast.success(`Exported ${validImages.length} QR codes.`);
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate document.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── derived ─────────────────────────────────────────────────
  const filtered = tokens.filter((t) => {
    if (t.type !== activeTab) return false;
    if (activeFilter === 'active') return !t.used;
    if (activeFilter === 'inactive') return !!t.used;
    return true;
  });

  const activeCount = tokens.filter(t => t.type === activeTab && !t.used).length;

  // ── helpers ─────────────────────────────────────────────────
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getQRUrl = (token) =>
    `${BASE_URL}/api/qr-codes/${token.type === 'patient' ? 'patients' : 'visitors'}/${token.token}.png`;

  const isGenerating = isGeneratingTokens || isGeneratingQR;

  const handleDownload = async (token) => {
    try {
      const res = await fetch(getQRUrl(token));
      if (!res.ok) throw new Error('Could not fetch QR');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${token.token}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  // ── Live Lightbox Data Lookup ──────────────────────────────
  const activeLightboxToken = lightbox 
    ? (tokens.find(t => t.token === lightbox.token) || lightbox) 
    : null;

  // ── render ──────────────────────────────────────────────────
  return (
    <div className={styles.pageWrapper}>
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} />

      {/* header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/QA-dashboard')}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <div>
            <h1 className={styles.pageTitle}>QR Code Manager</h1>
            <p className={styles.pageSubtitle}>Generate &amp; manage patient and visitor feedback QR codes</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {generationStep === 'done' && (
            <span className={styles.statusBadge}>
              <i className="fas fa-check-circle" /> Generation complete
            </span>
          )}
          
          {/* Export Button */}
          <button 
            className={styles.exportBtn} 
            onClick={() => setShowExportModal(true)}
            disabled={isGenerating || activeCount === 0}
            title={activeCount === 0 ? "No active tokens to export" : "Export stickers"}
          >
            <i className="fas fa-file-word" /> Export Stickers
          </button>

          <button className={styles.generateBtn} onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating
              ? <><i className="fas fa-spinner fa-spin" /> {generationStep === 'tokens' ? 'Generating tokens…' : 'Generating QRs…'}</>
              : <><i className="fas fa-qrcode" /> Generate Tokens &amp; QRs</>}
          </button>
        </div>
      </header>

      {/* stepper */}
      {generationStep && (
        <div className={styles.stepper}>
          <div className={`${styles.step} ${styles.stepActive} ${['qr','done'].includes(generationStep) ? styles.stepDone : ''}`}>
            <span className={styles.stepDot}>
              {['qr','done'].includes(generationStep) ? <i className="fas fa-check" /> : <i className="fas fa-spinner fa-spin" />}
            </span>
            <span className={styles.stepLabel}>Tokens</span>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.step} ${['qr','done'].includes(generationStep) ? styles.stepActive : ''} ${generationStep === 'done' ? styles.stepDone : ''}`}>
            <span className={styles.stepDot}>
              {generationStep === 'done' ? <i className="fas fa-check" /> : generationStep === 'qr' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-qrcode" />}
            </span>
            <span className={styles.stepLabel}>QR Codes</span>
          </div>
        </div>
      )}

      {/* tabs */}
      <div className={styles.tabBar}>
        {['patient', 'visitor'].map((tab) => (
          <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
            <i className={tab === 'patient' ? 'fas fa-user-injured' : 'fas fa-users'} />
            {tab.charAt(0).toUpperCase() + tab.slice(1)}s
            <span className={styles.tabBadge}>{tokens.filter((t) => t.type === tab).length}</span>
          </button>
        ))}
      </div>

      {/* filter pills */}
      <div className={styles.filterBar}>
        {['all', 'active', 'inactive'].map((f) => (
          <button
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.filterPillActive : ''} ${f === 'active' ? styles.filterActive : f === 'inactive' ? styles.filterInactive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {(f === 'active' || f === 'inactive') && <i className="fas fa-circle" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterCount}>
              {f === 'all'
                ? tokens.filter((t) => t.type === activeTab).length
                : f === 'active'
                  ? tokens.filter((t) => t.type === activeTab && !t.used).length
                  : tokens.filter((t) => t.type === activeTab && !!t.used).length}
            </span>
          </button>
        ))}
      </div>

      {/* token grid */}
      <div className={styles.contentArea}>
        {loading && tokens.length === 0 ? (
          <div className={styles.loadingCenter}>
            <i className="fas fa-spinner fa-spin" /><p>Loading tokens…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <i className={`fas fa-${activeTab === 'patient' ? 'user-injured' : 'users'}`} />
            <p>No {activeFilter !== 'all' ? activeFilter : ''} {activeTab} tokens found.</p>
            <span>Try changing the filter or generate new tokens.</span>
          </div>
        ) : (
          <div className={styles.tokenGrid}>
            {filtered.map((token) => (
              <div key={token._id || token.token} className={`${styles.tokenCard} ${token.used ? styles.tokenCardInactive : styles.tokenCardActive}`}>
                <span className={`${styles.ribbon} ${token.used ? styles.ribbonUsed : styles.ribbonActive}`}>
                  {token.used ? 'Used' : 'Active'}
                </span>

                {/* clickable QR area */}
                <div
                  className={styles.qrPlaceholder}
                  onClick={() => setLightbox(token)}
                  role="button"
                  aria-label={`View QR code for ${token.token}`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setLightbox(token); }}
                >
                  <img
                    src={getQRUrl(token)}
                    alt={`QR ${token.token}`}
                    className={styles.qrThumb}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <i className="fas fa-qrcode" />
                </div>

                <code className={styles.tokenValue}>{token.token}</code>

                <div className={styles.tokenMeta}>
                  <span><i className="fas fa-calendar-alt" /> Created {formatDate(token.createdAt)}</span>
                  {token.used && token.usedAt && <span><i className="fas fa-check-circle" /> Used {formatDate(token.usedAt)}</span>}
                  {token.feedbackId && <span><i className="fas fa-file-alt" /> Linked</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          LIGHTBOX
          ════════════════════════════════════════════════════════ */}
      {activeLightboxToken && (
        <div className={styles.lbOverlay} onClick={() => setLightbox(null)}>
          <div className={styles.lbPanel} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lbClose} onClick={() => setLightbox(null)} aria-label="Close">
              <i className="fas fa-times" />
            </button>
            <div className={styles.lbImageWrap}>
              <img src={getQRUrl(activeLightboxToken)} alt={`QR ${activeLightboxToken.token}`} className={styles.lbImage} />
            </div>
            <div className={styles.lbInfo}>
              <code className={styles.lbToken}>{activeLightboxToken.token}</code>
              <div className={styles.lbMeta}>
                <span className={styles.lbMetaItem}>
                  <i className={activeLightboxToken.type === 'patient' ? 'fas fa-user-injured' : 'fas fa-users'} />
                  {activeLightboxToken.type.charAt(0).toUpperCase() + activeLightboxToken.type.slice(1)}
                </span>
                <span className={`${styles.lbMetaItem} ${activeLightboxToken.used ? styles.lbBadgeUsed : styles.lbBadgeActive}`}>
                  <i className={activeLightboxToken.used ? 'fas fa-check-circle' : 'fas fa-circle'} />
                  {activeLightboxToken.used ? 'Used' : 'Active'}
                </span>
                <span className={styles.lbMetaItem}>
                  <i className="fas fa-calendar-alt" />
                  {formatDate(activeLightboxToken.createdAt)}
                </span>
              </div>
            </div>
            <div className={styles.lbActions}>
              <button className={styles.lbDownloadBtn} onClick={() => handleDownload(activeLightboxToken)}>
                <i className="fas fa-download" /> Download
              </button>
              <button className={styles.lbCloseBtn} onClick={() => setLightbox(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          EXPORT MODAL (NEW)
          ════════════════════════════════════════════════════════ */}
      {showExportModal && (
        <div className={styles.lbOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.lbPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Stickers</h3>
              <p className={styles.modalSubtitle}>Generate a .docx file for printing (approx 2.5cm stickers)</p>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Quantity to Export</label>
                <div className={styles.selectWrapper}>
                  <select 
                    value={exportCount} 
                    onChange={(e) => setExportCount(Number(e.target.value))}
                    className={styles.selectInput}
                  >
                    <option value={10}>10 Stickers</option>
                    <option value={20}>20 Stickers</option>
                    <option value={50}>50 Stickers</option>
                    <option value={activeCount}>All Active ({activeCount})</option>
                  </select>
                </div>
                <p className={styles.helperText}>
                  Will export the newest <strong>{Math.min(exportCount, activeCount)}</strong> active {activeTab} QR codes.
                </p>
              </div>
            </div>

            <div className={styles.lbActions}>
              <button 
                className={styles.lbDownloadBtn} 
                onClick={handleExportDocx}
                disabled={isExporting}
              >
                {isExporting ? <><i className="fas fa-spinner fa-spin"/> Processing...</> : <><i className="fas fa-file-word" /> Download DOCX</>}
              </button>
              <button 
                className={styles.lbCloseBtn} 
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QRManagement;