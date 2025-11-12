import React, { useState } from 'react';
import { useGetAppSettingsQuery, useUpdateAppSettingsMutation } from '../api/appSettingsApi';
import { 
  Error as ErrorIcon, 
  CheckCircle as CheckCircleIcon, 
  WhatsApp as WhatsAppIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import './AppSettingsPage.css';

// Define the interface locally to avoid import issues
interface AppSettings {
  _id?: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail?: string;
  supportHours?: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  updatedBy: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export default function AppSettingsPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const { data: settings, isLoading: loading, error } = useGetAppSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateAppSettingsMutation();

  // Update local settings when data is fetched
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSettings) return;

    try {
      setSuccess(null);
      
      // Filter out undefined values and convert empty strings to undefined before sending to API
      const settingsToSend = Object.fromEntries(
        Object.entries(localSettings)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value])
      );
      
      console.log('Sending settings:', settingsToSend);
      await updateSettings(settingsToSend).unwrap();
      setSuccess('App settings updated successfully!');
    } catch (err: unknown) {
      console.error('Failed to update app settings:', err);
    }
  };

  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    if (!localSettings) return;
    
    // Convert empty strings to undefined for optional fields
    let processedValue: string | boolean | undefined = value;
    if (typeof value === 'string' && value.trim() === '') {
      const optionalFields: (keyof AppSettings)[] = ['contactEmail', 'supportHours', 'maintenanceMessage'];
      if (optionalFields.includes(field)) {
        processedValue = undefined;
      }
    }
    
    setLocalSettings({ ...localSettings, [field]: processedValue });
  };

  if (loading) {
    return (
      <div className="app-settings-container">
        <div className="app-settings-content">
          <div className="app-settings-header">
            <div className="app-settings-header-content">
              <h1 className="app-settings-title">App Settings</h1>
              <p className="app-settings-subtitle">Manage your application configuration and contact settings</p>
            </div>
            <div className="app-settings-icon">
              <SettingsIcon />
            </div>
          </div>
          <div className="app-settings-body">
            <div className="loading-container">
              <div>Loading app settings...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!localSettings) {
    return (
      <div className="app-settings-container">
        <div className="app-settings-content">
          <div className="app-settings-header">
            <div className="app-settings-header-content">
              <h1 className="app-settings-title">App Settings</h1>
              <p className="app-settings-subtitle">Manage your application configuration and contact settings</p>
            </div>
            <div className="app-settings-icon">
              <SettingsIcon />
            </div>
          </div>
          <div className="app-settings-body">
            <div className="alert alert-error">
              <ErrorIcon />
              {error ? String(error) : 'Failed to load app settings'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-settings-container">
      <div className="app-settings-content">
        <div className="app-settings-header">
          <div className="app-settings-header-content">
            <h1 className="app-settings-title">App Settings</h1>
            <p className="app-settings-subtitle">Manage your application configuration and contact settings</p>
          </div>
          <div className="app-settings-icon">
            <SettingsIcon />
          </div>
        </div>

        <div className="app-settings-body">
          {error && (
            <div className="alert alert-error">
              <ErrorIcon />
              {String(error)}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircleIcon />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* WhatsApp Settings */}
            <div className="settings-section">
              <div className="section-header whatsapp">
                <div className="section-icon whatsapp">
                  <WhatsAppIcon />
                </div>
                <div>
                  <h2 className="section-title">WhatsApp Settings</h2>
                  <p className="section-description">Configure WhatsApp support and contact information</p>
                </div>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">WhatsApp Number</label>
                    <div className="relative">
                      <span className="input-prefix">+91</span>
                      <input
                        type="text"
                        value={localSettings.whatsappNumber}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        className="form-input whatsapp input-with-prefix"
                        placeholder="8337407472"
                      />
                    </div>
                    <p className="form-hint">
                      <InfoIcon />
                      Enter number without country code
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">WhatsApp Status</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={localSettings.whatsappEnabled}
                        onChange={(e) => handleInputChange('whatsappEnabled', e.target.checked)}
                        className="checkbox-input whatsapp"
                      />
                      <div className="checkbox-content">
                        <div className="checkbox-label">Enable WhatsApp support button</div>
                        <div className="checkbox-description">Show WhatsApp button on user pages</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="settings-section">
              <div className="section-header contact">
                <div className="section-icon contact">
                  <EmailIcon />
                </div>
                <div>
                  <h2 className="section-title">Contact Information</h2>
                  <p className="section-description">Manage support contact details and availability</p>
                </div>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <div className="relative">
                      <EmailIcon className="input-icon" />
                      <input
                        type="email"
                        value={localSettings.contactEmail ?? ''}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        className="form-input contact input-with-icon"
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Support Hours</label>
                    <div className="relative">
                      <AccessTimeIcon className="input-icon" />
                      <input
                        type="text"
                        value={localSettings.supportHours ?? ''}
                        onChange={(e) => handleInputChange('supportHours', e.target.value)}
                        className="form-input contact input-with-icon"
                        placeholder="24/7"
                      />
                    </div>
                    <p className="form-hint">e.g., "24/7", "Mon-Fri 9AM-6PM"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* App Configuration */}
            <div className="settings-section">
              <div className="section-header config">
                <div className="section-icon config">
                  <SettingsIcon />
                </div>
                <div>
                  <h2 className="section-title">App Configuration</h2>
                  <p className="section-description">Manage application settings and maintenance mode</p>
                </div>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">App Version</label>
                    <div className="relative">
                      <BuildIcon className="input-icon" />
                      <input
                        type="text"
                        value={localSettings.appVersion}
                        onChange={(e) => handleInputChange('appVersion', e.target.value)}
                        className="form-input config input-with-icon"
                        placeholder="1.0.0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Maintenance Mode</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={localSettings.maintenanceMode}
                        onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                        className="checkbox-input config"
                      />
                      <div className="checkbox-content">
                        <div className="checkbox-label">Enable maintenance mode</div>
                        <div className="checkbox-description">Temporarily disable app access for maintenance</div>
                      </div>
                    </div>
                  </div>
                </div>

                {localSettings.maintenanceMode && (
                  <div className="maintenance-warning">
                    <label className="form-label">Maintenance Message</label>
                    <textarea
                      value={localSettings.maintenanceMessage ?? ''}
                      onChange={(e) => handleInputChange('maintenanceMessage', e.target.value)}
                      rows={3}
                      className="form-input"
                      placeholder="We're currently performing maintenance. Please check back soon..."
                    />
                    <p className="warning-text">
                      <WarningIcon />
                      This message will be displayed to users when maintenance mode is active
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Save Section */}
            <div className="save-section">
              <div className="save-content">
                <div className="save-info">
                  <h3>Save Changes</h3>
                  <p>Click the button below to save your settings</p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="save-button"
                >
                  {saving ? (
                    <>
                      <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 