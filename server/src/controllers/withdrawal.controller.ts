import { Request, Response } from 'express';
import { Withdrawal, IWithdrawal } from '../models/withdrawal.model';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { User } from '../models/user.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { createWithdrawalNotification } from './notifications.controller';

const requestSchema = z.object({
  amount: z.number().min(1),
  walletType: z.enum(['main']), // Only main wallet withdrawals allowed
  note: z.string().optional(),
  paymentMethodId: z.string().optional(),
});

const approveRejectSchema = z.object({
  note: z.string().optional().or(z.literal('')),
});

export async function requestWithdrawal(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || role !== 'user') return res.status(403).json({ error: 'Forbidden' });
  const parse = requestSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { amount, walletType, note, paymentMethodId } = parse.data;
  
  // Only allow withdrawals from main wallet
  if (walletType !== 'main') {
    return res.status(400).json({ error: 'Withdrawals are only allowed from main wallet' });
  }
  
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet.main < amount) return res.status(400).json({ error: 'Insufficient balance in main wallet' });
  
  // Deduct balance immediately when withdrawal is requested
  wallet[walletType] -= amount;
  await wallet.save();
  
  // Create withdrawal request
  const withdrawal: IWithdrawal = await Withdrawal.create({ 
    user: userId, 
    amount, 
    walletType, 
    note,
    paymentMethod: paymentMethodId
  });
  
  // Create transaction record for the deduction
  await WalletTransaction.create({
    user: userId,
    initiator: userId,
    initiatorRole: 'system',
    amount,
    walletType,
    type: 'debit',
    note: note || 'Withdrawal request',
  });

  // Get user details for notification
  const user = await User.findById(userId).select('fullName');
  
  // Create notification for admin/agent
  if (user) {
    console.log('Creating withdrawal notification for user:', user.fullName, 'amount:', amount);
    await createWithdrawalNotification({
      userId: userId,
      userFullName: user.fullName,
      withdrawalId: withdrawal.id,
      amount: amount
    });
  } else {
    console.log('No user found for notification creation');
  }

  res.status(201).json(withdrawal);
}

export async function listWithdrawals(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  let filter: any = {};
  
  // Users can only see their own withdrawals
  if (role === 'user') {
    filter.user = userId;
  } else if (role === 'agent') {
    // Agents can see withdrawals for their assigned users (TODO: implement agent-user mapping)
    // For now, agents see all withdrawals (can be restricted later)
    filter = {};
  } else if (role === 'admin') {
    // Admins see all withdrawals
    filter = {};
  } else {
    // Unknown role - default to user's own withdrawals for security
    filter.user = userId;
  }
  
  const withdrawals = await Withdrawal.find(filter)
    .populate('user', 'fullName gameId email')
    .populate('paymentMethod', 'name upiId')
    .populate('processedBy', 'fullName role')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(withdrawals);
}

export async function approveWithdrawal(req: AuthRequest, res: Response) {
  const { id: adminId, role } = req.user || {};
  if (!adminId || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid withdrawal id' });
  
  // Extract and validate note from request body
  const parse = approveRejectSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { note } = parse.data;
  
  const withdrawal = await Withdrawal.findById(id);
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  
  // Check if withdrawal is still pending
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: 'Withdrawal is not in pending status' });
  }
  
  // Update withdrawal status to completed and note if provided
  withdrawal.status = 'completed';
  withdrawal.processedBy = new Types.ObjectId(adminId);
  if (note) {
    withdrawal.note = note;
  }
  await withdrawal.save();
  
  // Create transaction record for approval
  await WalletTransaction.create({
    user: withdrawal.user,
    initiator: new Types.ObjectId(adminId),
    initiatorRole: role,
    amount: 0, // No amount involved in approval
    walletType: withdrawal.walletType,
    type: 'refund', // Using refund type to indicate status change
    note: `Withdrawal approved and completed - ${withdrawal.note || 'Withdrawal request'}`,
  });
  
  res.json(withdrawal);
}

export async function rejectWithdrawal(req: AuthRequest, res: Response) {
  const { id: adminId, role } = req.user || {};
  if (!adminId || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid withdrawal id' });
  
  // Extract and validate note from request body
  const parse = approveRejectSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { note } = parse.data;
  
  const withdrawal = await Withdrawal.findById(id);
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  
  // Check if withdrawal is still pending
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: 'Withdrawal is not in pending status' });
  }
  
  // Refund the deducted balance back to user
  const wallet = await Wallet.findOne({ user: withdrawal.user });
  if (wallet) {
    wallet[withdrawal.walletType] += withdrawal.amount;
    await wallet.save();
  }
  
  // Update withdrawal status to rejected and note if provided
  withdrawal.status = 'rejected';
  withdrawal.processedBy = new Types.ObjectId(adminId);
  if (note) {
    withdrawal.note = note;
  }
  await withdrawal.save();
  
  // Create transaction record for the refund
  await WalletTransaction.create({
    user: withdrawal.user,
    initiator: new Types.ObjectId(adminId),
    initiatorRole: role,
    amount: withdrawal.amount,
    walletType: withdrawal.walletType,
    type: 'refund',
    note: `Withdrawal rejected - refunded ${withdrawal.amount} to ${withdrawal.walletType} wallet`,
  });
  
  res.json(withdrawal);
}



 