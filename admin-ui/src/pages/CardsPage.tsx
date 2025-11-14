import React, { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Card as MuiCard,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Edit,
  Casino,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useGetCardsQuery, useGetCardsByTypeQuery, useGetCardsBySuitQuery, useToggleCardActiveStatusMutation, useUpdateCardDisplayOrderMutation } from '../api/gamesApi';
import { useUpdateCardPriceMutation, useBulkUpdateCardPricesMutation, useGetCardPriceHistoryQuery, useInitializeCardsMutation } from '../api/commissionApi';
import type { Card } from '../api/gamesApi';
import { api } from '../api';

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
      id={`cards-tabpanel-${index}`}
      aria-labelledby={`cards-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3, px: 0 }}>{children}</Box>}
    </div>
  );
}

export default function CardsPage() {
  // const { user: _currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<string>('all');
  const [selectedSuit, setSelectedSuit] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, boolean>>({});
  
  // Dialogs
  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [openBulkPriceDialog, setOpenBulkPriceDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [openAnalyticsDialog, setOpenAnalyticsDialog] = useState(false);
  const [openDisplayOrderDialog, setOpenDisplayOrderDialog] = useState(false);
  const [openUnifiedActionsDialog, setOpenUnifiedActionsDialog] = useState(false);
  const [unifiedActionsTab, setUnifiedActionsTab] = useState(0);
  
  // Form states
  const [priceForm, setPriceForm] = useState({
    newPrice: 0,
    reason: '',
  });
  
  const [bulkPriceForm, setBulkPriceForm] = useState({
    updates: [] as Array<{ cardName: string; newPrice: number }>,
    reason: '',
  });
  
  const [displayOrderForm, setDisplayOrderForm] = useState({
    newOrder: 0,
  });

  // API queries
  const { data: allCards = [], isLoading: isLoadingCards, refetch: refetchCards } = useGetCardsQuery();
  const { data: typeCards = [], refetch: refetchTypeCards } = useGetCardsByTypeQuery(selectedCardType, { skip: selectedCardType === 'all' });
  const { data: suitCards = [], refetch: refetchSuitCards } = useGetCardsBySuitQuery(selectedSuit, { skip: selectedSuit === 'all' });
  const { data: priceHistory = [], isLoading: isLoadingHistory } = useGetCardPriceHistoryQuery(
    selectedCard?.name || '', 
    { skip: !selectedCard }
  );
  
  // API mutations
  const [updateCardPrice, { isLoading: isUpdatingPrice }] = useUpdateCardPriceMutation();
  const [bulkUpdatePrices, { isLoading: isUpdatingBulk }] = useBulkUpdateCardPricesMutation();
  const [initializeCards, { isLoading: isInitializing }] = useInitializeCardsMutation();
  const [toggleCardActiveStatus, { isLoading: isTogglingStatus }] = useToggleCardActiveStatusMutation();
  const [updateCardDisplayOrder, { isLoading: isUpdatingDisplayOrder }] = useUpdateCardDisplayOrderMutation();
  // const [bulkUpdateDisplayOrders, { isLoading: isUpdatingBulkDisplayOrder }] = useBulkUpdateDisplayOrdersMutation();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDisplayOrderDialog = (card: Card) => {
    setSelectedCard(card);
    setDisplayOrderForm({
      newOrder: card.displayOrder,
    });
    setOpenDisplayOrderDialog(true);
  };

  const handleOpenUnifiedActionsDialog = (card: Card) => {
    setSelectedCard(card);
    setPriceForm({
      newPrice: card.currentPrice,
      reason: '',
    });
    setDisplayOrderForm({
      newOrder: card.displayOrder,
    });
    setUnifiedActionsTab(0);
    setOpenUnifiedActionsDialog(true);
  };

  const handleUpdatePrice = async () => {
    if (!selectedCard) return;
    
    try {
      await updateCardPrice({
        cardName: selectedCard.name,
        newPrice: priceForm.newPrice,
        reason: priceForm.reason,
      }).unwrap();
      
      setOpenPriceDialog(false);
      setSelectedCard(null);
      setPriceForm({ newPrice: 0, reason: '' });
      
      // Refetch the cards data to show updated prices
      await refetchCards();
      if (selectedCardType !== 'all') {
        await refetchTypeCards();
      }
      if (selectedSuit !== 'all') {
        await refetchSuitCards();
      }
      
      // Success - table will automatically refresh with new data
    } catch {
      // Silent error handling
    }
  };

  const handleBulkUpdatePrices = async () => {
    try {
      await bulkUpdatePrices({
        updates: bulkPriceForm.updates,
        reason: bulkPriceForm.reason,
      }).unwrap();
      setOpenBulkPriceDialog(false);
      setBulkPriceForm({ updates: [], reason: '' });
      
      // Refetch the cards data to show updated prices
      await refetchCards();
      if (selectedCardType !== 'all') {
        await refetchTypeCards();
      }
      if (selectedSuit !== 'all') {
        await refetchSuitCards();
      }
      
      // Success - table will automatically refresh with new data
    } catch {
      // Silent error handling
    }
  };

  const handleInitializeCards = async () => {
    try {
      await initializeCards().unwrap();
    } catch {
      console.error('Error initializing cards');
    }
  };

  const handleUpdateDisplayOrder = async () => {
    if (!selectedCard) return;
    
    try {
      await updateCardDisplayOrder({
        cardName: selectedCard.name,
        newOrder: displayOrderForm.newOrder,
      }).unwrap();
      
      setOpenDisplayOrderDialog(false);
      setSelectedCard(null);
      setDisplayOrderForm({ newOrder: 0 });
      
      // Refetch the cards data to show updated order
      await refetchCards();
      if (selectedCardType !== 'all') {
        await refetchTypeCards();
      }
      if (selectedSuit !== 'all') {
        await refetchSuitCards();
      }
      
      // Success - table will automatically refresh with new data
    } catch {
      // Silent error handling
    }
  };

  const handleToggleCardStatus = async (cardId: string) => {
    try {
      console.log('Toggling card status for:', cardId);
      
      // Find the current card to get its current status
      const currentCard = allCards.find(card => card._id === cardId);
      if (!currentCard) {
        console.error('Card not found:', cardId);
        return;
      }
      
      console.log('Current card status:', currentCard.isActive);
      console.log('Current card data:', currentCard);
      
      // Optimistically update the UI
      const newStatus = !currentCard.isActive;
      console.log('Setting optimistic update to:', newStatus);
      
      setOptimisticUpdates(prev => ({
        ...prev,
        [cardId]: newStatus
      }));
      
      const result = await toggleCardActiveStatus(cardId).unwrap();
      console.log('Toggle result:', result);
      console.log('Updated card data:', result.card);
      console.log('New isActive status:', result.card.isActive);
      
      // Clear optimistic update after successful API call
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[cardId];
        return newUpdates;
      });
      
      // Force re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log(`Card ${result.card.isActive ? 'activated' : 'deactivated'} successfully`);
      
    } catch (error) {
      console.error('Error toggling card status:', error);
      // Show error to user
      alert('Failed to toggle card status. Please try again.');
    }
  };

  const getDisplayCards = () => {
    if (tabValue === 0) return allCards;
    if (tabValue === 1) return selectedCardType === 'all' ? allCards : typeCards;
    if (tabValue === 2) return selectedSuit === 'all' ? allCards : suitCards;
    return allCards;
  };

  const cardColumns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Card Name',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={params.row.symbol}
            size="small"
            sx={{
              backgroundColor: getSuitColor(params.row.suit) === '#d32f2f' ? '#ffebee' : '#f5f5f5',
              color: getSuitColor(params.row.suit),
              fontWeight: 'bold',
              fontSize: '1.1rem',
              minWidth: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <Typography>
            {params.row.name.replace(/_/g, ' ').toUpperCase()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'card',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.row.card} 
          size="small"
          color={getCardTypeColor(params.row.card)}
          variant="outlined"
        />
      ),
    },

    {
      field: 'currentPrice',
      headerName: 'Current Price',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          ₹{params.row.currentPrice}
        </Typography>
      ),
    },
    {
      field: 'totalBids',
      headerName: 'Total Bids',
      width: 120,
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          ₹{params.row.totalAmount.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'displayOrder',
      headerName: 'Display Order',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.row.displayOrder}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleOpenDisplayOrderDialog(params.row)}
            title="Change Display Order"
          >
            <Edit />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const isActive = optimisticUpdates[params.row._id] !== undefined 
          ? optimisticUpdates[params.row._id] 
          : params.row.isActive;
        
        return (
          <Chip 
            label={isActive ? 'Active' : 'Inactive'} 
            size="small"
            color={isActive ? 'success' : 'default'}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          variant="outlined"
            size="small"
          onClick={() => handleOpenUnifiedActionsDialog(params.row)}
        >
          Actions
        </Button>
      ),
    },
  ];

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

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'A':
        return 'error';
      case 'K':
        return 'warning';
      case 'Q':
        return 'info';
      case 'J':
        return 'success';
      case '10':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isLoadingCards) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }



  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🃏 Card Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Casino />}
            onClick={handleInitializeCards}
            disabled={isInitializing}
          >
            {isInitializing ? 'Initializing...' : 'Initialize Cards'}
          </Button>
          <Button
            variant="contained"
            onClick={() => setOpenBulkPriceDialog(true)}
          >
            Bulk Price Update
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={async () => {
              try {
                const response = await api.post('/games/cards/reset-active');
                const result = response.data;
                console.log('Reset result:', result);
                await refetchCards();
                alert('All cards reset to active!');
              } catch (error) {
                console.error('Reset failed:', error);
                alert('Reset failed!');
              }
            }}
          >
            Reset All to Active
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <MuiCard>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Cards
            </Typography>
            <Typography variant="h4">
              {allCards.length}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Cards
            </Typography>
            <Typography variant="h4">
              {allCards.filter(card => card.isActive).length}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Bids
            </Typography>
            <Typography variant="h4">
              {allCards.reduce((sum, card) => sum + card.totalBids, 0)}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Amount
            </Typography>
            <Typography variant="h4">
              ₹{allCards.reduce((sum, card) => sum + card.totalAmount, 0).toLocaleString()}
            </Typography>
          </CardContent>
        </MuiCard>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Cards" />
          <Tab label="By Type" />
          <Tab label="By Suit" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DataGrid
          rows={getDisplayCards()}
          columns={cardColumns}
          getRowId={(row) => row._id}
          key={`cards-grid-all-${refreshKey}-${allCards.length}-${allCards.filter(c => c.isActive).length}`}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{ minHeight: 400 }}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Card Type</InputLabel>
            <Select
              value={selectedCardType}
              label="Card Type"
              onChange={(e) => setSelectedCardType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="J">Jack (J)</MenuItem>
              <MenuItem value="Q">Queen (Q)</MenuItem>
              <MenuItem value="K">King (K)</MenuItem>
              <MenuItem value="A">Ace (A)</MenuItem>
              <MenuItem value="10">Ten (10)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <DataGrid
          rows={getDisplayCards()}
          columns={cardColumns}
          getRowId={(row) => row._id}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{ minHeight: 400 }}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Card Suit</InputLabel>
            <Select
              value={selectedSuit}
              label="Card Suit"
              onChange={(e) => setSelectedSuit(e.target.value)}
            >
              <MenuItem value="all">All Suits</MenuItem>
              <MenuItem value="clubs">Clubs (♣)</MenuItem>
              <MenuItem value="spades">Spades (♠)</MenuItem>
              <MenuItem value="hearts">Hearts (♥)</MenuItem>
              <MenuItem value="diamonds">Diamonds (♦)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <DataGrid
          rows={getDisplayCards()}
          columns={cardColumns}
          getRowId={(row) => row._id}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{ minHeight: 400 }}
        />
      </TabPanel>

      {/* Price Update Dialog */}
      <Dialog open={openPriceDialog} onClose={() => setOpenPriceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Card Price</DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: getSuitColor(selectedCard.suit) }}>
                {selectedCard.symbol} {selectedCard.name.replace(/_/g, ' ').toUpperCase()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Current Price: ₹{selectedCard.currentPrice}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="New Price"
            type="number"
            value={priceForm.newPrice}
            onChange={(e) => setPriceForm({ ...priceForm, newPrice: Number(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Reason (Optional)"
            value={priceForm.reason}
            onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPriceDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdatePrice} 
            variant="contained"
            disabled={isUpdatingPrice}
          >
            {isUpdatingPrice ? 'Updating...' : 'Update Price'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Price Update Dialog */}
      <Dialog open={openBulkPriceDialog} onClose={() => setOpenBulkPriceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Price Update</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Select cards and set new prices for multiple cards at once.
          </Typography>
          <TextField
            fullWidth
            label="Reason (Optional)"
            value={bulkPriceForm.reason}
            onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, reason: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Select Cards:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {allCards.map((card) => (
              <Box key={card._id}>
                <MuiCard variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" sx={{ color: getSuitColor(card.suit) }}>
                        {card.symbol}
                      </Typography>
                      <Typography variant="body2">
                        {card.name.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <TextField
                      size="small"
                      label="New Price"
                      type="number"
                      defaultValue={card.currentPrice}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        const existingIndex = bulkPriceForm.updates.findIndex(u => u.cardName === card.name);
                        if (existingIndex >= 0) {
                          const newUpdates = [...bulkPriceForm.updates];
                          newUpdates[existingIndex].newPrice = newPrice;
                          setBulkPriceForm({ ...bulkPriceForm, updates: newUpdates });
                        } else {
                          setBulkPriceForm({
                            ...bulkPriceForm,
                            updates: [...bulkPriceForm.updates, { cardName: card.name, newPrice }]
                          });
                        }
                      }}
                    />
                  </CardContent>
                </MuiCard>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkPriceDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkUpdatePrices} 
            variant="contained"
            disabled={isUpdatingBulk || bulkPriceForm.updates.length === 0}
          >
            {isUpdatingBulk ? 'Updating...' : `Update ${bulkPriceForm.updates.length} Cards`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Price History - {selectedCard?.name.replace(/_/g, ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {isLoadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
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
                  {priceHistory.map((history) => (
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
                        {typeof history.changedBy === 'string' 
                          ? history.changedBy 
                          : (history.changedBy as { fullName?: string; email?: string })?.fullName || (history.changedBy as { fullName?: string; email?: string })?.email || 'Unknown'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={openAnalyticsDialog} onClose={() => setOpenAnalyticsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Card Analytics - {selectedCard?.name.replace(/_/g, ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Bids
                  </Typography>
                  <Typography variant="h4">
                    {selectedCard.totalBids}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h4">
                    ₹{selectedCard.totalAmount.toLocaleString()}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Current Price
                  </Typography>
                  <Typography variant="h4">
                    ₹{selectedCard.currentPrice}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={selectedCard.isActive ? 'Active' : 'Inactive'}
                    color={selectedCard.isActive ? 'success' : 'default'}
                    size="medium"
                  />
                </CardContent>
              </MuiCard>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnalyticsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Display Order Dialog */}
      <Dialog open={openDisplayOrderDialog} onClose={() => setOpenDisplayOrderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Update Display Order - {selectedCard?.name.replace(/_/g, ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Display Order"
              type="number"
              value={displayOrderForm.newOrder}
              onChange={(e) => setDisplayOrderForm({ newOrder: parseInt(e.target.value) || 0 })}
              fullWidth
              helperText="Lower numbers appear first on the game page"
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDisplayOrderDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateDisplayOrder} 
            variant="contained"
            disabled={isUpdatingDisplayOrder}
          >
            {isUpdatingDisplayOrder ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unified Actions Dialog */}
      <Dialog open={openUnifiedActionsDialog} onClose={() => setOpenUnifiedActionsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Card Actions - {selectedCard?.symbol} {selectedCard?.name.replace(/_/g, ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={unifiedActionsTab} onChange={(_, newValue) => setUnifiedActionsTab(newValue)}>
              <Tab label="Edit" />
              <Tab label="History" />
              <Tab label="Analytics" />
              <Tab label="Enable/Disable" />
            </Tabs>
          </Box>

          {/* Edit Tab */}
          {unifiedActionsTab === 0 && selectedCard && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Current Price: ₹{selectedCard.currentPrice}
                </Typography>
              </Box>
              <TextField
                fullWidth
                label="New Price"
                type="number"
                value={priceForm.newPrice}
                onChange={(e) => setPriceForm({ ...priceForm, newPrice: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Reason (Optional)"
                value={priceForm.reason}
                onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
              <Divider sx={{ my: 2 }} />
              <TextField
                label="Display Order"
                type="number"
                value={displayOrderForm.newOrder}
                onChange={(e) => setDisplayOrderForm({ newOrder: parseInt(e.target.value) || 0 })}
                fullWidth
                helperText="Lower numbers appear first on the game page"
                inputProps={{ min: 0 }}
              />
            </Box>
          )}

          {/* History Tab */}
          {unifiedActionsTab === 1 && (
            <Box>
              {isLoadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
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
                      {priceHistory.map((history) => (
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
                            {typeof history.changedBy === 'string' 
                              ? history.changedBy 
                              : (history.changedBy as { fullName?: string; email?: string })?.fullName || (history.changedBy as { fullName?: string; email?: string })?.email || 'Unknown'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Analytics Tab */}
          {unifiedActionsTab === 2 && selectedCard && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Bids
                  </Typography>
                  <Typography variant="h4">
                    {selectedCard.totalBids}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h4">
                    ₹{selectedCard.totalAmount.toLocaleString()}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Current Price
                  </Typography>
                  <Typography variant="h4">
                    ₹{selectedCard.currentPrice}
                  </Typography>
                </CardContent>
              </MuiCard>
              <MuiCard>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={selectedCard.isActive ? 'Active' : 'Inactive'}
                    color={selectedCard.isActive ? 'success' : 'default'}
                    size="medium"
                  />
                </CardContent>
              </MuiCard>
            </Box>
          )}

          {/* Enable/Disable Tab */}
          {unifiedActionsTab === 3 && selectedCard && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Card Status
                </Typography>
                <Chip
                  label={optimisticUpdates[selectedCard._id] !== undefined 
                    ? (optimisticUpdates[selectedCard._id] ? 'Active' : 'Inactive')
                    : (selectedCard.isActive ? 'Active' : 'Inactive')
                  }
                  color={optimisticUpdates[selectedCard._id] !== undefined 
                    ? (optimisticUpdates[selectedCard._id] ? 'success' : 'default')
                    : (selectedCard.isActive ? 'success' : 'default')
                  }
                  size="medium"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {optimisticUpdates[selectedCard._id] !== undefined 
                    ? (optimisticUpdates[selectedCard._id] ? 'This card is currently active.' : 'This card is currently inactive.')
                    : (selectedCard.isActive ? 'This card is currently active.' : 'This card is currently inactive.')
                  }
                </Typography>
              </Box>
              <Button
                variant="contained"
                color={optimisticUpdates[selectedCard._id] !== undefined 
                  ? (optimisticUpdates[selectedCard._id] ? 'error' : 'success')
                  : (selectedCard.isActive ? 'error' : 'success')
                }
                fullWidth
                onClick={() => {
                  handleToggleCardStatus(selectedCard._id);
                }}
                disabled={isTogglingStatus}
                startIcon={isTogglingStatus ? <CircularProgress size={20} /> : (optimisticUpdates[selectedCard._id] !== undefined ? optimisticUpdates[selectedCard._id] : selectedCard.isActive) ? <ToggleOff /> : <ToggleOn />}
              >
                {isTogglingStatus 
                  ? 'Updating...' 
                  : (optimisticUpdates[selectedCard._id] !== undefined ? optimisticUpdates[selectedCard._id] : selectedCard.isActive) 
                    ? 'Deactivate Card' 
                    : 'Activate Card'
                }
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUnifiedActionsDialog(false)}>Close</Button>
          {unifiedActionsTab === 0 && (
            <>
              <Button 
                onClick={async () => {
                  await handleUpdatePrice();
                  setOpenUnifiedActionsDialog(false);
                }} 
                variant="contained"
                disabled={isUpdatingPrice}
              >
                {isUpdatingPrice ? 'Updating...' : 'Update Price'}
              </Button>
              <Button 
                onClick={async () => {
                  await handleUpdateDisplayOrder();
                  setOpenUnifiedActionsDialog(false);
                }} 
                variant="outlined"
                disabled={isUpdatingDisplayOrder}
              >
                {isUpdatingDisplayOrder ? 'Updating...' : 'Update Order'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
} 