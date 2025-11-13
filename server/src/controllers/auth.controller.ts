import { Request, Response } from 'express';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

// Helper function to normalize phone number
function normalizePhoneNumber(phone: string): string[] {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a 10-digit number, return both formats
  if (digits.length === 10) {
    return [digits, `+91${digits}`];
  }
  
  // If it's a 12-digit number starting with 91, return both formats
  if (digits.length === 12 && digits.startsWith('91')) {
    const withoutCountry = digits.slice(2);
    return [`+${digits}`, withoutCountry];
  }
  
  // If it's a 13-digit number starting with +91, return both formats
  if (phone.startsWith('+91') && digits.length === 12) {
    const withoutCountry = digits.slice(2);
    return [phone, withoutCountry];
  }
  
  // Return original and cleaned version
  return [phone, digits];
}

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, Phone, or Game ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const userLoginSchema = z.object({
  identifier: z.string().min(1, 'Email, Phone, or Game ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { identifier, password } = parse.data;
  console.log(identifier, password);
  
  // Normalize phone number for search
  const normalizedPhones = normalizePhoneNumber(identifier);
  
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { gameId: identifier.toUpperCase() },
      { phone: { $in: normalizedPhones } }
    ]
  });

  console.log('user', user)

  if (!user) return res.status(401).json({ error: 'Your username or password is incorrect' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Your account has been deactivated. Please contact to admin support' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Your username or password is incorrect' });

  // Only allow admin and agent roles to access the dashboard
  if (user.role !== 'admin' && user.role !== 'agent') {
    return res.status(403).json({ error: 'Access denied. Only admin and agent roles can access this dashboard.' });
  }

  const payload = {
    id: user._id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    gameId: user.gameId
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.json({
    token,
    mustChangePassword: user.mustChangePassword,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      gameId: user.gameId,
      role: user.role
    }
  });
}

export async function logout(_req: Request, res: Response) {
  // For JWT, logout is handled client-side by deleting the token
  res.json({ message: 'Logged out' });
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export async function changePassword(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { oldPassword, newPassword } = parse.data;
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) return res.status(401).json({ error: 'Old password incorrect' });
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update only password fields to avoid triggering full document validation
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { password: hashedPassword, mustChangePassword: false } },
    { new: true, runValidators: false }
  );

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ message: 'Password changed' });
}

// Update password without requiring old password (for logged-in users)
export async function updatePassword(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const parse = updatePasswordSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { newPassword } = parse.data;
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update only password fields to avoid triggering full document validation
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { password: hashedPassword, mustChangePassword: false } },
    { new: true, runValidators: false }
  );

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ message: 'Password updated' });
}

export async function validateToken(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact to admin support' });
    }

    // Only allow admin and agent roles
    if (user.role !== 'admin' && user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        gameId: user.gameId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
}

// User platform login - allows user role
export async function userLogin(req: Request, res: Response) {
  const parse = userLoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { identifier, password } = parse.data;

  // Check if identifier looks like a phone number
  const isPhoneNumber = /^[\d+]+$/.test(identifier);
  
  let queryConditions: Array<{ email?: string; phone?: string; gameId?: string }> = [
    { email: identifier.toLowerCase() },
    { gameId: identifier.toUpperCase() }
  ];

  // If it looks like a phone number, add normalized phone number conditions
  if (isPhoneNumber) {
    const normalizedPhones = normalizePhoneNumber(identifier);
    normalizedPhones.forEach(phone => {
      queryConditions.push({ phone });
    });
  } else {
    // If it doesn't look like a phone number, just add the original identifier
    queryConditions.push({ phone: identifier });
  }

  const user = await User.findOne({
    $or: queryConditions
  });

  if (!user) return res.status(401).json({ error: 'Your username or password is incorrect' });
  // NOTE: Allow login even if status is not active; frontend will block gameplay

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Your username or password is incorrect' });

  // Allow user and agent roles for user platform (agents can also play games)
  if (user.role !== 'user' && user.role !== 'agent') {
    return res.status(403).json({ error: 'Access denied. Only user and agent roles can access this platform.' });
  }

  const payload = {
    id: user._id,
    role: user.role,
    gameId: user.gameId
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      gameId: user.gameId,
      role: user.role,
      status: user.status
    }
  });
}

// User platform token validation
export async function validateUserToken(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // NOTE: Allow validation even if not active; frontend will respect status to block gameplay

    // Allow user and agent roles
    if (user.role !== 'user' && user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        gameId: user.gameId,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
} 