import { AppSettings, IAppSettings } from '../models/app-settings.model';

export class AppSettingsService {
  static async getCurrentSettings(): Promise<IAppSettings> {
    let settings = await AppSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await AppSettings.create({
        whatsappNumber: '8337407472',
        whatsappEnabled: true,
        contactEmail: '',
        supportHours: '24/7',
        appVersion: '1.0.0',
        maintenanceMode: false,
        maintenanceMessage: '',
        updatedBy: 'system'
      });
    }
    
    return settings;
  }

  static async updateSettings(updateData: Partial<IAppSettings>, updatedBy: string): Promise<IAppSettings> {
    const settings = await AppSettings.findOne();
    
    if (settings) {
      // Update existing settings
      Object.assign(settings, { ...updateData, updatedBy });
      return await settings.save();
    } else {
      // Create new settings
      return await AppSettings.create({
        ...updateData,
        updatedBy
      });
    }
  }

  static async getPublicSettings(): Promise<{
    whatsappNumber: string;
    whatsappEnabled: boolean;
    contactEmail?: string;
    supportHours?: string;
    appVersion: string;
  }> {
    const settings = await this.getCurrentSettings();
    
    return {
      whatsappNumber: settings.whatsappNumber,
      whatsappEnabled: settings.whatsappEnabled,
      contactEmail: settings.contactEmail,
      supportHours: settings.supportHours,
      appVersion: settings.appVersion
    };
  }
} 