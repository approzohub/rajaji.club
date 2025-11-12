import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CardService } from '../services/card.service';
import { z } from 'zod';

const updateCardPriceSchema = z.object({
  newPrice: z.number().min(1),
  reason: z.string().optional(),
});

const bulkUpdatePricesSchema = z.object({
  updates: z.array(z.object({
    cardName: z.string(),
    newPrice: z.number().min(1),
  })),
  reason: z.string().optional(),
});

export async function updateCardPrice(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { cardName } = req.params;
  const parse = updateCardPriceSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  try {
    const card = await CardService.updateCardPrice(
      cardName,
      parse.data.newPrice,
      req.user.id,
      parse.data.reason
    );
    
    res.json({ 
      message: 'Card price updated successfully', 
      card 
    });
  } catch (error: any) {
    console.error('Error updating card price:', error);
    res.status(500).json({ error: error.message || 'Failed to update card price' });
  }
}

export async function bulkUpdateCardPrices(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const parse = bulkUpdatePricesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  try {
    const results = await CardService.bulkUpdatePrices(
      parse.data.updates,
      req.user.id,
      parse.data.reason
    );
    
    res.json({ 
      message: 'Bulk price update completed', 
      results 
    });
  } catch (error: any) {
    console.error('Error bulk updating card prices:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk update card prices' });
  }
}

export async function getCardPriceHistory(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { cardName } = req.params;
  
  try {
    const history = await CardService.getPriceHistory(cardName);
    res.json(history);
  } catch (error: any) {
    console.error('Error getting card price history:', error);
    res.status(500).json({ error: 'Failed to get card price history' });
  }
}

export async function initializeCards(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const results = await CardService.initializeCards();
    res.json({ 
      message: 'Cards initialized successfully', 
      results 
    });
  } catch (error: any) {
    console.error('Error initializing cards:', error);
    res.status(500).json({ error: 'Failed to initialize cards' });
  }
} 