import { Box, Typography, CircularProgress, Alert, Chip, IconButton, Tooltip, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, TextField, Popover, FormGroup, FormControlLabel, Checkbox, InputAdornment } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility, ViewColumn, Search, ContentCopy } from '@mui/icons-material';
import { useGetWithdrawalsQuery, useApproveWithdrawalMutation, useRejectWithdrawalMutation } from '../api/withdrawalsApi';
import { useGetUsersQuery } from '../api/usersApi';
import { useState, useMemo } from 'react';

type User = import('../api/usersApi').User;

export default function WithdrawalsPage() {
  const [paginationModel, setPaginationModel] = useState<{ page: number; pageSize: number }>({
    page: 0,
    pageSize: 10,
  });

  const { data, isLoading, error } = useGetWithdrawalsQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  });

  const withdrawals = data?.withdrawals ?? [];
  const { data: usersResponse, isLoading: isLoadingUsers } = useGetUsersQuery();
  const users: User[] = usersResponse?.users ?? [];
  
  // Temporary debug to check data structure
  if (withdrawals.length > 0) {
    console.log('Sample withdrawal user:', withdrawals[0].user);
    console.log('Sample withdrawal createdAt:', withdrawals[0].createdAt);
  }
  

  const [approveWithdrawal, { isLoading: isApproving }] = useApproveWithdrawalMutation();
  const [rejectWithdrawal, { isLoading: isRejecting }] = useRejectWithdrawalMutation();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // View details dialog state
  type Withdrawal = import('../api/withdrawalsApi').Withdrawal;
  type PopulatedUser = { _id: string; fullName?: string; gameId?: string; phone?: string; email?: string };
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Withdrawal | null>(null);

  // Note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<'approve' | 'reject' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedWithdrawalForAction, setSelectedWithdrawalForAction] = useState<Withdrawal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedUser: PopulatedUser | undefined = useMemo(() => {
    if (!selected) return undefined;
    const u = selected.user as unknown;
    if (u && typeof u === 'object') return u as PopulatedUser;
    const byId = users.find((x: User) => x._id === selected.user);
    if (byId) return { _id: byId._id, fullName: byId.fullName, gameId: byId.gameId, phone: byId.phone, email: byId.email } as PopulatedUser;
    return undefined;
  }, [selected, users]);

  const handleView = (row: Withdrawal) => {
    setSelected(row);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setSelected(null);
  };

  const handleApprove = async (withdrawal: Withdrawal) => {
    setSelectedWithdrawalForAction(withdrawal);
    setNoteAction('approve');
    setNoteText('');
    setNoteDialogOpen(true);
  };

  const handleReject = async (withdrawal: Withdrawal) => {
    setSelectedWithdrawalForAction(withdrawal);
    setNoteAction('reject');
    setNoteText('');
    setNoteDialogOpen(true);
  };

  const handleNoteSubmit = async () => {
    if (!selectedWithdrawalForAction || !noteAction) return;

    try {
      if (noteAction === 'approve') {
        await approveWithdrawal({ id: selectedWithdrawalForAction._id, note: noteText }).unwrap();
        setSnackbar({
          open: true,
          message: 'Withdrawal approved successfully!',
          severity: 'success'
        });
      } else {
        await rejectWithdrawal({ id: selectedWithdrawalForAction._id, note: noteText }).unwrap();
        setSnackbar({
          open: true,
          message: 'Withdrawal rejected successfully!',
          severity: 'success'
        });
      }
      
      // Close dialog and reset state
      setNoteDialogOpen(false);
      setNoteAction(null);
      setNoteText('');
      setSelectedWithdrawalForAction(null);
    } catch {
      console.error(`Failed to ${noteAction} withdrawal`);
      setSnackbar({
        open: true,
        message: `Failed to ${noteAction} withdrawal. Please try again.`,
        severity: 'error'
      });
    }
  };

  const handleNoteCancel = () => {
    setNoteDialogOpen(false);
    setNoteAction(null);
    setNoteText('');
    setSelectedWithdrawalForAction(null);
  };

  type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  const getStatusColor = (status: string): ChipColor => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((user: User) => map.set(user._id, user));
    return map;
  }, [users]);

  const rows = useMemo(() => {
    return withdrawals.map(withdrawal => {
      let userId = '';
      let userName = 'Unknown';
      let userPhone = '';

      if (withdrawal.user && typeof withdrawal.user === 'object') {
        const populated = withdrawal.user as PopulatedUser;
        userId = populated._id;
        userName = populated.fullName || populated.email || populated._id || 'Unknown';
        userPhone = populated.phone || '';
      } else if (typeof withdrawal.user === 'string') {
        userId = withdrawal.user;
        const found = userMap.get(withdrawal.user);
        if (found) {
          userName = found.fullName || found.email || found._id || 'Unknown';
          userPhone = found.phone || '';
        } else {
          userName = withdrawal.user;
        }
      }

      return {
        ...withdrawal,
        userId,
        userName,
        userPhone,
      };
    });
  }, [withdrawals, userMap]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const query = searchTerm.trim().toLowerCase();
    return rows.filter(row => {
      const name = row.userName?.toLowerCase() || '';
      const id = row.userId?.toLowerCase() || '';
      const phone = row.userPhone?.toLowerCase() || '';
      const status = row.status?.toLowerCase() || '';
      const note = row.note?.toLowerCase() || '';
      return (
        name.includes(query) ||
        id.includes(query) ||
        phone.includes(query) ||
        status.includes(query) ||
        note.includes(query)
      );
    });
  }, [rows, searchTerm]);

  const [columnVisibilityAnchor, setColumnVisibilityAnchor] = useState<null | HTMLElement>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    userName: false,
    note: false,
  });

  const handleOpenColumnPopover = (event: React.MouseEvent<HTMLElement>) => {
    setColumnVisibilityAnchor(event.currentTarget);
  };

  const handleCloseColumnPopover = () => {
    setColumnVisibilityAnchor(null);
  };

  const columns: GridColDef[] = [
    { 
      field: 'userId',
      headerName: 'User ID',
      flex: 1.4,
      minWidth: 250,
    renderCell: (params) => (
      <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%', overflow: 'hidden' }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            wordBreak: 'break-all',
            color: params.value ? 'text.primary' : 'text.secondary',
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {params.value || 'N/A'}
        </Typography>
        {params.value && (
          <Tooltip title="Copy User ID">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(params.value as string);
                setSnackbar({
                  open: true,
                  message: 'User ID copied to clipboard',
                  severity: 'success',
                });
              }}
            >
              <ContentCopy sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
    },
    { 
      field: 'userName', 
      headerName: 'User', 
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || 'Unknown'}
        </Typography>
      )
    },
    {
      field: 'userPhone',
      headerName: 'Phone',
      flex: 0.9,
      minWidth: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            color: params.value ? 'text.primary' : 'text.secondary',
          }}
        >
          {params.value || 'N/A'}
        </Typography>
      ),
    },
    { 
      field: 'amount', 
      headerName: 'Amount', 
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="primary">
          ₹{((params?.value) || 0).toLocaleString()}
        </Typography>
      )
    },
    { 
      field: 'walletType', 
      headerName: 'Wallet Type', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params?.value || 'N/A'} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={(() => {
            const raw = (params?.value as string) || '';
            if (raw.toLowerCase() === 'completed') return 'Approved';
            return raw || 'Unknown';
          })()} 
          size="small" 
          color={getStatusColor((params?.value as string) || '')}
          variant="filled"
        />
      )
    },
    { 
      field: 'note', 
      headerName: 'Note', 
      flex: 1,
      renderCell: (params: { row: import('../api/withdrawalsApi').Withdrawal }) => {
        if (!params || !params.row) return <span>N/A</span>;
        const note = params.row.note;
        if (!note) return <span className="text-gray-400">-</span>;
        return (
          <Tooltip title={note} placement="top">
            <span className="cursor-help">
              {note.length > 30 ? `${note.substring(0, 30)}...` : note}
            </span>
          </Tooltip>
        );
      }
    },
    { 
      field: 'createdAt', 
      headerName: 'Created At', 
      flex: 1, 
      renderCell: (params: { row: import('../api/withdrawalsApi').Withdrawal }) => {
        if (!params || !params.row || !params.row.createdAt) return <span>N/A</span>;
        try {
          const date = new Date(params.row.createdAt);
          if (isNaN(date.getTime())) return <span>Invalid Date</span>;
          return <span>{date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</span>;
        } catch {
          return <span>Invalid Date</span>;
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params: { row: import('../api/withdrawalsApi').Withdrawal }) => {
        if (!params || !params.row) return null;
        const isPending = params.row.status?.toLowerCase() === 'pending';
        return (
          <Box display="flex" gap={1}>
            {isPending && (
              <>
                <Tooltip title="Approve Withdrawal">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleApprove(params.row)}
                    disabled={isApproving || isRejecting}
                  >
                    <CheckCircle />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject Withdrawal">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleReject(params.row)}
                    disabled={isApproving || isRejecting}
                  >
                    <Cancel />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="View Details">
              <IconButton size="small" color="primary" onClick={() => handleView(params.row)}>
                <Visibility />
              </IconButton>
            </Tooltip>
          </Box>
        );
            }
        }
    ];

  return (
    <Box>
      <Box mb={3} display="flex" flexDirection="column" gap={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Withdrawal Requests</Typography>
          <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <Chip 
            label={`Total: ${data?.counts.total ?? 0}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Pending: ${data?.counts.pending ?? 0}`} 
            color="warning" 
            variant="outlined"
          />
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewColumn />}
              onClick={handleOpenColumnPopover}
            >
              Columns
            </Button>
          </Box>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search withdrawals..."
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
      </Box>
      <Popover
        open={Boolean(columnVisibilityAnchor)}
        anchorEl={columnVisibilityAnchor}
        onClose={handleCloseColumnPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Show Columns</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.userName !== false}
                  onChange={(_, checked) =>
                    setColumnVisibilityModel(prev => ({ ...prev, userName: checked }))
                  }
                />
              }
              label="User"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnVisibilityModel.note !== false}
                  onChange={(_, checked) =>
                    setColumnVisibilityModel(prev => ({ ...prev, note: checked }))
                  }
                />
              }
              label="Note"
            />
          </FormGroup>
        </Box>
      </Popover>
      
      {isLoading || isLoadingUsers ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          {(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load withdrawals'}
        </Alert>
      ) : (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row._id || Math.random().toString()}
            autoHeight
            sortingOrder={['desc', 'asc']}
            initialState={{ 
              sorting: {
                sortModel: [{ field: 'createdAt', sort: 'desc' }],
              },
            }}
            paginationMode="server"
            rowCount={data?.pagination.totalResults ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => setPaginationModel(model)}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(model) => setColumnVisibilityModel(model)}
            sx={{
              minWidth: 800,
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeader': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
            }}
          />
        </Box>
      )}
      
      {/* View Details Dialog */}
      <Dialog open={viewOpen} onClose={closeView} maxWidth="sm" fullWidth>
        <DialogTitle>Withdrawal Details</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="subtitle2" color="text.secondary">User</Typography>
            <Box>
              <Typography variant="body1">{selectedUser?.fullName || selectedUser?.email || selectedUser?._id || (typeof selected?.user === 'string' ? selected.user : 'Unknown')}</Typography>
              <Typography variant="body2" color="text.secondary">User ID: {selectedUser?._id || (typeof selected?.user === 'string' ? selected.user : 'N/A')}</Typography>
            {selectedUser?.phone && <Typography variant="body2">Phone: {selectedUser.phone}</Typography>}
            {selectedUser?.email && <Typography variant="body2">Email: {selectedUser.email}</Typography>}
            </Box>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Request</Typography>
            <Typography variant="body2">Amount: ₹{(selected?.amount || 0).toLocaleString()}</Typography>
            <Typography variant="body2">Wallet Type: {selected?.walletType || 'N/A'}</Typography>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Payment Details</Typography>
            {selected?.paymentMethod ? (
              <Box>
                <Typography variant="body2">UPI Name: {selected.paymentMethod.name || 'N/A'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                  UPI ID: {selected.paymentMethod.upiId || 'N/A'}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="error">No payment method found</Typography>
            )}
            <Divider />
            <Typography variant="body2">
              Status: <Chip 
                label={(() => {
                  const s = (selected?.status || '').toLowerCase();
                  if (s === 'completed') return 'Approved';
                  return selected?.status || 'Unknown';
                })()} 
                size="small" 
                color={getStatusColor((selected?.status || ''))}
                variant="filled"
                sx={{ ml: 1 }}
              />
            </Typography>
            {selected?.note && (
              <Typography variant="body2">Note: {selected.note}</Typography>
            )}
            <Typography variant="body2">Created At: {selected?.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : 'N/A'}</Typography>
            {selected?.updatedAt && (<Typography variant="body2">Updated At: {new Date(selected.updatedAt).toLocaleString('en-IN')}</Typography>)}
            {selected?._id && (<Typography variant="body2">Request ID: {selected._id}</Typography>)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', px: 3, py: 2 }}>
          <Button onClick={closeView} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Note Dialog for Approve/Reject */}
      <Dialog 
        open={noteDialogOpen} 
        onClose={handleNoteCancel} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            '& .MuiDialogContent-root': {
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            '& .MuiDialogTitle-root': {
              backdropFilter: 'blur(10px)',
              borderRadius: '12px 12px 0 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            },
            '& .MuiDialogActions-root': {
              backdropFilter: 'blur(10px)',
              borderRadius: '0 0 12px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            }
          }
        }}
      >
        <DialogTitle>
          {noteAction === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {noteAction === 'approve' 
                ? 'Add a note for the approval (optional):' 
                : 'Add a reason for rejection (optional):'
              }
            </Typography>
            <TextField
              multiline
              rows={4}
              variant="outlined"
              placeholder={noteAction === 'approve' 
                ? 'Enter approval note...' 
                : 'Enter rejection reason...'
              }
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              fullWidth
            />
            {selectedWithdrawalForAction && (
              <Box sx={{ mt: 1}}>
                <Typography variant="body2" color="text.secondary">Withdrawal Details:</Typography>
                <Typography variant="body2">
                  User: {(() => {
                    if (typeof selectedWithdrawalForAction.user === 'object' && selectedWithdrawalForAction.user !== null) {
                      const userObj = selectedWithdrawalForAction.user as PopulatedUser;
                      return userObj.fullName ?? 'Unknown';
                    }
                    const user = users.find((u: User) => u._id === selectedWithdrawalForAction.user);
                    return user ? user.fullName : 'Unknown';
                  })()}
                </Typography>
                <Typography variant="body2">
                  User ID: {(() => {
                    if (typeof selectedWithdrawalForAction.user === 'object' && selectedWithdrawalForAction.user !== null) {
                      const userObj = selectedWithdrawalForAction.user as PopulatedUser;
                      return userObj._id ?? 'N/A';
                    }
                    return selectedWithdrawalForAction.user;
                  })()}
                </Typography>
                {(() => {
                  if (typeof selectedWithdrawalForAction.user === 'object' && selectedWithdrawalForAction.user !== null) {
                    const userObj = selectedWithdrawalForAction.user as PopulatedUser;
                    return userObj.phone ? <Typography variant="body2">Phone: {userObj.phone}</Typography> : null;
                  }
                  const user = users.find((u: User) => u._id === selectedWithdrawalForAction.user);
                  return user?.phone ? <Typography variant="body2">Phone: {user.phone}</Typography> : null;
                })()}
                <Typography variant="body2">
                  Amount: ₹{(selectedWithdrawalForAction.amount || 0).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNoteCancel}>Cancel</Button>
          <Button 
            onClick={handleNoteSubmit}
            variant="contained"
            color={noteAction === 'approve' ? 'success' : 'error'}
            disabled={isApproving || isRejecting}
          >
            {noteAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 