import { Image } from '../models/image.model';
import { Types } from 'mongoose';

export interface ImageFilters {
  type?: 'banner' | 'hero' | 'general';
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface CreateImageData {
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
}

export interface UpdateImageData {
  type?: 'banner' | 'hero' | 'general';
  altText?: string;
  title?: string;
  status?: 'active' | 'inactive';
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
}

export class ImagesService {
  static async createImage(data: CreateImageData) {
    return await Image.create(data);
  }

  static async getImages(filters: ImageFilters = {}) {
    const { type, status, page = 1, limit = 20 } = filters;
    
    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    
    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id filename originalName mimeType size path url type altText title status uploadedBy isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText createdAt updatedAt');

    const total = await Image.countDocuments(filter);

    return {
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getPublicImages(type?: string) {
    const filter: any = { status: 'active' };
    if (type) filter.type = type;

    return await Image.find(filter)
      .sort({ createdAt: -1 })
      .select('url altText title type isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText');
  }

  static async getCarouselImages() {
    return await Image.find({ 
      isCarousel: true, 
      status: 'active' 
    })
    .sort({ carouselOrder: 1, createdAt: -1 })
    .select('url altText title type isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText');
  }

  static async getImageById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid image ID');
    }
    return await Image.findById(id);
  }

  static async updateImage(id: string, data: UpdateImageData) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid image ID');
    }
    
    console.log('Service updateImage - ID:', id);
    console.log('Service updateImage - Data:', data);
    
    // Use $set to ensure all fields are updated, including empty strings
    const updateData = { $set: data };
    console.log('MongoDB update operation:', updateData);
    
    const image = await Image.findByIdAndUpdate(id, updateData, { new: true });
    if (!image) {
      throw new Error('Image not found');
    }
    
    console.log('Service updateImage - Updated image:', {
      id: image._id,
      mobileText: image?.mobileText ||"",
      altText: image?.altText ||"",
      title: image?.title ||""
    });
    
    return image;
  }

  static async deleteImage(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid image ID');
    }
    
    const image = await Image.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }
    
    await Image.findByIdAndDelete(id);
    return image;
  }

  static async getBannerImages() {
    return await Image.find({ 
      type: 'banner', 
      status: 'active' 
    })
    .sort({ createdAt: -1 })
    .select('_id filename originalName mimeType size path url type altText title status uploadedBy isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText createdAt updatedAt');
  }

  static async getHeroImages() {
    return await Image.find({ 
      type: 'hero', 
      status: 'active' 
    })
    .sort({ createdAt: -1 })
    .select('_id filename originalName mimeType size path url type altText title status uploadedBy isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText createdAt updatedAt');
  }

  static async getActiveImagesByType(type: 'banner' | 'hero' | 'general') {
    return await Image.find({ 
      type, 
      status: 'active' 
    })
    .sort({ createdAt: -1 })
    .select('_id filename originalName mimeType size path url type altText title status uploadedBy isCarousel carouselOrder carouselTitle carouselDescription bannerType mobileText createdAt updatedAt');
  }
} 