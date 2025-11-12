import { Request, Response } from 'express';
import { Banner } from '../models/banner.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  desktopImageUrl: z.string().url('Desktop image URL must be valid'),
  mobileImageUrl: z.string().url('Mobile image URL must be valid').optional(),
  mobileText: z.string().optional(),
  link: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function createBanner(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const banner = await Banner.create(parse.data);
  res.status(201).json(banner);
}

export async function listBanners(req: AuthRequest, res: Response) {
  const role = req.user?.role;
  const filter = role === 'admin' ? {} : { status: 'active' };
  const banners = await Banner.find(filter).sort({ createdAt: -1 });
  res.json(banners);
}

const updateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  desktopImageUrl: z.string().url('Desktop image URL must be valid').optional(),
  mobileImageUrl: z.string().url('Mobile image URL must be valid').optional(),
  mobileText: z.string().optional(),
  link: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function updateBanner(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid banner id' });
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const banner = await Banner.findByIdAndUpdate(id, parse.data, { new: true });
  if (!banner) return res.status(404).json({ error: 'Banner not found' });
  res.json(banner);
}

export async function deleteBanner(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid banner id' });
  await Banner.findByIdAndDelete(id);
  res.json({ message: 'Banner deleted' });
} 