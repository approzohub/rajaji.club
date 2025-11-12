import { Request, Response } from 'express';
import { CMSPage } from '../models/cms-page.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
});

export async function createCMSPage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const exists = await CMSPage.findOne({ slug: parse.data.slug });
  if (exists) return res.status(409).json({ error: 'Slug already exists' });
  const page = await CMSPage.create(parse.data);
  res.status(201).json(page);
}

export async function listCMSPages(_req: Request, res: Response) {
  const pages = await CMSPage.find().sort({ createdAt: -1 });
  res.json(pages);
}

export async function getCMSPage(req: Request, res: Response) {
  const { slug } = req.params;
  const page = await CMSPage.findOne({ slug });
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

export async function updateCMSPage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { slug } = req.params;
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const page = await CMSPage.findOneAndUpdate({ slug }, parse.data, { new: true });
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
}

export async function deleteCMSPage(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { slug } = req.params;
  await CMSPage.findOneAndDelete({ slug });
  res.json({ message: 'Page deleted' });
} 