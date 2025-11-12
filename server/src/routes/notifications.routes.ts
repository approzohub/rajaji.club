import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, testNotification } from '../controllers/notifications.controller';
import { jwtAuth } from '../middleware/auth';

const router = Router();

// Get all notifications (admin/agent only)
router.get('/', jwtAuth, getNotifications);

// Mark specific notification as read
router.patch('/:id/read', jwtAuth, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', jwtAuth, markAllAsRead);

// Test endpoint for debugging
router.post('/test', jwtAuth, testNotification);

export default router; 