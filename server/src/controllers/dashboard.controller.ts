import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Game } from '../models/game.model';
import { Wallet } from '../models/wallet.model';
import { AuthRequest } from '../middleware/auth';

export async function getAdminStats(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { role, id: userId } = req.user;

    let userCount = 0;
    let agentCount = 0;
    let activeGames = 0;
    let totalPool = 0;
    let rechargeCount = 0;
    let txnCount = 0;

    if (role === 'admin') {
      // Admin sees all data
      userCount = await User.countDocuments({ role: 'user' });
      agentCount = await User.countDocuments({ role: 'agent' });
      activeGames = await Game.countDocuments({ status: 'open' });
      
      // Get total pool from active games
      const activeGamesData = await Game.find({ status: 'open' });
      totalPool = activeGamesData.reduce((sum, game) => sum + (game.totalPool || 0), 0);
    } else if (role === 'agent') {
      // Agent sees only their assigned users' data
      userCount = await User.countDocuments({ 
        role: 'user', 
        assignedAgent: userId 
      });
      agentCount = 0; // Agents don't see other agents
      activeGames = await Game.countDocuments({ status: 'open' });
      
      // Get total pool from active games (agents can see all games)
      const activeGamesData = await Game.find({ status: 'open' });
      totalPool = activeGamesData.reduce((sum, game) => sum + (game.totalPool || 0), 0);
    }

    // Get transaction counts (you might want to add a Transaction model for this)
    rechargeCount = 0; // Placeholder - implement when you have transaction tracking
    txnCount = 0; // Placeholder - implement when you have transaction tracking

    const stats = {
      userCount,
      agentCount,
      activeGames,
      totalPool,
      rechargeCount,
      txnCount,
      userRole: role, // Include user role for frontend to know what data is shown
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
} 