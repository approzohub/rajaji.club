import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, ThemeProvider } from '@mui/material';
import { AuthProvider, useAuth } from './auth';
import { getTheme } from './theme';
import Login from './Login';
import DashboardLayout from './layout/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import UsersPage from './pages/UsersPage';
import WalletPage from './pages/WalletPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import GamesPage from './pages/GamesPage';
import BidsPage from './pages/BidsPage';
import NotificationsPage from './pages/NotificationsPage';
import CMSPage from './pages/CMSPage';

import ImagesPage from './pages/ImagesPage';
import CommissionPage from './pages/CommissionPage';
import CardsPage from './pages/CardsPage';
import AppSettingsPage from './pages/AppSettingsPage';
import GameRulesPage from './pages/GameRulesPage';

function LoadingScreen() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <CircularProgress size={60} />
    </Box>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardHome />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <UsersPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/wallet" element={<ProtectedRoute><DashboardLayout><WalletPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/withdrawals" element={<ProtectedRoute><DashboardLayout><WithdrawalsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/games" element={<ProtectedRoute><DashboardLayout><GamesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/cards" element={<ProtectedRoute><DashboardLayout><CardsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/bids" element={<ProtectedRoute><DashboardLayout><BidsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><NotificationsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/cms" element={<ProtectedRoute><DashboardLayout><CMSPage /></DashboardLayout></ProtectedRoute>} />

      <Route path="/images" element={<ProtectedRoute><DashboardLayout><ImagesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/commission" element={<ProtectedRoute><DashboardLayout><CommissionPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/app-settings" element={<ProtectedRoute><DashboardLayout><AppSettingsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/game-rules" element={<ProtectedRoute><DashboardLayout><GameRulesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  const darkTheme = getTheme('dark');
  
  return (
    <ThemeProvider theme={darkTheme}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
