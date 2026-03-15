import { Bell, Database, Globe, Lock, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './Settings.css';

const SECTIONS = [
  { id: 'account', label: 'Account Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'backup', label: 'Data Backup', icon: Database },
  { id: 'language', label: 'Language', icon: Globe },
];

export function Settings() {
  const { data, saveSettings } = useApp();
  const [activeSection, setActiveSection] = useState('account');
  const [formState, setFormState] = useState(data?.settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(data?.settings);
  }, [data?.settings]);

  if (!formState) {
    return null;
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNestedField(section, field, value) {
    setFormState((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const message = await saveSettings(formState);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-topbar">
        <div>
          <h1 className="text-2xl font-bold">Settings & Preferences</h1>
          <p className="text-secondary mt-1">
            Every change is persisted to the backend store and reused across recommendations.
          </p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-grid">
        <div className="settings-sidebar card">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} /> {section.label}
              </button>
            );
          })}
        </div>

        <div className="settings-content card">
          {activeSection === 'account' && (
            <>
              <h2 className="text-xl font-bold mb-4">Account Profile</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formState.companyName}
                    onChange={(event) => updateField('companyName', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Business Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formState.businessEmail}
                    onChange={(event) => updateField('businessEmail', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={formState.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    className="input-field"
                    value={formState.timezone}
                    onChange={(event) => updateField('timezone', event.target.value)}
                  >
                    <option>Asia/Kolkata (IST)</option>
                    <option>UTC</option>
                    <option>Europe/London</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeSection === 'notifications' && (
            <>
              <h2 className="text-xl font-bold mb-4">Notifications</h2>
              <div className="toggle-list">
                <label className="toggle-item">
                  <span>Email alerts for deadlines</span>
                  <input
                    type="checkbox"
                    checked={formState.notifications.email}
                    onChange={(event) =>
                      updateNestedField('notifications', 'email', event.target.checked)
                    }
                  />
                </label>
                <label className="toggle-item">
                  <span>SMS reminders for overdue items</span>
                  <input
                    type="checkbox"
                    checked={formState.notifications.sms}
                    onChange={(event) =>
                      updateNestedField('notifications', 'sms', event.target.checked)
                    }
                  />
                </label>
                <label className="toggle-item">
                  <span>Weekly digest summary</span>
                  <input
                    type="checkbox"
                    checked={formState.notifications.digest}
                    onChange={(event) =>
                      updateNestedField('notifications', 'digest', event.target.checked)
                    }
                  />
                </label>
              </div>
            </>
          )}

          {activeSection === 'security' && (
            <>
              <h2 className="text-xl font-bold mb-4">Security</h2>
              <div className="toggle-list">
                <label className="toggle-item">
                  <span>Enable two-factor authentication</span>
                  <input
                    type="checkbox"
                    checked={formState.security.twoFactor}
                    onChange={(event) =>
                      updateNestedField('security', 'twoFactor', event.target.checked)
                    }
                  />
                </label>
              </div>
              <div className="form-group mt-4">
                <label>Session Timeout</label>
                <select
                  className="input-field"
                  value={formState.security.sessionTimeout}
                  onChange={(event) =>
                    updateNestedField('security', 'sessionTimeout', event.target.value)
                  }
                >
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                </select>
              </div>
            </>
          )}

          {activeSection === 'backup' && (
            <>
              <h2 className="text-xl font-bold mb-4">Data Backup</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Backup Frequency</label>
                  <select
                    className="input-field"
                    value={formState.backup.frequency}
                    onChange={(event) =>
                      updateNestedField('backup', 'frequency', event.target.value)
                    }
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Retention Policy</label>
                  <select
                    className="input-field"
                    value={formState.backup.retention}
                    onChange={(event) =>
                      updateNestedField('backup', 'retention', event.target.value)
                    }
                  >
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>180 days</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeSection === 'language' && (
            <>
              <h2 className="text-xl font-bold mb-4">Language</h2>
              <div className="form-group">
                <label>Workspace Language</label>
                <select
                  className="input-field"
                  value={formState.language}
                  onChange={(event) => updateField('language', event.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Kannada</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
