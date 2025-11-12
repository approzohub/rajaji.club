import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close, EmojiEvents } from '@mui/icons-material';
import { getSuitColor } from '../utils/cardUtils';

interface Winner {
  userId: string;
  userName: string;
  userEmail: string;
  bidAmount: number;
  payoutAmount: number;
  cardName: string;
  cardType: string;
  cardSuit: string;
  quantity: number;
}

interface WinnersModalProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  winningCard: string;
  totalWinners: number;
  totalWinningAmount: number;
  winners: Winner[];
  isLoading?: boolean;
  error?: string;
}

export function WinnersModal({
  open,
  onClose,
  gameId,
  winningCard,
  totalWinners,
  totalWinningAmount,
  winners,
  isLoading = false,
  error
}: WinnersModalProps) {
  const formatCardDisplay = (cardType: string, cardSuit: string) => {
    const suitSymbols: Record<string, string> = {
      'clubs': '♣',
      'spades': '♠',
      'hearts': '♥',
      'diamonds': '♦'
    };
    const suitSymbol = suitSymbols[cardSuit.toLowerCase()] || cardSuit;
    return `${cardType}${suitSymbol}`;
  };

  const formatWinningCard = (cardName: string) => {
    if (!cardName) return '';
    
    // If already in display format (contains suit symbols), return as is
    if (cardName.includes('♣') || cardName.includes('♠') || cardName.includes('♥') || cardName.includes('♦')) {
      return cardName;
    }
    
    // Convert database format (e.g., "jack_of_clubs") to display format (e.g., "J♣")
    if (cardName.includes('_of_')) {
      const parts = cardName.split('_of_');
      const cardType = parts[0];
      const cardSuit = parts[1];
      
      // Map card types to display format
      const cardTypeMap: Record<string, string> = {
        'ace': 'A',
        'king': 'K',
        'queen': 'Q',
        'jack': 'J',
        '10': '10'
      };
      
      // Map suits to symbols
      const suitSymbols: Record<string, string> = {
        'clubs': '♣',
        'spades': '♠',
        'hearts': '♥',
        'diamonds': '♦'
      };
      
      const displayType = cardTypeMap[cardType.toLowerCase()] || cardType.toUpperCase();
      const suitSymbol = suitSymbols[cardSuit.toLowerCase()] || cardSuit;
      
      return `${displayType}${suitSymbol}`;
    }
    
    return cardName;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: '90vh',
          width: '95vw',
          maxWidth: 'none',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmojiEvents sx={{ color: 'warning.main', fontSize: '2rem' }} />
            <Box>
              <Typography variant="h6" component="span">
                Game Winners
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Game ID: {gameId}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'grey.500' }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading winners...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box>
            {/* Game Summary */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  🏆 Winning Card: {formatWinningCard(winningCard)}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Total Winners
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {totalWinners}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Total Payout
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ₹{totalWinningAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Winners List */}
            {winners.length === 0 ? (
              <Alert severity="info">
                No winners found for this game.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Card</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Bid Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Payout</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {winners.map((winner, index) => (
                      <TableRow key={winner.userId} hover>
                        <TableCell>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color={index < 3 ? 'primary' : 'default'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {winner.userName}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {winner.userEmail}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={formatCardDisplay(winner.cardType, winner.cardSuit)}
                              size="small"
                              sx={{
                                backgroundColor: getSuitColor(winner.cardSuit) === '#d32f2f' ? '#ffebee' : '#f5f5f5',
                                color: getSuitColor(winner.cardSuit),
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                              }}
                            />
                            <Typography variant="body2" color="textSecondary">
                              ({winner.quantity} × ₹{winner.bidAmount})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            ₹{(winner.bidAmount * winner.quantity).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>
                            ₹{winner.payoutAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
