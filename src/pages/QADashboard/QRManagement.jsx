import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { io } from 'socket.io-client'; 
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
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    if (lightbox) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [lightbox]);

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

  // ── derived ─────────────────────────────────────────────────
  const filtered = tokens.filter((t) => {
    if (t.type !== activeTab) return false;
    if (activeFilter === 'active') return !t.used;
    if (activeFilter === 'inactive') return !!t.used;
    return true;
  });

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
  // This ensures the modal data is always fresh from the 'tokens' array
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
      {/* IMPORTANT: We use `activeLightboxToken` here instead of `lightbox`.
          This ensures that if the background data updates (e.g. status changes to 'Used'),
          the modal reflects that change immediately.
      */}
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
                
                {/* Dynamic Status Badge */}
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
    </div>
  );
};

export default QRManagement;