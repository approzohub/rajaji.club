import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GameRules } from '../models/game-rules.model';
import { z } from 'zod';

const updateGameRulesSchema = z.object({
  text: z.string().min(1, 'Game rules text is required'),
});

export async function getGameRules(_req: Request, res: Response) {
  try {
    let gameRules = await GameRules.findOne();
    
    // If no game rules exist, create a default one
    if (!gameRules) {
      gameRules = await GameRules.create({
        text: 'Game rules will be displayed here.'
      });
    }
    
    res.json(gameRules);
  } catch (error: any) {
    console.error('Error getting game rules:', error);
    res.status(500).json({ error: 'Failed to get game rules' });
  }
}

export async function updateGameRules(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const parse = updateGameRulesSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error });
    }
    
    // Find existing game rules or create new one
    let gameRules = await GameRules.findOne();
    
    if (gameRules) {
      gameRules.text = parse.data.text;
      await gameRules.save();
    } else {
      gameRules = await GameRules.create({
        text: parse.data.text
      });
    }
    
    res.json(gameRules);
  } catch (error: any) {
    console.error('Error updating game rules:', error);
    res.status(500).json({ error: 'Failed to update game rules' });
  }
}

