import { useDeferredValue, useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './LoanRecommendations.css';

export function LoanRecommendations() {
  const { data, applyLoan, compareLoans, getLoanEligibility } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [applyingId, setApplyingId] = useState(null);
  const [eligibilityId, setEligibilityId] = useState(null);
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

  async function handleApply(loanId, bankName, loanType) {
    const confirmed = window.confirm(
      `Start application for ${bankName} ${loanType}?\n\nThis will register your interest with the lender.`,
    );
    if (!confirmed) return;
    setApplyingId(loanId);
    try {
      const message = await applyLoan(loanId);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleEligibility(loanId) {
    setEligibilityId(loanId);
    try {
      const message = await getLoanEligibility(loanId);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setEligibilityId(null);
    }
  }

  return (
    <div className="loans-container">
      <div className="loans-header">
        <div>
          <h2 className="text-2xl font-bold mb-2">Recommended Financing</h2>
          <p className="text-secondary">
            Search and compare backend-backed offers based on your saved MSME profile.
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
        {filteredLoans.map((loan) => (
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
                  className={loan.status === 'APPLICATION_STARTED' ? 'btn-success w-full' : 'btn-primary w-full'}
                  onClick={() => handleApply(loan.id, loan.bank, loan.type)}
                  disabled={loan.status === 'APPLICATION_STARTED' || applyingId === loan.id}
                >
                  {applyingId === loan.id ? (
                    <><Loader2 size={14} className="spinning" /> Applying...</>
                  ) : loan.status === 'APPLICATION_STARTED' ? (
                    '✅ Application Started'
                  ) : (
                    'Apply Now →'
                  )}
                </button>
                <div className="text-success text-xs flex items-center gap-1 mt-2">
                  <CheckCircle size={12} />
                  {loan.status === 'APPLICATION_STARTED' ? 'In progress' : 'Pre-approved match'}
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
              <button
                className="text-secondary flex items-center gap-1 hover:text-primary"
                onClick={() => handleEligibility(loan.id)}
                disabled={eligibilityId === loan.id}
              >
                {eligibilityId === loan.id ? (
                  <><Loader2 size={14} className="spinning" /> Checking...</>
                ) : (
                  <>Eligibility Details <ArrowRightCircle size={16} /></>
                )}
              </button>
            </div>
          </div>
        ))}
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
