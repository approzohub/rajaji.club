import { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Box, CssBaseline, Divider, Chip, Avatar, Menu, MenuItem, ListItemAvatar, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField, Button, Alert } from '@mui/material';
import { Dashboard, People, AccountBalanceWallet, SportsEsports, Menu as MenuIcon, Logout, AccountCircle, Percent, Casino, Settings, PhotoLibrary, MoneyOff, Lock, ChevronLeft, ChevronRight, Rule, History } from '@mui/icons-material';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useGetMyWalletQuery } from '../api/walletApi';
import { NotificationsMenu } from '../components/NotificationsMenu';
import { useUpdatePasswordMutation } from '../api/authApi';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const navItems: Array<{
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  agentOnly?: boolean;
}> = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'Users', icon: <People />, path: '/users' },
  { label: 'Wallet', icon: <AccountBalanceWallet />, path: '/wallet' },
  { label: 'Withdrawals', icon: <MoneyOff />, path: '/withdrawals' },
  { label: 'Games', icon: <SportsEsports />, path: '/games' },
  { label: 'Payment History', icon: <History />, path: '/payment-history', agentOnly: true },
  { label: 'Cards', icon: <Casino />, path: '/cards', adminOnly: true },
  // { label: 'Bids', icon: <Gavel />, path: '/bids' },
  // { label: 'Notifications', icon: <Notifications />, path: '/notifications', adminOnly: true },
  // { label: 'CMS', icon: <Article />, path: '/cms', adminOnly: true },
  // { label: 'Banners', icon: <Image />, path: '/banners', adminOnly: true },
  { label: 'Images', icon: <PhotoLibrary />, path: '/images', adminOnly: true },
  { label: 'Commission', icon: <Percent />, path: '/commission', adminOnly: true },
  { label: 'App Settings', icon: <Settings />, path: '/app-settings', adminOnly: true },
  { label: 'Game Rules', icon: <Rule />, path: '/game-rules', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const { logout, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: myWallet } = useGetMyWalletQuery();
  const [updatePassword] = useUpdatePasswordMutation();
  
  const { register: passwordRegister, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting } } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handlePasswordChangeClick = () => {
    handleProfileMenuClose();
    setPasswordChangeOpen(true);
    setPasswordChangeError(null);
  };

  const handlePasswordChangeSubmit = async (data: ChangePasswordForm) => {
    setPasswordChangeError(null);
    try {
      await updatePassword({ newPassword: data.newPassword }).unwrap();
      setPasswordChangeOpen(false);
      resetPassword();
    } catch (e) {
      console.error('Password change error:', e);
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to change password';
      setPasswordChangeError(apiError);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      <Toolbar sx={{ minHeight: '64px !important', bgcolor: '#0f0f0f', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {!sidebarCollapsed && (
          <Typography variant="h6" noWrap sx={{ color: '#e0e0e0', fontWeight: 600 }}>
          {currentUser?.role === 'agent' ? 'Agent Panel' : 'Admin Panel'}
        </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          sx={{ color: '#b0b0b0', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}
        >
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
      <List sx={{ flexGrow: 1, py: 1, px: 1 }}>
        {navItems.map((item) => {
          // Only show adminOnly items for admin users
          if (item.adminOnly && currentUser?.role !== 'admin') {
            return null;
          }
          // Only show agentOnly items for agent users
          if (item.agentOnly && currentUser?.role !== 'agent') {
            return null;
          }
          const active = isActive(item.path);
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: '8px',
                  bgcolor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: active ? '#e0e0e0' : '#a0a0a0',
                  '&:hover': {
                    bgcolor: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#e0e0e0',
                    '& .MuiListItemIcon-root': {
                      color: '#e0e0e0',
                    },
                  },
                  minHeight: 48,
                  px: sidebarCollapsed ? 1.5 : 2,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: active ? '#e0e0e0' : '#a0a0a0',
                    minWidth: sidebarCollapsed ? 0 : 40,
                    justifyContent: 'center',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      fontSize: '0.9rem',
                      fontWeight: active ? 600 : 400,
                    }} 
                    sx={{
                      '& .MuiTypography-root': {
                        transition: 'color 0.2s ease',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  const currentDrawerWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', bgcolor: '#2a2a2a', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1, 
          bgcolor: '#1f1f1f',
          color: '#e0e0e0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          transition: (theme) => theme.transitions.create(['width', 'left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          left: { sm: `${currentDrawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton 
            color="inherit" 
            edge="start" 
            onClick={handleDrawerToggle} 
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: '#b0b0b0',
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#e0e0e0', fontWeight: 600 }}>
            {currentUser?.role === 'agent' ? 'Agent Dashboard' : 'Admin Dashboard'}
          </Typography>
          
          {/* User Info and Wallet Balance */}
          <Box display="flex" alignItems="center" gap={2} sx={{ mr: 2 }}>
            {/* Notifications Menu */}
            <NotificationsMenu />
            
            {/* Wallet Balance for Agents */}
            {currentUser?.role === 'agent' && myWallet && (
              <Chip
                label={`₹${myWallet.main.toLocaleString()}`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ 
                  fontWeight: 'bold',
                  borderColor: 'success.main',
                  color: 'success.main'
                }}
              />
            )}
            
            {/* User Name and Role */}
            <Box display="flex" alignItems="center" gap={1}>
              <Box>
                <Typography variant="body2" fontWeight="bold" color="#e0e0e0">
                  {currentUser?.fullName}
                </Typography>
                <Typography variant="caption" color="#a0a0a0" textTransform="uppercase">
                  {currentUser?.role}
                </Typography>
              </Box>
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{ p: 0 }}
                aria-controls={profileMenuAnchor ? 'profile-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={profileMenuAnchor ? 'true' : undefined}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#404040', cursor: 'pointer' }}>
                  <AccountCircle />
                </Avatar>
              </IconButton>
            </Box>
          </Box>
          
          {/* Profile Dropdown Menu */}
          <Menu
            id="profile-menu"
            anchorEl={profileMenuAnchor}
            open={Boolean(profileMenuAnchor)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                boxShadow: 3,
              }
            }}
          >
            <MenuItem disabled>
              <ListItemAvatar>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  <AccountCircle />
                </Avatar>
              </ListItemAvatar>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {currentUser?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                  {currentUser?.role}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handlePasswordChangeClick}>
              <ListItemIcon>
                <Lock fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Change My Password" />
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box 
        component="nav" 
        sx={{ 
          width: { sm: currentDrawerWidth }, 
          flexShrink: { sm: 0 },
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ 
            display: { xs: 'block', sm: 'none' }, 
            '& .MuiDrawer-paper': { 
              width: drawerWidth, 
              bgcolor: '#1a1a1a',
              color: '#e0e0e0',
            } 
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            '& .MuiDrawer-paper': { 
              width: currentDrawerWidth, 
              boxSizing: 'border-box', 
              bgcolor: '#1a1a1a',
              color: '#e0e0e0',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              transition: (theme) => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            } 
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          maxWidth: 'none',
          minWidth: 0,
          p: { xs: 1, sm: 3 }, 
          mt: 8, 
          bgcolor: '#2a2a2a',
          color: '#e0e0e0',
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          transition: (theme) => theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflowX: 'hidden',
        }}
      >
        {children}
      </Box>

      {/* Change My Password Dialog */}
      <Dialog open={passwordChangeOpen} onClose={() => setPasswordChangeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change My Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit(handlePasswordChangeSubmit)}>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Change password for: <strong>{currentUser?.fullName}</strong> ({currentUser?.email})
            </DialogContentText>
            <TextField 
              label="New Password" 
              type="password" 
              fullWidth 
              margin="normal" 
              {...passwordRegister('newPassword')} 
              error={!!passwordErrors.newPassword} 
              helperText={passwordErrors.newPassword?.message} 
            />
            <TextField 
              label="Confirm Password" 
              type="password" 
              fullWidth 
              margin="normal" 
              {...passwordRegister('confirmPassword')} 
              error={!!passwordErrors.confirmPassword} 
              helperText={passwordErrors.confirmPassword?.message} 
            />
            {passwordChangeError && <Alert severity="error" sx={{ mt: 2 }}>{passwordChangeError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordChangeOpen(false)} disabled={isPasswordSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 