import { Request, Response } from 'express';
import { Notification } from '../models/notification.model';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../utils/socket-io';

export async function getNotifications(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments()
    ]);

    const hasMore = skip + notifications.length < total;

    res.json({
      notifications,
      total,
      page,
      limit,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

// Test endpoint to manually trigger a notification (for debugging)
export async function testNotification(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    console.log('🧪 Manual test notification triggered');
    
    const testNotification = new Notification({
      type: 'withdrawal_request',
      title: 'Test Withdrawal Request',
      message: 'This is a test withdrawal request for debugging',
      userId: req.user.id,
      userFullName: 'Test User',
      withdrawalId: 'test-123',
      isRead: false
    });

    await testNotification.save();
    console.log('Test notification created:', testNotification._id);

    // Emit Socket.IO event
    const io = getIO();
    if (io) {
      console.log('Emitting test notification via Socket.IO');
      io.emit('new_withdrawal_notification', {
        notification: testNotification.toObject(),
        message: 'Test withdrawal request'
      });
    }

    res.json({ 
      message: 'Test notification created and emitted',
      notification: testNotification.toObject()
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
}

// Function to create withdrawal notification (called from withdrawal controller)
export async function createWithdrawalNotification(withdrawalData: {
  userId: string;
  userFullName: string;
  withdrawalId: string;
  amount: number;
}) {
  try {
    console.log('Starting notification creation for withdrawal:', withdrawalData);
    
    const notification = new Notification({
      type: 'withdrawal_request',
      title: 'New Withdrawal Request',
      message: `${withdrawalData.userFullName} has requested a withdrawal of ₹${withdrawalData.amount.toLocaleString()}`,
      userId: withdrawalData.userId,
      userFullName: withdrawalData.userFullName,
      withdrawalId: withdrawalData.withdrawalId,
      isRead: false
    });

    await notification.save();
    console.log('Withdrawal notification created and saved:', notification._id);

    // Emit Socket.IO event for real-time notification
    const io = getIO();
    if (io) {
      console.log('Socket.IO instance found, emitting new_withdrawal_notification event');
      console.log('Notification data to emit:', {
        notification: notification.toObject(),
        message: `New withdrawal request from ${withdrawalData.userFullName}`
      });
      
      io.emit('new_withdrawal_notification', {
        notification: notification.toObject(),
        message: `New withdrawal request from ${withdrawalData.userFullName}`
      });
      
      console.log('Socket.IO event emitted successfully');
    } else {
      console.log('Socket.IO not available for notification emission');
    }
  } catch (error) {
    console.error('Error creating withdrawal notification:', error);
  }
} 