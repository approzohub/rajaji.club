import { Schema, model, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  description?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  mobileText?: string;
  link?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>({
  title: { type: String, required: true },
  description: { type: String },
  desktopImageUrl: { type: String, required: true },
  mobileImageUrl: { type: String },
  mobileText: { type: String },
  link: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export const Banner = model<IBanner>('Banner', bannerSchema); 