import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  SportsEsports as GamesIcon,
  AccountBalanceWallet as WalletIcon,
  Payment as PaymentIcon,
  Receipt as TransactionIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { useGetDashboardStatsQuery } from '../api/dashboardApi';
import { useAuth } from '../auth';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ sx?: React.CSSProperties }>;
  color: string;
  subtitle?: string;
}

export default function DashboardHome() {
  const { data: stats, isLoading, error, refetch } = useGetDashboardStatsQuery();
  const { user: currentUser } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 4 }}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={() => refetch()}
          >
            <RefreshIcon />
          </IconButton>
        }
      >
        {(error as { data?: { error?: string } })?.data?.error || 'Failed to load dashboard stats'}
      </Alert>
    );
  }

  if (!stats) return null;

  const isAgent = currentUser?.role === 'agent';
  const isAdmin = currentUser?.role === 'admin';

  // Prepare chart data based on user role
  const userData = isAgent 
    ? [
        { name: 'My Users', value: stats.userCount, color: '#0088FE' },
      ]
    : [
        { name: 'Users', value: stats.userCount, color: '#0088FE' },
        { name: 'Agents', value: stats.agentCount, color: '#00C49F' },
      ];

  const transactionData = [
    { name: 'Recharges', value: stats.rechargeCount, color: '#8884D8' },
    { name: 'Transactions', value: stats.txnCount, color: '#82CA9D' },
  ];

  // Mock data for line chart (you can replace with real data from API)
  const poolTrendData = [
    { time: '00:00', pool: 0 },
    { time: '04:00', pool: 50 },
    { time: '08:00', pool: 120 },
    { time: '12:00', pool: 200 },
    { time: '16:00', pool: 150 },
    { time: '20:00', pool: 300 },
    { time: '24:00', pool: stats.totalPool },
  ];

  const StatCard = ({ title, value, icon: Icon, color = 'primary', subtitle = '' }: StatCardProps) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold" color={color}>
              {typeof value === 'number' && title.includes('Pool') ? `₹${value.toLocaleString()}` : value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            <Icon sx={{ fontSize: 32 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          {isAgent ? 'My Dashboard' : 'Dashboard Overview'}
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={() => refetch()} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
        <Box flex="1" minWidth="250px">
          <StatCard
            title={isAgent ? "My Users" : "Total Users"}
            value={stats.userCount}
            icon={PeopleIcon}
            color="#0088FE"
            subtitle={isAgent ? "Assigned users" : "Registered users"}
          />
        </Box>
        {isAdmin && (
          <Box flex="1" minWidth="250px">
            <StatCard
              title="Agents"
              value={stats.agentCount}
              icon={PersonIcon}
              color="#00C49F"
              subtitle="Active agents"
            />
          </Box>
        )}
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Active Games"
            value={stats.activeGames}
            icon={GamesIcon}
            color="#FFBB28"
            subtitle="Running games"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Pool"
            value={stats.totalPool}
            icon={WalletIcon}
            color="#FF8042"
            subtitle="Current pool amount"
          />
        </Box>
      </Box>

      {/* Charts Section */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
        {/* Pool Trend Chart */}
        <Box flex="2" minWidth="600px">
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pool Trend (24 Hours)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={poolTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value: number) => [`₹${value}`, 'Pool Amount']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pool" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* User Distribution Pie Chart */}
        <Box flex="1" minWidth="300px">
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isAgent ? 'My User Distribution' : 'User Distribution'}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Additional Stats */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box flex="1" minWidth="400px">
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Transaction Overview
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={transactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="400px">
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PaymentIcon color="primary" />
                    <Typography>Recharges</Typography>
                  </Box>
                  <Chip label={stats.rechargeCount} color="primary" variant="outlined" />
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TransactionIcon color="secondary" />
                    <Typography>Transactions</Typography>
                  </Box>
                  <Chip label={stats.txnCount} color="secondary" variant="outlined" />
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon color="success" />
                    <Typography>Growth Rate</Typography>
                  </Box>
                  <Chip label="+12.5%" color="success" variant="outlined" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
} 