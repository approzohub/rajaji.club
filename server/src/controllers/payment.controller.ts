import { Request, Response } from 'express';
import { Payment } from '../models/payment.model';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const addPaymentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  upiId: z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/, 'Please enter a valid UPI ID (e.g., username@bank)'),
  isDefault: z.boolean().optional()
});

const updatePaymentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters').optional(),
  upiId: z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/, 'Please enter a valid UPI ID (e.g., username@bank)').optional(),
  isDefault: z.boolean().optional()
});

// Get all payment methods for a user
export async function getUserPayments(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payments = await Payment.find({ 
      user: userId, 
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({ payments });
  } catch (error) {
    console.error('Error getting user payments:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
}

// Add a new payment method
export async function addPayment(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const parse = addPaymentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  const { name, upiId, isDefault = false } = parse.data;

  try {
    // Check if user already has 5 payment methods
    const existingPaymentCount = await Payment.countDocuments({ 
      user: userId, 
      isActive: true 
    });

    if (existingPaymentCount >= 5) {
      return res.status(400).json({ error: 'Maximum 5 payment methods allowed per user' });
    }

    // Check if UPI ID already exists for this user (only active payments)
    const existingPayment = await Payment.findOne({ 
      user: userId, 
      upiId: upiId.toLowerCase(),
      isActive: true
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'UPI ID already exists for this user' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Payment.updateMany(
        { user: userId, isDefault: true },
        { isDefault: false }
      );
    }

    const payment = await Payment.create({
      user: userId,
      name,
      upiId: upiId.toLowerCase(),
      isDefault
    });

    res.status(201).json({ 
      message: 'Payment method added successfully',
      payment 
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
}

// Update a payment method
export async function updatePayment(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { paymentId } = req.params;
  const parse = updatePaymentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  try {
    const payment = await Payment.findOne({ 
      _id: paymentId, 
      user: userId 
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const updateData: any = {};
    
    if (parse.data.name !== undefined) {
      updateData.name = parse.data.name;
    }
    
    if (parse.data.upiId !== undefined) {
      // Check if new UPI ID already exists for this user (only active payments)
      const existingPayment = await Payment.findOne({ 
        user: userId, 
        upiId: parse.data.upiId.toLowerCase(),
        _id: { $ne: paymentId },
        isActive: true
      });

      if (existingPayment) {
        return res.status(400).json({ error: 'UPI ID already exists for this user' });
      }
      updateData.upiId = parse.data.upiId.toLowerCase();
    }

    if (parse.data.isDefault !== undefined) {
      updateData.isDefault = parse.data.isDefault;
      
      // If setting as default, unset other defaults
      if (parse.data.isDefault) {
        await Payment.updateMany(
          { user: userId, isDefault: true, _id: { $ne: paymentId } },
          { isDefault: false }
        );
      }
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true }
    );

    res.json({ 
      message: 'Payment method updated successfully',
      payment: updatedPayment 
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
}

// Delete a payment method
export async function deletePayment(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { paymentId } = req.params;

  try {
    const payment = await Payment.findOne({ 
      _id: paymentId, 
      user: userId 
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Check if this is the only payment method
    const paymentCount = await Payment.countDocuments({ 
      user: userId, 
      isActive: true 
    });

    if (paymentCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last payment method. Please add another one first.' });
    }

    // Hard delete - completely remove from database
    await Payment.findByIdAndDelete(paymentId);

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
}

// Set default payment method
export async function setDefaultPayment(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { paymentId } = req.params;

  try {
    const payment = await Payment.findOne({ 
      _id: paymentId, 
      user: userId,
      isActive: true
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Unset other defaults
    await Payment.updateMany(
      { user: userId, isDefault: true },
      { isDefault: false }
    );

    // Set this as default
    await Payment.findByIdAndUpdate(paymentId, { isDefault: true });

    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
} 