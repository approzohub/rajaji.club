import { Request, Response } from 'express';
import { User, validatePhone, generateGameId } from '../models/user.model';
import { Payment } from '../models/payment.model';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().refine(validatePhone, 'Phone number must be a valid Indian mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  assignedAgent: z.string().optional(),
  role: z.enum(['user', 'agent']),
});

export async function createUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const parse = createUserSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.issues });
  const { fullName, email, phone, password, assignedAgent, role } = parse.data;
  const normalizedEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
  
  // Agents can only create users, not other agents
  if (req.user.role === 'agent' && role !== 'user') {
    return res.status(403).json({ error: 'Agents can only create users' });
  }
  
  // Check if user already exists (only check email if provided)
  const existsQuery: any = { phone };
  if (normalizedEmail) {
    existsQuery.$or = [{ email: normalizedEmail }, { phone }];
  }
  const exists = await User.findOne(existsQuery);
  if (exists) return res.status(409).json({ error: 'Email or phone already exists' });
  
  // Generate gameId
  const gameId = generateGameId(fullName, phone);
  
  // Check if gameId already exists
  const existingGameId = await User.findOne({ gameId });
  if (existingGameId) return res.status(409).json({ error: 'Game ID already exists. Please try a different name or phone number.' });
  
  const hashed = await bcrypt.hash(password, 10);
  
  // Set assignedAgent based on who is creating the user
  const finalAssignedAgent = req.user.role === 'agent' ? req.user.id : (role === 'user' ? assignedAgent : null);
  
  const user = new User({
    fullName,
    email: normalizedEmail,
    phone,
    gameId,
    password: hashed,
    assignedAgent: finalAssignedAgent,
    role,
    status: 'active',
    createdBy: req.user.id,
    mustChangePassword: true,
  });
  await user.save();
  res.status(201).json({ 
    message: 'User created', 
    userId: user._id,
    gameId: user.gameId 
  });
}

export async function listUsers(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  let users;
  if (req.user.role === 'admin') {
    // Admin can see all users
    users = await User.find().select('-password').sort({ createdAt: -1 });
  } else {
    // Agent can only see their assigned users
    users = await User.find({ assignedAgent: req.user.id }).select('-password').sort({ createdAt: -1 });
  }
  
  // Get payment methods for all users
  const usersWithPayments = await Promise.all(
    users.map(async (user) => {
      const userObj = user.toObject();
      const payments = await Payment.find({ user: user._id, isActive: true }).select('name upiId isDefault');
      return {
        ...userObj,
        paymentMethods: payments
      };
    })
  );
  
  res.json(usersWithPayments);
}

const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().refine(validatePhone, 'Phone number must be a valid Indian mobile number').optional(),
  status: z.enum(['active', 'disabled', 'banned']).optional(),
  role: z.enum(['user', 'agent']).optional(),
  assignedAgent: z.string().optional().nullable(),
});

export async function updateUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to update a user they don't own
  if (req.user.role === 'agent') {
    const userToUpdate = await User.findById(id);
    if (!userToUpdate || userToUpdate.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your assigned users' });
    }
  }
  
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.issues });
  const update: any = { ...parse.data };
  if (update.assignedAgent === undefined) delete update.assignedAgent;
  
  console.log('Update user request:', { userId: id, updateData: update });
  
  // Handle email update - convert empty/whitespace to undefined
  if (typeof update.email === 'string') {
    const trimmedEmail = update.email.trim();
    update.email = trimmedEmail ? trimmedEmail.toLowerCase() : undefined;
  }
  
  // If phone is being updated, check for duplicates and regenerate gameId
  if (update.phone) {
    const existingUser = await User.findOne({ phone: update.phone, _id: { $ne: id } });
    if (existingUser) return res.status(409).json({ error: 'Phone number already exists' });
    
    // Get current user to regenerate gameId
    const currentUser = await User.findById(id);
    if (currentUser) {
      const newGameId = generateGameId(update.fullName || currentUser.fullName, update.phone);
      const existingGameId = await User.findOne({ gameId: newGameId, _id: { $ne: id } });
      if (existingGameId) return res.status(409).json({ error: 'Game ID already exists. Please try a different name or phone number.' });
      update.gameId = newGameId;
    }
  }
  
  const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  console.log('User updated successfully:', { userId: id, updatedUser: user });
  res.json(user);
}

export async function disableUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to disable a user they don't own
  if (req.user.role === 'agent') {
    const userToDisable = await User.findById(id);
    if (!userToDisable || userToDisable.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only disable your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'disabled' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User disabled', user });
}

export async function banUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to ban a user they don't own
  if (req.user.role === 'agent') {
    const userToBan = await User.findById(id);
    if (!userToBan || userToBan.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only ban your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'banned' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User banned', user });
}

export async function activateUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to activate a user they don't own
  if (req.user.role === 'agent') {
    const userToActivate = await User.findById(id);
    if (!userToActivate || userToActivate.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only activate your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'active' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User activated', user });
}

export async function deleteUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to delete a user they don't own
  if (req.user.role === 'agent') {
    const userToDelete = await User.findById(id);
    if (!userToDelete || userToDelete.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your assigned users' });
    }
  }
  
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted', user });
}

const changeUserPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function changeUserPassword(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  console.log('Received user ID for password change:', id);
  
  if (!Types.ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).json({ error: 'Invalid user id format' });
  }
  
  console.log('Password change request:', {
    requestingUser: req.user.id,
    requestingRole: req.user.role,
    targetUserId: id,
    isSelfChange: req.user.id === id
  });
  
  // Check if agent is trying to change password for a user they don't own
  if (req.user.role === 'agent') {
    const userToChange = await User.findById(id);
    if (!userToChange || userToChange.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only change password for your assigned users' });
    }
  }
  
  // Admin can change any user's password (including their own)
  // Agent can only change their assigned users' passwords
  
  const parse = changeUserPasswordSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.issues });
  
  const { newPassword } = parse.data;
  
  try {
    const user = await User.findById(id);
    if (!user) {
      console.error('User not found for password change:', id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Found user for password change:', {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      userStatus: user.status
    });
    
    // Special handling for admin changing their own password
    if (req.user.role === 'admin' && req.user.id === id) {
      console.log('Admin is changing their own password');
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update only password fields to avoid triggering full document validation
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { password: hashedPassword, mustChangePassword: false } },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      console.error('Failed to update user password - user not found after update:', id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Password changed successfully for user:', updatedUser._id);
    
    res.json({ message: 'User password changed successfully' });
  } catch (err) {
    if (err instanceof Error) {
      console.error('Error changing user password:', err);
      console.error('Error details:', { message: err.message, stack: err.stack });
    } else {
      console.error('Error changing user password (non-Error):', err);
    }
    res.status(500).json({ error: 'Failed to change user password' });
  }
} 