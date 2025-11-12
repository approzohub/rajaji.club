import { Schema, model, Document } from 'mongoose';

export interface IImage extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  type: 'banner' | 'hero' | 'general';
  altText?: string;
  title?: string;
  status: 'active' | 'inactive';
  uploadedBy: string;
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImage>({
  filename: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  path: { 
    type: String, 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['banner', 'hero', 'general'], 
    default: 'general' 
  },
  altText: { 
    type: String 
  },
  title: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  uploadedBy: { 
    type: String, 
    required: true 
  },
  // Carousel fields
  isCarousel: {
    type: Boolean,
    default: false
  },
  carouselOrder: {
    type: Number,
    default: 0
  },
  carouselTitle: {
    type: String
  },
  carouselDescription: {
    type: String
  },
  // Banner specific fields
  bannerType: {
    type: String,
    enum: ['desktop', 'mobile'],
    default: 'desktop'
  },
  mobileText: {
    type: String
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
imageSchema.index({ type: 1, status: 1 });
imageSchema.index({ uploadedBy: 1 });
imageSchema.index({ isCarousel: 1, carouselOrder: 1 });

export const Image = model<IImage>('Image', imageSchema); 