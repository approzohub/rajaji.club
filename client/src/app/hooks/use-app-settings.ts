import { useState, useEffect } from 'react';

interface AppSettings {
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail?: string;
  supportHours?: string;
  appVersion: string;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/app-settings/public`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch app settings');
        }
        
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Error fetching app settings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to default settings
        setSettings({
          whatsappNumber: '8337407472',
          whatsappEnabled: true,
          contactEmail: '',
          supportHours: '24/7',
          appVersion: '1.0.0'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, loading, error };
} 