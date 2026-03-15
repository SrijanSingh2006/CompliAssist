import {
  Banknote,
  Bell,
  BookOpen,
  Folder,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Settings,
  UserCircle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../utils/formatters';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/profile', label: 'MSME Profile', icon: UserCircle },
  { path: '/guidance', label: 'Compliance Guidance', icon: BookOpen },
  { path: '/alerts', label: 'Alerts & Deadlines', icon: Bell },
  { path: '/schemes', label: 'Govt Schemes', icon: Lightbulb },
  { path: '/loans', label: 'Loan Recommendations', icon: Banknote },
  { path: '/assistant', label: 'AI Query Assistant', icon: MessageSquare },
  { path: '/storage', label: 'Document Storage', icon: Folder },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { session, data } = useApp();
  const companyName = data?.profile?.companyName || 'CompliAssist';
  const initials = getInitials(companyName);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-mark">{initials || 'CA'}</div>
          <div>
            <h2>CompliAssist</h2>
            <p>{session?.user?.role || 'Workspace'}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="workspace-card">
          <strong>{companyName}</strong>
          <span>{data?.profile?.location || 'Business profile pending'}</span>
        </div>
      </div>
    </aside>
  );
}
