import { Schema, model, Document } from 'mongoose';

export interface ICMSPage extends Document {
  title: string;
  slug: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const cmsPageSchema = new Schema<ICMSPage>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
}, { timestamps: true });

export const CMSPage = model<ICMSPage>('CMSPage', cmsPageSchema); 