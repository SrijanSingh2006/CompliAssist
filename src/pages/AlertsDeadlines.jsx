import { AlertTriangle, CheckCircle2, Clock, Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDisplayDate } from '../utils/formatters';
import { showToast } from '../utils/toast';
import './AlertsDeadlines.css';

const FILTERS = ['all', 'overdue', 'warning', 'info', 'resolved'];

export function AlertsDeadlines() {
  const { data, resolveAlert } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');
  const [loadingId, setLoadingId] = useState(null);
  const alerts = data?.alerts || [];

  let filteredAlerts = alerts;

  if (activeFilter === 'resolved') {
    filteredAlerts = alerts.filter((alert) => alert.status === 'RESOLVED');
  } else if (activeFilter !== 'all') {
    filteredAlerts = alerts.filter((alert) => alert.type === activeFilter);
  }

  const counts = {
    all: alerts.length,
    overdue: alerts.filter((alert) => alert.type === 'overdue').length,
    warning: alerts.filter((alert) => alert.type === 'warning').length,
    info: alerts.filter((alert) => alert.type === 'info').length,
    resolved: alerts.filter((alert) => alert.status === 'RESOLVED').length,
  };

  async function handleAction(alertId, alertTitle) {
    if (loadingId) return;
    const confirmed = window.confirm(
      `Mark "${alertTitle}" as resolved? This will update your compliance score.`,
    );
    if (!confirmed) return;

    setLoadingId(alertId);
    try {
      const message = await resolveAlert(alertId);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoadingId(null);
    }
  }

  function getIcon(alertType) {
    if (alertType === 'overdue') return AlertTriangle;
    if (alertType === 'warning') return Clock;
    return Info;
  }

  const overdueCount = counts.overdue;
  const openCount = alerts.filter((a) => a.status === 'OPEN').length;

  return (
    <div className="alerts-container">
      <div className="alerts-header-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Alerts &amp; Deadlines</h2>
          <p className="text-secondary">
            Resolve open items to keep your compliance score current.
          </p>
        </div>
        <div className="alerts-summary-pills">
          {overdueCount > 0 && (
            <span className="summary-pill pill-danger">
              <AlertTriangle size={14} /> {overdueCount} Overdue
            </span>
          )}
          <span className="summary-pill pill-info">
            <Clock size={14} /> {openCount} Open
          </span>
          <span className="summary-pill pill-success">
            <CheckCircle2 size={14} /> {counts.resolved} Resolved
          </span>
        </div>
      </div>

      <div className="filter-group">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}{' '}
            <span className="filter-count">({counts[filter]})</span>
          </button>
        ))}
      </div>

      <div className="flex-col gap-4">
        {filteredAlerts.length === 0 && (
          <div className="empty-alerts">
            <CheckCircle2 size={32} className="text-success" />
            <p>No alerts in this category. Great work!</p>
          </div>
        )}
        {filteredAlerts.map((alert) => {
          const Icon = getIcon(alert.type);
          const isResolved = alert.status === 'RESOLVED';
          const isLoading = loadingId === alert.id;
          const colorClass =
            alert.type === 'overdue'
              ? 'danger'
              : alert.type === 'warning'
                ? 'warning'
                : 'primary';

          return (
            <div key={alert.id} className={`card alert-card border-l-${colorClass} ${isResolved ? 'resolved' : ''}`}>
              <div className="flex gap-4">
                <div className={`icon-circle bg-${colorClass}-light text-${colorClass}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-bold">{alert.title}</h3>
                      <p className="text-secondary mb-4">{alert.desc}</p>
                    </div>
                    <span className={`status-pill ${isResolved ? 'status-resolved' : alert.type === 'overdue' ? 'status-overdue' : 'status-warning'}`}>
                      {isResolved
                        ? '✅ Resolved'
                        : alert.type === 'overdue'
                          ? '🚨 Overdue'
                          : alert.type === 'warning'
                            ? '⚠️ Due Soon'
                            : 'ℹ️ Info'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 alert-footer">
                    <div className="text-sm text-secondary flex items-center gap-1">
                      <Clock size={14} /> Due: {formatDisplayDate(alert.date)}
                    </div>
                    {isResolved ? (
                      <div className="resolved-tag">
                        <CheckCircle2 size={16} />
                        Action completed
                      </div>
                    ) : (
                      <button
                        className={alert.type === 'overdue' ? 'btn-danger' : 'btn-secondary'}
                        onClick={() => handleAction(alert.id, alert.title)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw size={14} className="spinning" />
                            Processing...
                          </>
                        ) : (
                          alert.action
                        )}
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
