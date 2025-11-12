import mongoose, { Document, Schema } from 'mongoose';

export interface IAppSettings extends Document {
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail?: string;
  supportHours?: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
}

const appSettingsSchema = new Schema<IAppSettings>({
  whatsappNumber: {
    type: String,
    required: true,
    default: '8337407472'
  },
  whatsappEnabled: {
    type: Boolean,
    required: true,
    default: true
  },
  contactEmail: {
    type: String,
    required: false
  },
  supportHours: {
    type: String,
    required: false,
    default: '24/7'
  },
  appVersion: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  maintenanceMode: {
    type: Boolean,
    required: true,
    default: false
  },
  maintenanceMessage: {
    type: String,
    required: false
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
appSettingsSchema.index({}, { unique: true });

export const AppSettings = mongoose.model<IAppSettings>('AppSettings', appSettingsSchema); 