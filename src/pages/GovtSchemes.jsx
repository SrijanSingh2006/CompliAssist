import { Award, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './GovtSchemes.css';

export function GovtSchemes() {
  const { data, scanSchemes, checkSchemeEligibility } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [eligibilityResults, setEligibilityResults] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const schemes = data?.schemes || [];
  const eligibleCount = schemes.filter((s) => s.match >= 80).length;

  async function handleScan() {
    setIsScanning(true);
    try {
      const message = await scanSchemes();
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCheckEligibility(schemeId) {
    setCheckingId(schemeId);
    try {
      const result = await checkSchemeEligibility(schemeId);
      setEligibilityResults((prev) => ({ ...prev, [schemeId]: result }));
      setExpandedId(schemeId);
      showToast(result.eligible ? '✅ Eligible!' : '⚠️ Not yet eligible — see details below.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setCheckingId(null);
    }
  }

  function toggleExpanded(schemeId) {
    setExpandedId((prev) => (prev === schemeId ? null : schemeId));
  }

  return (
    <div className="schemes-container">
      <div className="schemes-hero">
        <div className="hero-content">
          <span className="badge badge-ai mb-4">
            <Zap size={12} /> LIVE BACKEND MATCHING
          </span>
          <h1 className="hero-title">Discover Government Support</h1>
          <p className="hero-desc">
            Scheme recommendations are matched against your MSME profile. Eligibility is verified
            based on documents you have uploaded in the Document Vault.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{schemes.length}</strong>
              <span>Schemes Matched</span>
            </div>
            <div className="hero-stat">
              <strong>{eligibleCount}</strong>
              <span>High Match (80%+)</span>
            </div>
            <div className="hero-stat">
              <strong>{schemes.length - eligibleCount}</strong>
              <span>Need Docs / Profile</span>
            </div>
          </div>
          <button className="btn-white mt-6" onClick={handleScan} disabled={isScanning}>
            {isScanning ? (
              <>
                <RefreshCw size={16} className="spinning" /> Scanning...
              </>
            ) : (
              'Refresh Eligibility Scan'
            )}
          </button>
        </div>
        <div className="hero-icon">
          <Lightbulb size={120} strokeWidth={1} />
        </div>
      </div>

      <div className="schemes-grid">
        {schemes.map((scheme) => {
          const result = eligibilityResults[scheme.id];
          const isExpanded = expandedId === scheme.id;
          const isChecking = checkingId === scheme.id;

          return (
            <div key={scheme.id} className="card scheme-card flex-col">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex gap-2 scheme-tag-row flex-wrap">
                  {scheme.tags.map((tag) => (
                    <span key={tag} className="scheme-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="match-score">
                  <Award size={16} />
                  {scheme.match}% Match
                </div>
              </div>

              <h3 className="scheme-title">{scheme.title}</h3>
              <p className="scheme-ministry">{scheme.ministry}</p>

              <div className="scheme-details mt-4">
                <div className="detail-section">
                  <h4 className="section-label">ELIGIBILITY CRITERIA</h4>
                  <p className="detail-text">{scheme.eligibility}</p>
                </div>

                <div className="detail-section mt-4">
                  <h4 className="section-label">BENEFITS</h4>
                  <p className="detail-text">{scheme.benefits}</p>
                </div>

                {/* Eligibility check result panel */}
                {result && isExpanded && (
                  <div
                    className="detail-section mt-4"
                    style={{
                      background: result.eligible
                        ? 'rgba(34,197,94,0.08)'
                        : 'rgba(239,68,68,0.07)',
                      border: `1px solid ${result.eligible ? 'var(--success)' : 'var(--danger)'}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                    }}
                  >
                    <h4 className="section-label" style={{ color: result.eligible ? 'var(--success)' : 'var(--danger)' }}>
                      {result.eligible ? '✅ ELIGIBLE' : '⚠️ NOT YET ELIGIBLE'}
                    </h4>
                    <p className="detail-text" style={{ marginTop: 6 }}>
                      {result.message}
                    </p>
                    {!result.eligible && result.missingDocs && result.missingDocs.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <strong style={{ fontSize: 12 }}>Missing documents:</strong>
                        <ul style={{ margin: '4px 0 0 16px', fontSize: 13 }}>
                          {result.missingDocs.map((doc) => (
                            <li key={doc}>{doc}</li>
                          ))}
                        </ul>
                        <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>
                          Upload these in the <strong>Document Vault</strong> to improve eligibility.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="scheme-footer mt-6">
                  <span className="scheme-status">
                    <CheckCircle2 size={14} />
                    Recommended
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <button
                      className="btn-primary w-full"
                      onClick={() => handleCheckEligibility(scheme.id)}
                      disabled={isChecking}
                    >
                      {isChecking ? (
                        <>
                          <RefreshCw size={14} className="spinning" /> Checking...
                        </>
                      ) : (
                        'Check Eligibility →'
                      )}
                    </button>
                    {result && (
                      <button
                        className="text-secondary"
                        style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
                        onClick={() => toggleExpanded(scheme.id)}
                      >
                        {isExpanded ? <><ChevronUp size={14} /> Hide result</> : <><ChevronDown size={14} /> Show result</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
