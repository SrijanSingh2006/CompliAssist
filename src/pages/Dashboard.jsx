import { AlertCircle, Clock, Globe, ShieldCheck } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDisplayDate } from '../utils/formatters';
import { showToast } from '../utils/toast';
import './Dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const { data } = useApp();
  const dashboard = data?.dashboard;
  const compliances = dashboard?.compliances || [];
  const chartData = dashboard?.chartData || [];

  return (
    <div className="dashboard-container">
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="flex-col gap-2">
            <span className="text-sm text-secondary">Compliance Health</span>
            <div className="text-2xl font-bold text-success">
              {dashboard?.healthLabel || 'Loading'}
            </div>
          </div>
          <div className="icon-wrapper bg-success-light text-success">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="flex-col gap-2">
            <span className="text-sm text-secondary">Upcoming Deadlines</span>
            <div className="text-2xl font-bold">{dashboard?.upcomingDeadlines ?? 0} Active</div>
          </div>
          <div className="icon-wrapper bg-warning-light text-warning">
            <Clock size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="flex-col gap-2">
            <span className="text-sm text-secondary">Critical Alerts</span>
            <div className="text-2xl font-bold text-danger">
              {dashboard?.overdueCount ?? 0} Overdue
            </div>
          </div>
          <div className="icon-wrapper bg-danger-light text-danger">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="compliances-list">
          <h2 className="section-title">
            <Globe className="text-primary" size={20} />
            Central Compliances
          </h2>
          <div className="flex-col gap-4 mt-4">
            {compliances.map((item) => (
              <div key={item.id} className="card compliance-item">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="item-title">{item.title}</h3>
                    <p className="item-desc">{item.desc}</p>
                  </div>
                  <span
                    className={`badge ${
                      item.status === 'COMPLETED'
                        ? 'badge-success'
                        : item.status === 'OVERDUE'
                          ? 'badge-danger'
                          : 'badge-warning'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="item-footer">
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Clock size={16} />
                    Due: {formatDisplayDate(item.date)}
                  </div>
                  <button
                    className="view-details"
                    onClick={() => {
                      navigate(item.route || '/guidance');
                      showToast(`Opened ${item.title}.`);
                    }}
                  >
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-section">
          <div className="card h-full">
            <h3 className="section-title">Status Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {chartData.map((item) => (
                  <div key={item.name} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-sm">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="storage-summary">
              <div>
                <strong>Vault usage</strong>
                <span>
                  {dashboard?.storage?.usedLabel || '0 B'} of{' '}
                  {dashboard?.storage?.limitLabel || '0 B'}
                </span>
              </div>
              <div className="progress-track">
                <span
                  className="progress-fill"
                  style={{ width: `${dashboard?.storage?.percentage ?? 0}%` }}
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
