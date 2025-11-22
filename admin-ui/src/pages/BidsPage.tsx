import { Box, Typography, CircularProgress, Alert, Chip, TextField, InputAdornment, Tooltip } from '@mui/material';
import { Search } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useGetUserBidsQuery } from '../api/bidsApi';
import { useState, useEffect } from 'react';

export default function BidsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term by 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: bids = [], isLoading, error } = useGetUserBidsQuery({ search: debouncedSearchTerm || undefined });

  const columns: GridColDef[] = [
    { 
      field: 'user', 
      headerName: 'User', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const user = params.row.user;
        if (typeof user === 'object' && user !== null) {
          return (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                {user.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {user.email}
              </Typography>
            </Box>
          );
        }
        return typeof user === 'string' ? user.substring(0, 8) + '...' : 'N/A';
      }
    },
    { 
      field: 'game', 
      headerName: 'Game ID', 
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const game = params.row.game;
        if (typeof game === 'object' && game !== null) {
          return (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {game._id.substring(0, 8)}...
              </Typography>
            </Box>
          );
        }
        return typeof game === 'string' ? game.substring(0, 8) + '...' : 'N/A';
      }
    },
    { 
      field: 'gameTime', 
      headerName: 'Game Time', 
      flex: 1,
      minWidth: 160,
      renderCell: (params) => {
        const game = params.row.game;
        if (typeof game === 'object' && game !== null) {
          return (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2">
                {new Date(game.timeWindow).toLocaleString()}
              </Typography>
            </Box>
          );
        }
        return 'N/A';
      }
    },
    { 
      field: 'gameStatus', 
      headerName: 'Game Status', 
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const game = params.row.game;
        if (typeof game === 'object' && game !== null) {
          return (
            <Box sx={{ py: 1 }}>
              <Chip 
                label={game.status} 
                color={game.status === 'open' ? 'success' : game.status === 'result' ? 'primary' : 'default'}
                size="small"
                variant="outlined"
                sx={{ 
                  height: 24,
                  fontSize: '0.75rem',
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            </Box>
          );
        }
        return 'N/A';
      }
    },
    { 
      field: 'bidNumber', 
      headerName: 'Bid Number', 
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Chip 
            label={params.row.bidNumber} 
            color="primary" 
            variant="outlined"
            size="small"
            sx={{ 
              height: 28,
              fontSize: '0.875rem',
              fontWeight: 'bold',
              '& .MuiChip-label': {
                px: 1.5
              }
            }}
          />
        </Box>
      )
    },
    { 
      field: 'bidAmount', 
      headerName: 'Bid Amount', 
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="success.main" fontWeight="bold" fontSize="1rem">
            ₹{params.row.bidAmount?.toLocaleString() || '0'}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Created At', 
      flex: 1,
      minWidth: 160,
      renderCell: (params) => {
        const value = params.row.createdAt;
        if (!value) return 'No data';
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return value; // Return raw value
          }
          return (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2">
                {date.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Typography>
            </Box>
          );
        } catch {
          return value; // Return raw value on error
        }
      }
    },
  ];

  return (
    <Box>
      <Typography variant="h5" mb={2}>Bids Management</Typography>
      <Box sx={{ mb: 3 }}>
        <Tooltip 
          title="Search by: User Name, Phone, Email, Game ID, Card Name, Card Type (J/Q/K/A/10), or Card Suit (clubs/spades/hearts/diamonds)" 
          arrow
          placement="top"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by user name, phone, email, game ID, card name, type, or suit..."
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
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load bids'}</Alert> : (
        <DataGrid
          rows={bids}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0',
              padding: '8px 16px',
              minHeight: '80px !important',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
              minHeight: '56px !important',
            },
            '& .MuiDataGrid-row': {
              minHeight: '80px !important',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            },
            '& .MuiDataGrid-virtualScroller': {
              minHeight: '400px',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #e0e0e0',
            },
          }}
        />
      )}
    </Box>
  );
} 