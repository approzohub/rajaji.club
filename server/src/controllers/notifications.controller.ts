import { Request, Response } from 'express';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
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
    const search = (req.query.search as string)?.trim() || '';

    // Build filter based on user role
    let filter: any = {};
    
    if (req.user.role === 'agent') {
      // Agents can only see notifications for their assigned users
      const assignedUsers = await User.find({ assignedAgent: req.user.id }).select('_id');
      const assignedUserIds = assignedUsers.map(u => u._id);
      filter.userId = { $in: assignedUserIds };
    }
    // Admin sees all notifications (no filter)

    // Add search filter if provided
    if (search) {
      // Search in user fields by finding matching users first
      const matchingUsers = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { gameId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      }).select('_id');
      const matchingUserIds = matchingUsers.map(u => u._id);
      
      filter.$or = [
        { userId: { $in: matchingUserIds } },
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { userFullName: { $regex: search, $options: 'i' } },
      ];
      
      // If filter already has userId restriction (agent), intersect
      if (filter.userId && filter.userId.$in) {
        const existingUserIds = filter.userId.$in;
        filter.userId = { $in: existingUserIds.filter((id: any) => matchingUserIds.some((mid: any) => mid.equals(id))) };
        filter.$or = [
          { userId: filter.userId },
          { title: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
          { userFullName: { $regex: search, $options: 'i' } },
        ];
      }
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter)
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
    
    // First, find the notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // If agent, verify they have access to this notification
    if (req.user.role === 'agent') {
      const assignedUsers = await User.find({ assignedAgent: req.user.id }).select('_id');
      const assignedUserIds = assignedUsers.map(u => String(u._id));
      if (!assignedUserIds.includes(String(notification.userId))) {
        return res.status(403).json({ error: 'You can only mark notifications for your assigned users as read' });
      }
    }

    // Update notification
    await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

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
    // Build filter based on user role
    let filter: any = { isRead: false };
    
    if (req.user.role === 'agent') {
      // Agents can only mark notifications for their assigned users as read
      const assignedUsers = await User.find({ assignedAgent: req.user.id }).select('_id');
      const assignedUserIds = assignedUsers.map(u => u._id);
      filter.userId = { $in: assignedUserIds };
    }
    // Admin can mark all notifications as read (no userId filter)

    await Notification.updateMany(
      filter,
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