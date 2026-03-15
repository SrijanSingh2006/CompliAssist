import { Briefcase, Building, Globe, MapPin, Save, Users, Verified } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/formatters';
import { showToast } from '../utils/toast';
import './MSMEProfile.css';

export function MSMEProfile() {
  const { data, saveProfile } = useApp();
  const profile = data?.profile;
  const [formState, setFormState] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(profile);
  }, [profile]);

  if (!formState) {
    return null;
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const message = await saveProfile(formState);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-container flex-col gap-6">
      <div className="verification-banner card bg-success-light text-success flex items-center gap-3 border-success">
        <Verified size={24} />
        <div>
          <h3 className="font-bold">{profile.verificationStatus}</h3>
          <p className="text-sm">
            Your MSME profile is connected and the current Udyam registration is available for
            downstream workflows.
          </p>
        </div>
      </div>

      <div className="card profile-card overflow-hidden p-0">
        <div className="profile-header bg-primary text-white">
          <div className="flex items-center gap-6 relative z-10">
            <div className="profile-avatar">
              <span className="text-4xl font-bold text-primary">
                {getInitials(profile.companyName)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold m-0">{profile.companyName}</h1>
              <p className="opacity-90 mt-1 flex items-center gap-2">
                <MapPin size={16} /> {profile.location}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 profile-body">
          <div className="summary-grid">
            <div className="detail-item">
              <div className="detail-icon bg-primary-light text-primary">
                <Building size={20} />
              </div>
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                  Business Type
                </span>
                <p className="font-medium mt-1">{profile.businessType}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon bg-primary-light text-primary">
                <Briefcase size={20} />
              </div>
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                  Industry
                </span>
                <p className="font-medium mt-1">{profile.industry}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon bg-primary-light text-primary">
                <Users size={20} />
              </div>
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                  Company Size
                </span>
                <p className="font-medium mt-1">{profile.companySize}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon bg-primary-light text-primary">
                <Verified size={20} />
              </div>
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                  Udyam Registration
                </span>
                <p className="font-medium mt-1">{profile.udyamRegistration}</p>
              </div>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-form-header">
              <div>
                <h3 className="text-lg font-bold">Business Details</h3>
                <p className="text-secondary text-sm mt-1">
                  Changes made here update the backend seed store and refresh recommendations.
                </p>
              </div>
              <button className="btn-primary" type="submit" disabled={isSaving}>
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  className="input-field"
                  value={formState.companyName}
                  onChange={(event) => updateField('companyName', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Short Name</label>
                <input
                  className="input-field"
                  maxLength={6}
                  value={formState.shortName}
                  onChange={(event) => updateField('shortName', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  className="input-field"
                  value={formState.location}
                  onChange={(event) => updateField('location', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Founded Year</label>
                <input
                  className="input-field"
                  value={formState.foundedYear}
                  onChange={(event) => updateField('foundedYear', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Business Type</label>
                <input
                  className="input-field"
                  value={formState.businessType}
                  onChange={(event) => updateField('businessType', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Industry</label>
                <input
                  className="input-field"
                  value={formState.industry}
                  onChange={(event) => updateField('industry', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Company Size</label>
                <input
                  className="input-field"
                  value={formState.companySize}
                  onChange={(event) => updateField('companySize', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Employees</label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={formState.employees}
                  onChange={(event) => updateField('employees', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Udyam Registration</label>
                <input
                  className="input-field"
                  value={formState.udyamRegistration}
                  onChange={(event) => updateField('udyamRegistration', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>PAN</label>
                <input
                  className="input-field"
                  value={formState.pan}
                  onChange={(event) => updateField('pan', event.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Website</label>
                <div className="input-with-icon">
                  <Globe size={16} />
                  <input
                    className="input-field icon-input"
                    value={formState.website}
                    onChange={(event) => updateField('website', event.target.value)}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Business Description</label>
                <textarea
                  className="input-field textarea-field"
                  rows="4"
                  value={formState.description}
                  onChange={(event) => updateField('description', event.target.value)}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
