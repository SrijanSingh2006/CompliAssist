import { Bell, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { showToast } from '../../utils/toast';
import './Header.css';

export function Header({ title }) {
  const navigate = useNavigate();
  const { data, logout } = useApp();

  async function handleLogout() {
    await logout();
    showToast('Signed out successfully.');
  }

  return (
    <header className="header">
      <div className="header-left">
        <h1>{title}</h1>
        <p>{data?.profile?.companyName || 'Compliance workspace'}</p>
      </div>
      <div className="header-right">
        <button
          className="icon-btn"
          aria-label="Help"
          onClick={() => navigate('/assistant')}
        >
          <HelpCircle size={20} />
        </button>
        <button
          className="icon-btn relative"
          aria-label="Notifications"
          onClick={() => navigate('/alerts')}
        >
          <Bell size={20} />
          {Boolean(data?.dashboard?.openAlertCount) && <span className="notification-dot"></span>}
        </button>
        <button className="icon-btn" aria-label="Logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
        <div className="compliance-score">Compliance: {data?.dashboard?.score ?? 0}%</div>
      </div>
    </header>
  );
}
