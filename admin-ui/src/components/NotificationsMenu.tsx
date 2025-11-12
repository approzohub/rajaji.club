import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
  Chip,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountBalanceWallet,
  Circle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from '../api/notificationsApi';
import { io } from 'socket.io-client';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface SocketData {
  notification?: Notification;
}

export function NotificationsMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: notificationsData, isLoading, refetch } = useGetNotificationsQuery({ page, limit: 20 });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const unreadCount = allNotifications.filter(n => !n.isRead).length;

  // Update notifications when data changes
  useEffect(() => {
    if (notificationsData) {
      if (page === 1) {
        setAllNotifications(notificationsData.notifications);
      } else {
        setAllNotifications(prev => [...prev, ...notificationsData.notifications]);
      }
      setHasMore(notificationsData.hasMore);
    }
  }, [notificationsData, page]);

  // Socket.IO connection for real-time notifications
  useEffect(() => {
    console.log('Setting up Socket.IO connection for notifications...');
    // Use the same API URL as the proxy configuration
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://api.rajaji.club';
    console.log('Connecting to Socket.IO at:', socketUrl);
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected for notifications, socket ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected from notifications');
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    newSocket.on('new_withdrawal_notification', (data: SocketData) => {
      console.log('🎉 New withdrawal notification received:', data);
      // Add new notification to the top of the list
      if (data.notification) {
        console.log('Adding notification to list:', data.notification);
        setAllNotifications(prev => [data.notification!, ...prev]);
      }
      // Also refetch to ensure we have the latest data
      refetch();
    });

    // Test Socket.IO connection
    newSocket.emit('test_connection', { message: 'Admin dashboard connected' });
    newSocket.on('test_response', (data: any) => {
      console.log('✅ Socket.IO test response received:', data);
    });

    return () => {
      console.log('Cleaning up Socket.IO connection');
      newSocket.close();
    };
  }, [refetch]);

  // Handle scroll for infinite loading
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20 && hasMore && !isLoadingMore) {
        loadMore();
      }
    }
  };

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    setIsLoadingMore(false);
  }, [notificationsData]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification._id);
      // Update local state
      setAllNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
    }
    
    // Always redirect to withdrawals page for withdrawal notifications
    if (notification.type === 'withdrawal_request') {
      navigate('/withdrawals');
    }
    
    handleClose();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Update local state
    setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ textTransform: 'none' }}
              >
                Mark all as read
              </Button>
            )}
          </Box>
        </Box>
        
        <Box 
          ref={scrollRef}
          sx={{ maxHeight: 400, overflow: 'auto' }}
          onScroll={handleScroll}
        >
          {isLoading && page === 1 ? (
            <MenuItem disabled>
              <Typography>Loading notifications...</Typography>
            </MenuItem>
          ) : allNotifications.length === 0 ? (
            <MenuItem disabled>
              <Typography color="text.secondary">No notifications</Typography>
            </MenuItem>
          ) : (
            <>
              {allNotifications.map((notification) => (
                <MenuItem
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    py: 2,
                    px: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                  {notification.isRead ? (
                    <Circle sx={{ fontSize: 12, color: 'text.disabled' }} />
                  ) : (
                    <Circle sx={{ fontSize: 12, color: 'primary.main' }} />
                  )}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      {notification.type === 'withdrawal_request' && (
                        <Chip
                          label="Withdrawal"
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<AccountBalanceWallet />}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(notification.createdAt)}
                      </Typography>
                    </Box>
                  }
                                   />
                 </MenuItem>
               ))}
               
               {isLoadingMore && (
                 <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                   <CircularProgress size={20} />
                 </Box>
               )}
             </>
           )}
         </Box>
        
        
      </Menu>
    </>
  );
}
