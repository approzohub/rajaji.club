/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import './CommissionPage.css';
import { 
  Settings, 
  History, 
} from '@mui/icons-material';
import { useAuth } from '../auth';
import { 
  useGetCommissionSettingsQuery, 
  useUpdateCommissionSettingsMutation, 
  useGetCommissionHistoryQuery,
  useGetCardPriceHistoryQuery,
} from '../api/commissionApi';
import { useGetCardsQuery } from '../api/gamesApi';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`commission-tabpanel-${index}`}
      aria-labelledby={`commission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const commissionSchema = z.object({
  adminCommissionPercentage: z.number().min(0).max(100),
  agentCommissionPercentage: z.number().min(0).max(100),
  winnerPayoutPercentage: z.number().min(0).max(100),
  minBetAmount: z.number().min(1),
  maxBetAmount: z.number().min(1),
  minUserRechargeAmount: z.number().min(1),
  minAgentRechargeAmount: z.number().min(1),
}).refine((data) => {
  const total = data.adminCommissionPercentage + data.agentCommissionPercentage + data.winnerPayoutPercentage;
  return total <= 100;
}, {
  message: "Total percentages cannot exceed 100%",
  path: ["adminCommissionPercentage"]
});

type CommissionForm = z.infer<typeof commissionSchema>;

export default function CommissionPage() {
  const { user: currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { data: settings, isLoading, error } = useGetCommissionSettingsQuery();
  const { data: history = [] } = useGetCommissionHistoryQuery();
  const { data: cards = [] } = useGetCardsQuery();
  const { data: cardPriceHistory = [] } = useGetCardPriceHistoryQuery(selectedCard, {
    skip: !selectedCard
  });
  
  const [updateSettings] = useUpdateCommissionSettingsMutation();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CommissionForm>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      adminCommissionPercentage: settings?.adminCommissionPercentage || 10,
      agentCommissionPercentage: settings?.agentCommissionPercentage || 5,
      winnerPayoutPercentage: settings?.winnerPayoutPercentage || 85,
      minBetAmount: settings?.minBetAmount || 10,
      maxBetAmount: settings?.maxBetAmount || 10000,
      minUserRechargeAmount: settings?.minUserRechargeAmount || 500,
      minAgentRechargeAmount: settings?.minAgentRechargeAmount || 1000,
    }
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      setValue('adminCommissionPercentage', settings.adminCommissionPercentage);
      setValue('agentCommissionPercentage', settings.agentCommissionPercentage);
      setValue('winnerPayoutPercentage', settings.winnerPayoutPercentage);
      setValue('minBetAmount', settings.minBetAmount);
      setValue('maxBetAmount', settings.maxBetAmount);
      setValue('minUserRechargeAmount', settings.minUserRechargeAmount);
      setValue('minAgentRechargeAmount', settings.minAgentRechargeAmount);
    }
  }, [settings, setValue]);

  const watchedValues = watch();
  const totalPercentage = Number(watchedValues.adminCommissionPercentage || 0) + 
                         Number(watchedValues.agentCommissionPercentage || 0) + 
                         Number(watchedValues.winnerPayoutPercentage || 0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenHistory = (cardName: string) => {
    setSelectedCard(cardName);
    setOpenHistoryDialog(true);
  };

  const onSubmit = async (data: CommissionForm) => {
    try {
      await updateSettings(data).unwrap();
      setSuccessMessage('Commission settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Handle error silently
    }
  };

  const getSuitColor = (suit: string) => {
    switch (suit) {
      case 'hearts':
      case 'diamonds':
        return '#d32f2f';
      case 'clubs':
      case 'spades':
        return '#000000';
      default:
        return '#666666';
    }
  };

  // Only admin can access this page
  if (currentUser?.role !== 'admin') {
    return (
      <Box>
        <Alert severity="error">Access denied. Only admin users can manage commission settings.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load commission settings. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box className="commission-page" sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          💰 Commission & Pricing Management
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Commission Settings" />
          <Tab label="Card Pricing" />
          <Tab label="Price History" />
        </Tabs>
      </Box>

      {/* Commission Settings Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Commission Structure
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Configure the commission percentages for admin, agents, and winner payouts.
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="Admin Commission (%)"
                  type="number"
                  {...register('adminCommissionPercentage', { valueAsNumber: true })}
                  error={!!errors.adminCommissionPercentage}
                  helperText={errors.adminCommissionPercentage?.message}
                  InputProps={{
                    startAdornment: <span style={{ color: 'rgba(255, 255, 255, 0.7)', marginRight: '8px' }}>%</span>,
                  }}
                  sx={{
                    '& .MuiFormHelperText-root.Mui-error': {
                      color: '#f44336',
                      fontWeight: 500
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Agent Commission (%)"
                  type="number"
                  {...register('agentCommissionPercentage', { valueAsNumber: true })}
                  error={!!errors.agentCommissionPercentage}
                  helperText={errors.agentCommissionPercentage?.message}
                  InputProps={{
                    startAdornment: <span style={{ color: 'rgba(255, 255, 255, 0.7)', marginRight: '8px' }}>%</span>,
                  }}
                  sx={{
                    '& .MuiFormHelperText-root.Mui-error': {
                      color: '#f44336',
                      fontWeight: 500
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Winner Payout (%)"
                  type="number"
                  {...register('winnerPayoutPercentage', { valueAsNumber: true })}
                  error={!!errors.winnerPayoutPercentage}
                  helperText={errors.winnerPayoutPercentage?.message}
                  InputProps={{
                    startAdornment: <span style={{ color: 'rgba(255, 255, 255, 0.7)', marginRight: '8px' }}>%</span>,
                  }}
                  sx={{
                    '& .MuiFormHelperText-root.Mui-error': {
                      color: '#f44336',
                      fontWeight: 500
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Minimum Bet Amount (₹)"
                  type="number"
                  {...register('minBetAmount', { valueAsNumber: true })}
                  error={!!errors.minBetAmount}
                  helperText={errors.minBetAmount?.message}
                />
                <TextField
                  fullWidth
                  label="Maximum Bet Amount (₹)"
                  type="number"
                  {...register('maxBetAmount', { valueAsNumber: true })}
                  error={!!errors.maxBetAmount}
                  helperText={errors.maxBetAmount?.message}
                />
                <TextField
                  fullWidth
                  label="Minimum User Recharge (₹)"
                  type="number"
                  {...register('minUserRechargeAmount', { valueAsNumber: true })}
                  error={!!errors.minUserRechargeAmount}
                  helperText={errors.minUserRechargeAmount?.message}
                />
                <TextField
                  fullWidth
                  label="Minimum Agent Recharge (₹)"
                  type="number"
                  {...register('minAgentRechargeAmount', { valueAsNumber: true })}
                  error={!!errors.minAgentRechargeAmount}
                  helperText={errors.minAgentRechargeAmount?.message}
                />
              </Box>

              <Box sx={{ mt: 3, p: 2, borderRadius: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  className={totalPercentage !== 100 ? 'total-percentage-error' : ''}
                >
                  Total Percentage: {totalPercentage}%
                </Typography>
                {totalPercentage > 100 && (
                  <Typography 
                    variant="body2" 
                    color="error" 
                    sx={{ mt: 1 }}
                    className="validation-error"
                  >
                    Total percentages cannot exceed 100%
                  </Typography>
                )}
                {totalPercentage < 100 && (
                  <Typography 
                    variant="body2" 
                    color="error" 
                    sx={{ mt: 1 }}
                    className="validation-error"
                  >
                    Total percentages must equal exactly 100%
                  </Typography>
                )}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  startIcon={<Settings />}
                  disabled={totalPercentage !== 100}
                >
                  Update Commission Settings
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Commission History */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Commission History
              </Typography>
              <Button
                startIcon={<History />}
                onClick={() => setOpenHistoryDialog(true)}
              >
                View Full History
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Admin (%)</TableCell>
                    <TableCell>Agent (%)</TableCell>
                    <TableCell>Winner (%)</TableCell>
                    <TableCell>Min Bet</TableCell>
                    <TableCell>Max Bet</TableCell>
                    <TableCell>Updated By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.slice(0, 5).map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>{new Date(record.updatedAt).toLocaleString()}</TableCell>
                      <TableCell>{record.adminCommissionPercentage}%</TableCell>
                      <TableCell>{record.agentCommissionPercentage}%</TableCell>
                      <TableCell>{record.winnerPayoutPercentage}%</TableCell>
                      <TableCell>₹{record.minBetAmount}</TableCell>
                      <TableCell>₹{record.maxBetAmount}</TableCell>
                      <TableCell>
                        {typeof record.updatedBy === 'object' && record.updatedBy !== null
                          ? (record.updatedBy as any).fullName || (record.updatedBy as any).email || 'Unknown'
                          : record.updatedBy || 'Unknown'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Card Pricing Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {cards.map((card) => (
            <Box key={card._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="h5" sx={{ color: getSuitColor(card.suit) }}>
                      {card.symbol}
                    </Typography>
                    <Typography variant="h6">
                      {card.name.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    ₹{card.currentPrice}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={card.isActive ? 'Active' : 'Inactive'} 
                      color={card.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip 
                      label={`${card.totalBids} bids`} 
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenHistory(card.name)}
                      title="View Price History"
                    >
                      <History />
                    </IconButton>
                    <Typography variant="body2" color="textSecondary">
                      Last updated: {new Date(card.lastPriceUpdate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </TabPanel>

      {/* Price History Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Card Price History
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select a card to view its price history.
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {cards.map((card) => (
            <Box key={card._id}>
              <Button
                variant={selectedCard === card.name ? 'contained' : 'outlined'}
                onClick={() => setSelectedCard(card.name)}
                startIcon={
                  <Typography variant="h6" sx={{ color: getSuitColor(card.suit) }}>
                    {card.symbol}
                  </Typography>
                }
              >
                {card.name.replace(/_/g, ' ')}
              </Button>
            </Box>
          ))}
        </Box>

        {selectedCard && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price History - {selectedCard.replace(/_/g, ' ').toUpperCase()}
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Old Price</TableCell>
                      <TableCell>New Price</TableCell>
                      <TableCell>Change</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Changed By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cardPriceHistory.map((history) => (
                      <TableRow key={history._id}>
                        <TableCell>{new Date(history.effectiveFrom).toLocaleString()}</TableCell>
                        <TableCell>₹{history.oldPrice}</TableCell>
                        <TableCell>₹{history.newPrice}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${history.newPrice > history.oldPrice ? '+' : ''}${history.newPrice - history.oldPrice}`}
                            size="small"
                            color={history.newPrice > history.oldPrice ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{history.reason || '-'}</TableCell>
                        <TableCell>
                          {typeof history.changedBy === 'object' && history.changedBy !== null
                            ? (history.changedBy as any)?.fullName || (history.changedBy as any)?.email || 'Unknown'
                            : history.changedBy || 'Unknown'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Commission History Dialog */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Commission History</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Admin (%)</TableCell>
                  <TableCell>Agent (%)</TableCell>
                  <TableCell>Winner (%)</TableCell>
                  <TableCell>Min Bet</TableCell>
                  <TableCell>Max Bet</TableCell>
                  <TableCell>Updated By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>{new Date(record.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>{record.adminCommissionPercentage}%</TableCell>
                    <TableCell>{record.agentCommissionPercentage}%</TableCell>
                    <TableCell>{record.winnerPayoutPercentage}%</TableCell>
                    <TableCell>₹{record.minBetAmount}</TableCell>
                    <TableCell>₹{record.maxBetAmount}</TableCell>
                    <TableCell>
                      {typeof record.updatedBy === 'object' && record.updatedBy !== null
                        ? (record.updatedBy as any)?.fullName || (record.updatedBy as any)?.email || 'Unknown'
                        : record.updatedBy || 'Unknown'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 