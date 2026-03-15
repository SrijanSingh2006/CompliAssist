import { AlertCircle, CheckCircle2, ExternalLink, FileText, RefreshCw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './ComplianceGuidance.css';

export function ComplianceGuidance() {
  const navigate = useNavigate();
  const { data, updateGuidanceDocument } = useApp();
  const guidance = data?.guidance;

  if (!guidance) {
    return null;
  }

  const totalDocs = guidance.requiredDocs.length;
  const readyDocs = guidance.requiredDocs.filter((d) => d.status === 'ready').length;
  const progressPct = Math.round((readyDocs / Math.max(totalDocs, 1)) * 100);
  const allReady = readyDocs === totalDocs;

  async function toggleDocument(documentId, currentStatus) {
    const nextStatus = currentStatus === 'ready' ? 'pending' : 'ready';
    try {
      const message = await updateGuidanceDocument(documentId, nextStatus);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    }
  }

  return (
    <div className="guidance-container">
      <div className="card stepper-section">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Step-by-Step Filing: {guidance.topic}</h2>
          <p className="text-secondary">{guidance.description}</p>
        </div>

        <div className="stepper">
          {guidance.steps.map((step, index) => (
            <div key={step.id} className={`step-item ${index < guidance.steps.length - 1 ? 'has-connector' : ''}`}>
              <div className="step-number">{step.num}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                <div className="step-docs flex gap-3 mt-3">
                  {step.docs.map((doc) => (
                    <span key={doc} className="doc-tag">
                      <FileText size={14} />
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-col gap-6">
        <div className="card quick-link-card">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-inverse">
            Official GST Portal
          </h3>
          <p className="mb-6 text-sm text-primary-light">
            Direct access to the official GST filing portal for GSTR-1 submission.
          </p>
          <button
            className="btn-portal whitespace-nowrap"
            onClick={() => window.open(guidance.portalUrl, '_blank', 'noopener,noreferrer')}
          >
            Open gst.gov.in <ExternalLink size={16} />
          </button>
        </div>

        <div className="card">
          <div className="doc-checklist-header">
            <h3 className="text-lg font-bold">Required Documents</h3>
            <div className="doc-progress-info">
              <span className={`doc-badge ${allReady ? 'badge-success' : 'badge-warning'}`}>
                {readyDocs}/{totalDocs} Ready
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="doc-progress-bar mt-3 mb-5">
            <div
              className={`doc-progress-fill ${allReady ? 'fill-success' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {allReady && (
            <div className="all-ready-banner">
              <Trophy size={18} />
              All documents are ready! You can now file your GSTR-1.
            </div>
          )}

          <div className="flex-col gap-4">
            {guidance.requiredDocs.map((doc) => (
              <button
                key={doc.id}
                className={`doc-check-item ${doc.status === 'ready' ? 'doc-ready' : ''}`}
                onClick={() => toggleDocument(doc.id, doc.status)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-secondary" size={18} />
                  <span className="font-medium text-sm">{doc.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`status-chip ${doc.status === 'ready' ? 'chip-ready' : 'chip-pending'}`}>
                    {doc.status === 'ready' ? '✓ Ready' : 'Pending'}
                  </span>
                  {doc.status === 'ready' ? (
                    <CheckCircle2 className="text-success" size={20} />
                  ) : (
                    <AlertCircle className="text-warning" size={20} />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-color flex justify-between items-center">
            <span className="text-sm text-secondary">
              Click a document to toggle its status
            </span>
            <button
              className="text-primary font-medium text-sm flex items-center gap-1"
              onClick={() => navigate('/storage')}
            >
              Manage Document Storage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
