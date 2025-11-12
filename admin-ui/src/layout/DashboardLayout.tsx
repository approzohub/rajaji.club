import { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Box, CssBaseline, Divider, Chip, Avatar, Menu, MenuItem, ListItemAvatar } from '@mui/material';
import { Dashboard, People, AccountBalanceWallet, SportsEsports, Menu as MenuIcon, Logout, AccountCircle, Percent, Casino, Settings, PhotoLibrary, MoneyOff } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useGetMyWalletQuery } from '../api/walletApi';
import { NotificationsMenu } from '../components/NotificationsMenu';

const drawerWidth = 220;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'Users', icon: <People />, path: '/users' },
  { label: 'Wallet', icon: <AccountBalanceWallet />, path: '/wallet' },
  { label: 'Withdrawals', icon: <MoneyOff />, path: '/withdrawals' },
  { label: 'Games', icon: <SportsEsports />, path: '/games' },
  { label: 'Cards', icon: <Casino />, path: '/cards', adminOnly: true },
  // { label: 'Bids', icon: <Gavel />, path: '/bids' },
  // { label: 'Notifications', icon: <Notifications />, path: '/notifications', adminOnly: true },
  // { label: 'CMS', icon: <Article />, path: '/cms', adminOnly: true },
  // { label: 'Banners', icon: <Image />, path: '/banners', adminOnly: true },
  { label: 'Images', icon: <PhotoLibrary />, path: '/images', adminOnly: true },
  { label: 'Commission', icon: <Percent />, path: '/commission', adminOnly: true },
  { label: 'App Settings', icon: <Settings />, path: '/app-settings', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const { logout, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { data: myWallet } = useGetMyWalletQuery();

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

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap color="text.primary">
          {currentUser?.role === 'agent' ? 'Agent Panel' : 'Admin Panel'}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => {
          // Only show adminOnly items for admin users
          if (item.adminOnly && currentUser?.role !== 'admin') {
            return null;
          }
          return (
            <ListItem key={item.label} disablePadding>
              <ListItemButton component={Link} to={item.path} onClick={() => setMobileOpen(false)}>
                <ListItemIcon sx={{ color: 'text.primary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ color: 'text.primary' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', bgcolor: 'background.default', color: 'text.primary' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 0 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
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
                <Typography variant="body2" fontWeight="bold" color="text.primary">
                  {currentUser?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase">
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
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', cursor: 'pointer' }}>
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
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: 'background.paper', color: 'text.primary' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: 'background.paper', color: 'text.primary' } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: { xs: 1, sm: 3 }, mt: 8, bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
} 