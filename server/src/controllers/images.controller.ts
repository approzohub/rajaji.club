import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ImagesService } from '../services/images.service';
import { z } from 'zod';
import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';

const uploadSchema = z.object({
  type: z.enum(['banner', 'hero', 'general']).optional(),
  altText: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  // Carousel fields - handle string values from form data
  isCarousel: z.union([z.boolean(), z.string().transform(val => val === 'true')]).optional(),
  carouselOrder: z.union([z.number(), z.string().transform(val => parseInt(val) || 0)]).optional(),
  carouselTitle: z.string().optional(),
  carouselDescription: z.string().optional(),
  // Banner specific fields
  bannerType: z.enum(['desktop', 'mobile']).optional(),
  mobileText: z.string().optional(),
});

const updateSchema = z.object({
  type: z.enum(['banner', 'hero', 'general']).optional(),
  altText: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  // Carousel fields - handle string values from form data
  isCarousel: z.union([z.boolean(), z.string().transform(val => val === 'true')]).optional(),
  carouselOrder: z.union([z.number(), z.string().transform(val => parseInt(val) || 0)]).optional(),
  carouselTitle: z.string().optional(),
  carouselDescription: z.string().optional(),
  // Banner specific fields
  bannerType: z.enum(['desktop', 'mobile']).optional(),
  mobileText: z.string().optional(),
});

// Upload single image
export async function uploadImage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const parse = uploadSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error });
    }

    const { 
      type = 'general', 
      altText, 
      title, 
      status = 'active',
      isCarousel = false,
      carouselOrder = 0,
      carouselTitle,
      carouselDescription,
      bannerType = 'desktop',
      mobileText
    } = parse.data;

    console.log('Upload data received:', {
      type,
      bannerType,
      mobileText,
      isCarousel,
      carouselTitle
    });

    // Generate URL for the uploaded file
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

    const image = await ImagesService.createImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: imageUrl,
      type,
      altText,
      title,
      status,
      uploadedBy: req.user.id,
      // Carousel fields
      isCarousel,
      carouselOrder,
      carouselTitle,
      carouselDescription,
      // Banner specific fields
      bannerType,
      mobileText,
    });

    res.status(201).json(image);
  } catch (error: any) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

// Get all images (admin only)
export async function getImages(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    const result = await ImagesService.getImages({
      type: type as any,
      status: status as any,
      page: Number(page),
      limit: Number(limit)
    });

    console.log('getImages result:', {
      totalImages: result.images.length,
      bannerImages: result.images.filter(img => img.type === 'banner').map(img => ({
        id: img._id,
        type: img.type,
        bannerType: img.bannerType,
        mobileText: img.mobileText
      }))
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
}

// Get public images (for frontend)
export async function getPublicImages(req: Request, res: Response) {
  try {
    const { type } = req.query;
    
    const images = await ImagesService.getPublicImages(type as string);
    res.json(images);
  } catch (error: any) {
    console.error('Error fetching public images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
}

// Get carousel images (for frontend)
export async function getCarouselImages(req: Request, res: Response) {
  try {
    const images = await ImagesService.getCarouselImages();
    res.json(images);
  } catch (error: any) {
    console.error('Error fetching carousel images:', error);
    res.status(500).json({ error: 'Failed to fetch carousel images' });
  }
}

// Update image
export async function updateImage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid image id' });
  }

  try {
    console.log('Raw request body:', req.body);
    console.log('mobileText in request body:', req.body.mobileText);
    console.log('mobileText type in request:', typeof req.body.mobileText);
    
    const parse = updateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error });
    }

    console.log('Parsed data:', parse.data);
    console.log('mobileText in parsed data:', parse.data.mobileText);

    console.log('Update data:', parse.data);
    console.log('mobileText value:', parse.data.mobileText);
    console.log('mobileText type:', typeof parse.data.mobileText);

    const image = await ImagesService.updateImage(id, parse.data);
    res.json(image);
  } catch (error: any) {
    console.error('Error updating image:', error);
    if (error.message === 'Image not found') {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: 'Failed to update image' });
  }
}

// Delete image
export async function deleteImage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid image id' });
  }

  try {
    const image = await ImagesService.deleteImage(id);
    
    // Delete file from filesystem
    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    if (error.message === 'Image not found') {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

// Get image by ID
export async function getImageById(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid image id' });
  }

  try {
    const image = await ImagesService.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Only admins can see inactive images
    if (image.status === 'inactive' && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error: any) {
    console.error('Error fetching image:', error);
    if (error.message === 'Invalid image ID') {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    res.status(500).json({ error: 'Failed to fetch image' });
  }
} 