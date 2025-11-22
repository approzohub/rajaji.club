import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton,
  Chip,
  Card as MuiCard,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Popover,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { 
  EmojiEvents, 
  TrendingUp, 
  Visibility, 
  ContentCopy, 
  Close,
  ViewColumn,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { 
  useGetGamesQuery, 
  useGetCardsQuery,
  useDeclareWinnerMutation,
  useGetGameWinnersQuery
} from '../api/gamesApi';
import { useGetGameCardAnalyticsQuery, useGetGameBidsQuery } from '../api/bidsApi';
import type { Game } from '../api/gamesApi';
import { useState, useEffect } from 'react';
import { formatCardName, getSuitColor } from '../utils/cardUtils';
import { WinnersModal } from '../components/WinnersModal';

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
      id={`games-tabpanel-${index}`}
      aria-labelledby={`games-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: { xs: 1, sm: 2, md: 3 }, px: 0 }}>{children}</Box>}
    </div>
  );
}

export default function GamesPage() {
  const [tabValue, setTabValue] = useState(0);
  const [paginationModel, setPaginationModel] = useState<{ page: number; pageSize: number }>({
    page: 0,
    pageSize: 100,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term by 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const currentStatus =
    tabValue === 1 ? 'open' :
    tabValue === 2 ? 'waiting_result' :
    tabValue === 3 ? 'result_declared' :
    undefined;

  const { data, isLoading, error } = useGetGamesQuery({
    status: currentStatus,
    page: paginationModel.page + 1, // API is 1-based
    limit: paginationModel.pageSize,
    search: debouncedSearchTerm || undefined,
  });

  // Reset to first page when debounced search changes
  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [debouncedSearchTerm]);

  const games = data?.games ?? [];
  const counts = data?.counts;
  const { data: cards = [] } = useGetCardsQuery();
  
  const [declareWinner] = useDeclareWinnerMutation();
  
  const [openDeclareWinnerDialog, setOpenDeclareWinnerDialog] = useState(false);
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [openAnalyticsDialog, setOpenAnalyticsDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [isRandomResult, setIsRandomResult] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every second for real-time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const [winnerResult, setWinnerResult] = useState<{
    message: string;
    game?: Game;
    winners?: {
      count: number;
      payoutPerWinner: number;
      remainingAmount: number;
      winnerDetails: Array<{
        userId: string;
        userName: string;
        bidAmount: number;
        payoutAmount: number;
      }>;
    };
    winningCard?: string;
    gameEndTime?: string;
    gameId?: string;
  } | null>(null);
  const [openCardBiddingDialog, setOpenCardBiddingDialog] = useState(false);
  const [selectedCardForBidding, setSelectedCardForBidding] = useState<string>('');
  const [openCardBidDetailsDialog, setOpenCardBidDetailsDialog] = useState(false);
  const [openWinnersModal, setOpenWinnersModal] = useState(false);
  const [selectedGameForWinners, setSelectedGameForWinners] = useState<Game | null>(null);
  const [columnVisibilityAnchor, setColumnVisibilityAnchor] = useState<HTMLButtonElement | null>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    timeWindow: false,
    timeRemaining: false,
    status: true,
    totalPool: true,
    profit: true,
    winningCard: true,
    actions: true,
  });

  // Get analytics for selected game
  const { data: gameAnalytics = [] } = useGetGameCardAnalyticsQuery(selectedGame?._id || '', {
    skip: !selectedGame || !openAnalyticsDialog
  });

  // Get game bids for card bidding dialog
  const { data: gameBids = [] } = useGetGameBidsQuery(selectedGame?._id || '', {
    skip: !selectedGame || !openCardBiddingDialog
  });

  // Get winners for selected game
  const { data: winnersData, isLoading: isLoadingWinners, error: winnersError } = useGetGameWinnersQuery(
    selectedGameForWinners?._id || '', 
    {
      skip: !selectedGameForWinners || !openWinnersModal
    }
  );

  // Filter game bids for specific card
  const cardBids = gameBids.filter(bid => bid.cardName === selectedCardForBidding);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleOpenDeclareWinner = (game: Game) => {
    setSelectedGame(game);
    setSelectedCard('');
    setIsRandomResult(true);
    setOpenDeclareWinnerDialog(true);
  };

  const handleOpenAnalytics = (game: Game) => {
    setSelectedGame(game);
    setOpenAnalyticsDialog(true);
  };

  const handleOpenCardBidding = (game: Game) => {
    setSelectedGame(game);
    setOpenCardBiddingDialog(true);
  };

  const handleOpenCardBidDetails = (cardName: string) => {
    setSelectedCardForBidding(cardName);
    setOpenCardBidDetailsDialog(true);
  };

  const handleOpenWinners = (game: Game) => {
    setSelectedGameForWinners(game);
    setOpenWinnersModal(true);
  };

  const handleDeclareWinner = async () => {
    if (!selectedGame) return;
    
    try {
      const result = await declareWinner({
        gameId: selectedGame._id,
        winningCard: selectedCard,
        isRandom: isRandomResult
      }).unwrap();
      setWinnerResult(result);
      setOpenDeclareWinnerDialog(false);
      setOpenSuccessDialog(true);
      setSelectedGame(null);
    } catch (error) {
      console.error('Error declaring winner:', error);
    }
  };

  const handleDeclareCardWinner = async (cardName: string) => {
    if (!selectedGame) return;
    
    // Check if game is in waiting_result status
    if (selectedGame.status !== 'waiting_result') {
      alert('Can only declare winners for games in waiting_result status');
      return;
    }
    
    try {
      const result = await declareWinner({
        gameId: selectedGame._id,
        winningCard: cardName,
        isRandom: false
      }).unwrap();
      setWinnerResult(result);
      setOpenCardBiddingDialog(false);
      setOpenSuccessDialog(true);
      setSelectedGame(null);
    } catch (error: unknown) {
      console.error('Error declaring card winner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to declare winner';
      alert(`Error: ${errorMessage}`);
    }
  };

  const getGameStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'success';
      case 'waiting_result':
        return 'warning';
      case 'result_declared':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTimeRemaining = (game: Game) => {
    try {
      // Check if biddingEndTime exists and is valid
      if (!game.biddingEndTime) {
        return 'No End Time';
      }
      
      const endTime = new Date(game.biddingEndTime);
      
      // Check if the date is valid
      if (isNaN(endTime.getTime())) {
        return 'Invalid Date';
      }
      
      const diff = endTime.getTime() - currentTime.getTime();
      
      if (diff <= 0) {
        // Check game status to show appropriate message
        if (game.status === 'waiting_result') {
          return 'Waiting Result';
        } else if (game.status === 'result_declared') {
          return 'Result Declared';
        } else {
          return 'Bidding Closed';
        }
      }
      
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Check if minutes and seconds are valid numbers
      if (isNaN(minutes) || isNaN(seconds)) {
        return 'Invalid Time';
      }
      
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return 'Error';
    }
  };

  const gameColumns: GridColDef[] = [
    {
      field: '_id',
      headerName: 'Game ID',
      flex: 2.0,
      minWidth: 250,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row._id} placement="top">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  width: '100%',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word'
                }}
              >
                {params.row._id}
          </Typography>
          <IconButton
            size="small"
                onClick={(e) => {
                  e.stopPropagation();
              navigator.clipboard.writeText(params.row._id);
            }}
            title="Copy Game ID"
                sx={{ p: 0.5, flexShrink: 0 }}
          >
            <ContentCopy sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'timeWindow',
      headerName: 'Game Time',
      flex: 1.2,
      minWidth: 180,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.row.timeWindow).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'timeRemaining',
      headerName: 'Time Remaining',
      flex: 1.0,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const timeText = getTimeRemaining(params.row);
        const isWaiting = timeText === 'Waiting Result';
        const isDeclared = timeText === 'Result Declared';
        const isClosed = timeText === 'Bidding Closed';
        
        return (
          <Chip
            label={timeText}
            size="small"
            color={
              isWaiting ? 'secondary' :
              isDeclared ? 'info' :
              isClosed ? 'warning' : 'default'
            }
            variant="outlined"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: isWaiting ? 'rgba(156, 39, 176, 0.1)' : 'transparent'
            }}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1.0,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const getStatusIcon = (status: string) => {
          switch (status) {
            case 'open': return '🟢';
            case 'waiting_result': return '🟡';
            case 'result_declared': return '🔵';
            default: return '⚪';
          }
        };
        
        return (
          <Chip 
            label={`${getStatusIcon(params.row.status)} ${params.row.status.replace(/_/g, ' ').toUpperCase()}`}
            color={getGameStatusColor(params.row.status)}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        );
      },
    },
    {
      field: 'totalPool',
      headerName: 'Total Pool',
      flex: 0.8,
      minWidth: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          ₹{params.row.totalPool.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'profit',
      headerName: 'Profit',
      flex: 0.8,
      minWidth: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        // Calculate profit: Total Pool - Total Payout
        const totalPool = params.row.totalPool || 0;
        const totalPayout = params.row.totalPayout || 0;
        const profit = totalPool - totalPayout;
        
        // Show different text based on game status
        if (params.row.status === 'open' || params.row.status === 'waiting_result') {
          return (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.secondary',
                fontStyle: 'italic'
              }}
            >
              Pending
            </Typography>
          );
        }
        
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'bold',
              color: profit >= 0 ? 'success.main' : 'error.main'
            }}
          >
            ₹{profit.toLocaleString()}
          </Typography>
        );
      },
    },
    {
      field: 'winningCard',
      headerName: 'Winning Card',
      flex: 0.8,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        // Only show winning card for declared games
        if (params.row.status !== 'result_declared' || !params.row.winningCard) return '-';
        
        const winningCard = params.row.winningCard;
        
        // Check if winningCard is already formatted (contains suit symbol)
        const isFormatted = /[\u2660-\u2667]/.test(winningCard);
        
        if (isFormatted) {
          // Already formatted, display as-is
          return (
            <Typography variant="body2">
              {winningCard}
            </Typography>
          );
        }
        
        // Database format (e.g., "king_of_diamonds"), find card and format
        const card = cards.find(c => c.name === winningCard);
        if (card) {
          return (
            <Typography variant="body2">
              {formatCardName(card, 'display')}
            </Typography>
          );
        }
        
        // Fallback: display as-is (shouldn't happen, but just in case)
        return (
          <Typography variant="body2">
            {winningCard.replace(/_/g, ' ').toUpperCase()}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.2,
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <IconButton
            size="small"
            onClick={() => handleOpenCardBidding(params.row)}
            title="View Card Bids"
          >
            <Visibility />
          </IconButton>
          {params.row.status === 'waiting_result' && (
            <IconButton
              size="small"
              onClick={() => handleOpenDeclareWinner(params.row)}
              title="Declare Winner"
              sx={{ 
                color: 'warning.main',
                '&:hover': { 
                  backgroundColor: 'warning.light',
                  color: 'warning.contrastText'
                }
              }}
            >
              <EmojiEvents />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => handleOpenAnalytics(params.row)}
            title="View Analytics"
          >
            <TrendingUp />
          </IconButton>
          {params.row.status === 'result_declared' && (
            <IconButton
              size="small"
              onClick={() => handleOpenWinners(params.row)}
              title="See Winners"
              sx={{ 
                color: 'success.main',
                '&:hover': { 
                  backgroundColor: 'success.light',
                  color: 'success.contrastText'
                }
              }}
            >
              <EmojiEvents />
            </IconButton>
          )}

        </Box>
      ),
    },
  ];



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
        <Alert severity="error">Failed to load games. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          🎮 Game Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="🟢 Open" size="small" color="success" variant="outlined" />
          <Chip label="🟡 Waiting Result" size="small" color="warning" variant="outlined" />
          <Chip label="🔵 Result Declared" size="small" color="info" variant="outlined" />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 2, sm: 3 }, mb: 3, width: '100%', maxWidth: '100%' }}>
        <MuiCard sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Games
            </Typography>
            <Typography variant="h4">
              {counts?.totalGames ?? 0}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Open Games
            </Typography>
            <Typography variant="h4">
              {counts?.openGames ?? 0}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Waiting Result
            </Typography>
            <Typography variant="h4">
              {counts?.waitingResultGames ?? 0}
            </Typography>
          </CardContent>
        </MuiCard>
        <MuiCard sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Declared Games
            </Typography>
            <Typography variant="h4">
              {counts?.declaredGames ?? 0}
            </Typography>
          </CardContent>
        </MuiCard>
      </Box>

      {/* Tabs and Column Visibility */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Games" />
          <Tab label="Open Games" />
          <Tab label="Waiting Result" />
          <Tab label="Declared Games" />
        </Tabs>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewColumn />}
            onClick={(e) => setColumnVisibilityAnchor(e.currentTarget)}
            sx={{ mr: 2 }}
          >
            Columns
          </Button>
        </Box>
      </Box>

      {/* Column Visibility Popover */}
      <Popover
        open={Boolean(columnVisibilityAnchor)}
        anchorEl={columnVisibilityAnchor}
        onClose={() => setColumnVisibilityAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Show Columns
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.timeWindow}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, timeWindow: e.target.checked })}
                  size="small"
                />
              }
              label="Game Time"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.timeRemaining}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, timeRemaining: e.target.checked })}
                  size="small"
                />
              }
              label="Time Remaining"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.status}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, status: e.target.checked })}
                  size="small"
                />
              }
              label="Status"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.totalPool}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, totalPool: e.target.checked })}
                  size="small"
                />
              }
              label="Total Pool"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.profit}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, profit: e.target.checked })}
                  size="small"
                />
              }
              label="Profit"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.winningCard}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, winningCard: e.target.checked })}
                  size="small"
                />
              }
              label="Winning Card"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.actions}
                  onChange={(e) => setColumnVisibilityModel({ ...columnVisibilityModel, actions: e.target.checked })}
                  size="small"
                />
              }
              label="Actions"
            />
          </Box>
        </Box>
      </Popover>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <Tooltip 
            title="Search by: Game ID (full or partial) or Winning Card Name" 
            arrow
            placement="top"
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search by game ID or winning card..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 600 }}
            />
          </Tooltip>
          {searchTerm && searchTerm !== debouncedSearchTerm && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} />
              Searching...
            </Typography>
          )}
        </Box>
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', px: 0 }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={games}
          columns={gameColumns}
          getRowId={(row) => row._id}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel as GridColumnVisibilityModel)}
          paginationMode="server"
          rowCount={data?.pagination.totalResults ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => setPaginationModel(model)}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
              sx={{
                minHeight: 400,
                width: '100%',
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-main': {
                  overflowX: 'auto',
                },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                fontWeight: 'bold',
                borderBottom: '2px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
        />
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', px: 0 }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={games}
          columns={gameColumns}
          getRowId={(row) => row._id}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel as GridColumnVisibilityModel)}
          paginationMode="server"
          rowCount={data?.pagination.totalResults ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => setPaginationModel(model)}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
              sx={{
                minHeight: 400,
                width: '100%',
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-main': {
                  overflowX: 'auto',
                },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                fontWeight: 'bold',
                borderBottom: '2px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
        />
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', px: 0 }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={games}
          columns={gameColumns}
          getRowId={(row) => row._id}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel as GridColumnVisibilityModel)}
          paginationMode="server"
          rowCount={data?.pagination.totalResults ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => setPaginationModel(model)}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
              sx={{
                minHeight: 400,
                width: '100%',
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-main': {
                  overflowX: 'auto',
                },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                fontWeight: 'bold',
                borderBottom: '2px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
        />
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', px: 0 }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={games}
          columns={gameColumns}
          getRowId={(row) => row._id}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel as GridColumnVisibilityModel)}
          paginationMode="server"
          rowCount={data?.pagination.totalResults ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => setPaginationModel(model)}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
              sx={{
                minHeight: 400,
                width: '100%',
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-main': {
                  overflowX: 'auto',
                },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                fontWeight: 'bold',
                borderBottom: '2px solid rgba(224, 224, 224, 1)',
                padding: '12px 8px',
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
        />
          </Box>
        </Box>
      </TabPanel>

      {/* Declare Winner Dialog */}
      <Dialog open={openDeclareWinnerDialog} onClose={() => setOpenDeclareWinnerDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Declare Winner</DialogTitle>
        <DialogContent>
          {selectedGame && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Game Details
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Time Window: {new Date(selectedGame.timeWindow).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Pool: ₹{selectedGame.totalPool.toLocaleString()}
              </Typography>
            </Box>
          )}
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Result Type</InputLabel>
            <Select
              value={isRandomResult ? 'random' : 'manual'}
              label="Result Type"
              onChange={(e) => setIsRandomResult(e.target.value === 'random')}
            >
              <MenuItem value="manual">Manual Selection</MenuItem>
            </Select>
          </FormControl>

          {!isRandomResult && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Winning Card</InputLabel>
              <Select
                value={selectedCard}
                label="Select Winning Card"
                onChange={(e) => setSelectedCard(e.target.value)}
              >
                {cards.filter(card => card.isActive).map((card) => (
                  <MenuItem key={card._id} value={card.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ color: getSuitColor(card.suit) }}>
                        {card.symbol}
                      </Typography>
                      <Typography>
                        {card.name.replace(/_/g, ' ').toUpperCase()} - ₹{card.currentPrice}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeclareWinnerDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeclareWinner} 
            variant="contained"
            disabled={!isRandomResult && !selectedCard}
          >
            Declare Winner
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={openSuccessDialog} onClose={() => setOpenSuccessDialog(false)}>
        <DialogTitle>Winner Declared Successfully!</DialogTitle>
        <DialogContent>
          {winnerResult && (
            <Box>
              {winnerResult.winners ? (
                // Show winner details for immediate declarations
                <>
                  <Typography variant="h6" gutterBottom>
                    Results
                  </Typography>
                  <Typography variant="body2">
                    Winners: {winnerResult.winners.count}
                  </Typography>
                  <Typography variant="body2">
                    Payout per Winner: ₹{winnerResult.winners.payoutPerWinner.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Remaining Amount: ₹{winnerResult.winners.remainingAmount.toLocaleString()}
                  </Typography>
                  
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Winner Details
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Bid Amount</TableCell>
                          <TableCell>Payout</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {winnerResult.winners.winnerDetails.map((winner, index) => (
                          <TableRow key={index}>
                            <TableCell>{winner.userName}</TableCell>
                            <TableCell>₹{winner.bidAmount.toLocaleString()}</TableCell>
                            <TableCell>₹{winner.payoutAmount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                // Show preset message for manual declarations
                <>
                  <Typography variant="h6" gutterBottom>
                    Winner Preset Successfully
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {winnerResult.message}
                  </Typography>
                  {winnerResult.winningCard && (
                    <Typography variant="body2">
                      Winning Card: {winnerResult.winningCard}
                    </Typography>
                  )}
                  {winnerResult.gameEndTime && (
                    <Typography variant="body2">
                      Result will be declared at: {new Date(winnerResult.gameEndTime).toLocaleString()}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSuccessDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog 
        open={openAnalyticsDialog} 
        onClose={() => setOpenAnalyticsDialog(false)} 
        maxWidth={false}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: '95vw',
            maxWidth: '1600px',
            height: '90vh',
            maxHeight: '900px',
            margin: '20px'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Game Analytics - {selectedGame?.timeWindow && new Date(selectedGame.timeWindow).toLocaleString()}
            </Typography>
            <IconButton
              onClick={() => setOpenAnalyticsDialog(false)}
              sx={{ color: 'grey.500' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TableContainer component={Paper} sx={{ height: '100%' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: '250px' }}>Card</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '120px' }} align="right">Total Bids</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '140px' }} align="right">Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '140px' }} align="right">Unique Bidders</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '140px' }} align="right">Average Bid</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '120px' }} align="center">Popularity Rank</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gameAnalytics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No analytics data available for this game
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  gameAnalytics.map((analytics) => (
                    <TableRow key={analytics.cardName} hover>
                      <TableCell>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            borderRadius: '8px',
                            px: 2,
                            py: 1.5,
                            minWidth: 'fit-content',
                          }}
                        >
                          {/* White circular icon with suit symbol */}
                          <Box
                            sx={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: analytics.cardSuit === 'hearts' || analytics.cardSuit === 'diamonds' 
                                  ? '#d32f2f'  // Red for hearts and diamonds
                                  : '#000000', // Black for spades and clubs
                                fontWeight: 'bold'
                              }}
                            >
                              {analytics.symbol}
                            </Typography>
                          </Box>
                          
                          {/* Card name */}
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 600, 
                              color: 'white',
                              fontSize: '1rem'
                            }}
                          >
                            {analytics.cardName.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {analytics.totalBids}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" color="success.main" sx={{ fontWeight: 500 }}>
                          ₹{analytics.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {analytics.uniqueBidders}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" color="primary.main" sx={{ fontWeight: 500 }}>
                          ₹{analytics.averageBidAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={`#${analytics.popularityRank}`} 
                          size="small" 
                          color={analytics.popularityRank <= 3 ? 'primary' : 'default'}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>



      {/* Card Bidding Dialog */}
      <Dialog 
        open={openCardBiddingDialog} 
        onClose={() => setOpenCardBiddingDialog(false)} 
        maxWidth={false}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: '95vw',
            maxWidth: '1400px',
            height: '90vh',
            maxHeight: '800px'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h6">
              Active Cards Bidding - {selectedGame?.timeWindow && new Date(selectedGame.timeWindow).toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                ID: {selectedGame?._id.slice(-8)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(selectedGame?._id || '');
                }}
                title="Copy Game ID"
                sx={{ p: 0.5 }}
              >
                <ContentCopy sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Box>
          </Box>
          {selectedGame?.status !== 'open' && selectedGame?.winningCard && (
            <Typography variant="subtitle1" color="success.main" sx={{ mt: 1 }}>
              🏆 Winner: {selectedGame.winningCard.replace(/_/g, ' ').toUpperCase()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Game Details
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Status: {selectedGame?.status.replace(/_/g, ' ').toUpperCase()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Pool: ₹{selectedGame?.totalPool.toLocaleString() || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Bids: {gameBids.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Unique Bidders: {new Set(gameBids.map(bid => 
                typeof bid.user === 'string' ? bid.user : bid.user._id
              )).size}
            </Typography>
            <Typography variant="body2" color="info.main" sx={{ fontStyle: 'italic' }}>
              Showing only active cards available for bidding
            </Typography>
            {(() => {
              // Calculate lowest pool card
              const cardPools = new Map<string, number>();
              gameBids.forEach(bid => {
                const currentPool = cardPools.get(bid.cardName) || 0;
                cardPools.set(bid.cardName, currentPool + bid.totalAmount);
              });
              
              let lowestPoolAmount = Infinity;
              let lowestPoolCard: string | null = null;
              
              for (const [cardName, poolAmount] of cardPools) {
                if (poolAmount < lowestPoolAmount) {
                  lowestPoolAmount = poolAmount;
                  lowestPoolCard = cardName;
                }
              }
              
              if (lowestPoolCard && gameBids.length > 0) {
                const card = cards.find(c => c.name === lowestPoolCard);
                const displayCardName = card ? formatCardName(card, 'display') : lowestPoolCard.replace(/_/g, ' ').toUpperCase();
                return (
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    Lowest Pool Card: {displayCardName} (₹{lowestPoolAmount})
                  </Typography>
                );
              }
              return null;
            })()}
            {selectedGame?.winningCard && selectedGame.status === 'result_declared' && (
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                Winning Card: {(() => {
                  const card = cards.find(c => c.name === selectedGame.winningCard);
                  return card ? formatCardName(card, 'display') : selectedGame.winningCard.replace(/_/g, ' ').toUpperCase();
                })()}
              </Typography>
            )}
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: '120px' }}>Card ID</TableCell>
                  <TableCell sx={{ minWidth: '250px' }}>Card</TableCell>
                  <TableCell sx={{ minWidth: '120px' }}>Total Bids</TableCell>
                  <TableCell sx={{ minWidth: '150px' }}>Total Amount</TableCell>
                  <TableCell sx={{ minWidth: '140px' }}>Unique Bidders</TableCell>
                  <TableCell sx={{ minWidth: '120px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.filter(card => card.isActive).map((card) => {
                  const cardBids = gameBids.filter(bid => bid.cardName === card.name);
                  const totalBids = cardBids.length;
                  const totalAmount = cardBids.reduce((sum, bid) => sum + bid.totalAmount, 0);
                  const uniqueBidders = new Set(cardBids.map(bid => 
                    typeof bid.user === 'string' ? bid.user : bid.user._id
                  )).size;
                  const hasNoBids = totalBids === 0;
                  
                  return (
                    <TableRow 
                      key={card.name}
                      sx={{
                        opacity: hasNoBids ? 0.5 : 1,
                        '& .MuiTableCell-root': {
                          color: hasNoBids ? 'text.disabled' : 'inherit',
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.8rem',
                              wordBreak: 'break-all',
                              overflowWrap: 'break-word'
                            }}
                          >
                            {card._id}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(card._id);
                            }}
                            title="Copy Card ID"
                            sx={{ p: 0.5 }}
                            disabled={hasNoBids}
                          >
                            <ContentCopy sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            label={card.symbol}
                            size="small"
                            sx={{
                              backgroundColor: getSuitColor(card.suit) === '#d32f2f' ? '#ffebee' : '#f5f5f5',
                              color: getSuitColor(card.suit),
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              minWidth: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: hasNoBids ? 0.5 : 1,
                            }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {formatCardName(card, 'display')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{totalBids}</TableCell>
                      <TableCell>₹{totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{uniqueBidders}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenCardBidDetails(card.name)}
                            disabled={hasNoBids}
                          >
                            View Details
                          </Button>
                          {selectedGame?.status === 'waiting_result' && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeclareCardWinner(card.name)}
                              title="Declare this card as winner"
                              disabled={hasNoBids}
                              sx={{ 
                                color: 'warning.main',
                                '&:hover': { 
                                  backgroundColor: 'warning.light',
                                  color: 'warning.contrastText'
                                }
                              }}
                            >
                              <EmojiEvents />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCardBiddingDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Card Bid Details Dialog */}
      <Dialog 
        open={openCardBidDetailsDialog} 
        onClose={() => setOpenCardBidDetailsDialog(false)} 
        maxWidth={false}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: '95vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '800px',
            margin: '20px'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Bid Details - {(() => {
                const selectedCard = cards.find(c => c.name === selectedCardForBidding);
                return selectedCard ? formatCardName(selectedCard, 'display') : selectedCardForBidding.replace(/_/g, ' ').toUpperCase();
              })()}
            </Typography>
            <IconButton
              onClick={() => setOpenCardBidDetailsDialog(false)}
              sx={{ color: 'grey.500' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            height: '100%',
            flexDirection: { xs: 'column', md: 'row' }
          }}>
            {/* Card Summary Section */}
            <Box sx={{ 
              width: { xs: '100%', md: '30%' }, 
              minWidth: { md: '300px' },
              flexShrink: 0
            }}>
              <Paper sx={{ p: 3, height: 'fit-content' }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Card Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" color="textSecondary">
                      Total Bids:
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {cardBids.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" color="textSecondary">
                      Total Amount:
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      ₹{cardBids.reduce((sum, bid) => sum + bid.totalAmount, 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" color="textSecondary">
                      Unique Bidders:
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {new Set(cardBids.map(bid => 
                        typeof bid.user === 'string' ? bid.user : bid.user._id
                      )).size}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
            
            {/* Bids Table Section */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ height: '100%' }}>
                <TableContainer sx={{ height: '100%' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Card Price</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Amount</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Bid Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cardBids.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            <Typography variant="body1" color="textSecondary">
                              No bids found for this card
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        cardBids.map((bid) => (
                          <TableRow key={bid._id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {typeof bid.user === 'string' 
                                    ? bid.user 
                                    : bid.user.fullName
                                  }
                                </Typography>
                                {typeof bid.user !== 'string' && (
                                  <Typography variant="body2" color="textSecondary">
                                    {bid.user.email}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {bid.quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" color="primary.main" sx={{ fontWeight: 500 }}>
                                ₹{bid.cardPrice.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" color="success.main" sx={{ fontWeight: 500 }}>
                                ₹{bid.totalAmount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {new Date(bid.createdAt).toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Winners Modal */}
      <WinnersModal
        open={openWinnersModal}
        onClose={() => {
          setOpenWinnersModal(false);
          setSelectedGameForWinners(null);
        }}
        gameId={selectedGameForWinners?._id || ''}
        winningCard={selectedGameForWinners?.winningCard || ''}
        totalWinners={winnersData?.totalWinners || 0}
        totalWinningAmount={winnersData?.totalWinningAmount || 0}
        winners={winnersData?.winners || []}
        isLoading={isLoadingWinners}
        error={winnersError ? 'Failed to load winners' : undefined}
      />
    </Box>
  );
} 