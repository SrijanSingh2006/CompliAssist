import { Award, CheckCircle2, Lightbulb, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './GovtSchemes.css';

export function GovtSchemes() {
  const { data, applyScheme, scanSchemes } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const schemes = data?.schemes || [];
  const appliedCount = schemes.filter((s) => s.status === 'APPLIED').length;

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

  async function handleApply(schemeId, schemeTitle) {
    const confirmed = window.confirm(
      `Start application for "${schemeTitle}"?\n\nThis will register your interest with the relevant Ministry.`,
    );
    if (!confirmed) return;

    setApplyingId(schemeId);
    try {
      const message = await applyScheme(schemeId);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setApplyingId(null);
    }
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
            Scheme recommendations are matched against your MSME profile. Click below to refresh
            your eligibility score.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{schemes.length}</strong>
              <span>Schemes Matched</span>
            </div>
            <div className="hero-stat">
              <strong>{appliedCount}</strong>
              <span>Applied</span>
            </div>
            <div className="hero-stat">
              <strong>{schemes.length - appliedCount}</strong>
              <span>Available</span>
            </div>
          </div>
          <button className="btn-white mt-6" onClick={handleScan} disabled={isScanning}>
            {isScanning ? (
              <>
                <RefreshCw size={16} className="spinning" /> Scanning...
              </>
            ) : (
              'Start Eligibility Check'
            )}
          </button>
        </div>
        <div className="hero-icon">
          <Lightbulb size={120} strokeWidth={1} />
        </div>
      </div>

      <div className="schemes-grid">
        {schemes.map((scheme) => {
          const isApplied = scheme.status === 'APPLIED';
          const isApplying = applyingId === scheme.id;

          return (
            <div key={scheme.id} className={`card scheme-card flex-col ${isApplied ? 'applied-card' : ''}`}>
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
                  <h4 className="section-label">ELIGIBILITY</h4>
                  <p className="detail-text">{scheme.eligibility}</p>
                </div>

                <div className="detail-section mt-4">
                  <h4 className="section-label flex items-center gap-1">
                    <TrendingUp size={14} className="text-success" />
                    BENEFITS
                  </h4>
                  <p className="detail-text">{scheme.benefits}</p>
                </div>

                <div className="scheme-footer mt-6">
                  <span className={`scheme-status ${isApplied ? 'applied' : ''}`}>
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={14} />
                        Applied
                      </>
                    ) : (
                      'Recommended'
                    )}
                  </span>
                  <button
                    className={isApplied ? 'btn-success w-full' : 'btn-primary w-full'}
                    onClick={() => handleApply(scheme.id, scheme.title)}
                    disabled={isApplied || isApplying}
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw size={14} className="spinning" /> Applying...
                      </>
                    ) : isApplied ? (
                      '✅ Application Started'
                    ) : (
                      'Apply Now →'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
