import { useDeferredValue, useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './LoanRecommendations.css';

export function LoanRecommendations() {
  const { data, compareLoans, getLoanEligibility } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [eligibilityId, setEligibilityId] = useState(null);
  const [eligibilityResults, setEligibilityResults] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const loans = data?.loans || [];

  const filteredLoans = loans.filter((loan) => {
    const haystack = `${loan.bank} ${loan.type} ${loan.purpose}`.toLowerCase();
    return haystack.includes(deferredSearchTerm.trim().toLowerCase());
  });

  async function handleCompare() {
    setIsComparing(true);
    try {
      const message = await compareLoans();
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsComparing(false);
    }
  }

  async function handleEligibility(loanId) {
    setEligibilityId(loanId);
    try {
      const result = await getLoanEligibility(loanId);
      setEligibilityResults((prev) => ({ ...prev, [loanId]: result }));
      setExpandedId(loanId);
      showToast(result.eligible ? '✅ Eligible!' : '⚠️ Missing documents — see details below.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setEligibilityId(null);
    }
  }

  function toggleExpanded(loanId) {
    setExpandedId((prev) => (prev === loanId ? null : loanId));
  }

  return (
    <div className="loans-container">
      <div className="loans-header">
        <div>
          <h2 className="text-2xl font-bold mb-2">Recommended Financing</h2>
          <p className="text-secondary">
            Search and compare offers. Click "Eligibility Details" to check your document-based eligibility.
          </p>
        </div>
        <div className="loan-actions">
          <div className="search-box">
            <Search size={18} className="text-secondary" />
            <input
              type="text"
              placeholder="Search loans..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleCompare} disabled={isComparing}>
            {isComparing ? <RefreshCw size={18} className="spinning" /> : <SlidersHorizontal size={18} />}
            {isComparing ? 'Comparing...' : 'Compare All'}
          </button>
        </div>
      </div>

      <div className="flex-col gap-6">
        {filteredLoans.map((loan) => {
          const result = eligibilityResults[loan.id];
          const isExpanded = expandedId === loan.id;
          const isChecking = eligibilityId === loan.id;

          return (
            <div key={loan.id} className="card loan-card">
              <div className="loan-grid text-sm">
                <div className="flex items-center gap-4">
                  <div className="bank-logo">{loan.logoText}</div>
                  <div>
                    <h3 className="text-lg font-bold">{loan.bank}</h3>
                    <p className="text-secondary">{loan.type}</p>
                  </div>
                </div>

                <div>
                  <span className="text-secondary font-bold text-xs uppercase letter-spacing">
                    Interest Rate
                  </span>
                  <div className="text-xl font-bold text-primary mt-1">{loan.interest}</div>
                  <div className="text-success text-xs flex items-center gap-1 mt-1">
                    <TrendingIcon /> Competitive
                  </div>
                </div>

                <div>
                  <span className="text-secondary font-bold text-xs uppercase letter-spacing">
                    Max Amount
                  </span>
                  <div className="text-lg font-bold mt-1">{loan.amount}</div>
                </div>

                <div>
                  <span className="text-secondary font-bold text-xs uppercase letter-spacing">
                    Tenure
                  </span>
                  <div className="text-lg font-bold mt-1">{loan.tenure}</div>
                </div>

                <div>
                  <span className="text-secondary font-bold text-xs uppercase letter-spacing">
                    Purpose
                  </span>
                  <div className="text-lg font-bold mt-1">{loan.purpose}</div>
                </div>

                <div className="flex-col items-center">
                  <button
                    className="btn-primary w-full"
                    onClick={() => handleEligibility(loan.id)}
                    disabled={isChecking}
                  >
                    {isChecking ? (
                      <><Loader2 size={14} className="spinning" /> Checking...</>
                    ) : (
                      <><ArrowRightCircle size={14} /> Check Eligibility</>
                    )}
                  </button>
                  <div className="text-success text-xs flex items-center gap-1 mt-2">
                    <CheckCircle size={12} />
                    Pre-approved match
                  </div>
                </div>
              </div>

              <div className="loan-footer mt-6 pt-4 border-t">
                <div className="loan-features">
                  {loan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-secondary">
                      <span className="bullet"></span>
                      {feature}
                    </div>
                  ))}
                </div>
                {result && (
                  <button
                    className="text-secondary flex items-center gap-1 hover:text-primary"
                    onClick={() => toggleExpanded(loan.id)}
                  >
                    {isExpanded ? (
                      <><ChevronUp size={16} /> Hide eligibility</>
                    ) : (
                      <><ChevronDown size={16} /> Show eligibility</>
                    )}
                  </button>
                )}
              </div>

              {/* Inline eligibility result */}
              {result && isExpanded && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: result.eligible
                      ? 'rgba(34,197,94,0.08)'
                      : 'rgba(239,68,68,0.07)',
                    border: `1px solid ${result.eligible ? 'var(--success)' : 'var(--danger)'}`,
                  }}
                >
                  <p style={{ fontWeight: 600, color: result.eligible ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
                    {result.eligible ? '✅ Eligible' : '⚠️ Not yet eligible'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{result.message}</p>
                  {!result.eligible && result.missingDocs && result.missingDocs.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ fontSize: 12 }}>Missing documents:</strong>
                      <ul style={{ margin: '4px 0 0 16px', fontSize: 13 }}>
                        {result.missingDocs.map((doc) => (
                          <li key={doc}>{doc}</li>
                        ))}
                      </ul>
                      <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>
                        Upload these to the <strong>Document Vault</strong> to complete your eligibility.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendingIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
      <polyline points="16 7 22 7 22 13"></polyline>
    </svg>
  );
}
