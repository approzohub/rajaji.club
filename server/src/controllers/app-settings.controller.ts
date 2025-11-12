import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppSettingsService } from '../services/app-settings.service';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  whatsappNumber: z.string().min(10).max(15).optional(),
  whatsappEnabled: z.boolean().optional(),
  contactEmail: z.string().email().optional(),
  supportHours: z.string().optional(),
  appVersion: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
});

export async function getAppSettings(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const settings = await AppSettingsService.getCurrentSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error getting app settings:', error);
    res.status(500).json({ error: 'Failed to get app settings' });
  }
}

export async function updateAppSettings(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const parse = updateSettingsSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error });
    }
    
    const settings = await AppSettingsService.updateSettings(parse.data, req.user.id);
    res.json(settings);
  } catch (error: any) {
    console.error('Error updating app settings:', error);
    res.status(500).json({ error: 'Failed to update app settings' });
  }
}

export async function getPublicAppSettings(_req: Request, res: Response) {
  try {
    const settings = await AppSettingsService.getPublicSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error getting public app settings:', error);
    res.status(500).json({ error: 'Failed to get app settings' });
  }
} 