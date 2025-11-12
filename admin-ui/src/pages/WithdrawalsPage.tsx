import { Box, Typography, CircularProgress, Alert, Chip, IconButton, Tooltip, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { useGetWithdrawalsQuery, useApproveWithdrawalMutation, useRejectWithdrawalMutation } from '../api/withdrawalsApi';
import { useGetUsersQuery } from '../api/usersApi';
import { useState, useMemo } from 'react';

export default function WithdrawalsPage() {
  const { data: withdrawals = [], isLoading, error } = useGetWithdrawalsQuery();
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery();
  
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

  const selectedUser: PopulatedUser | undefined = useMemo(() => {
    if (!selected) return undefined;
    const u = selected.user as unknown;
    if (u && typeof u === 'object') return u as PopulatedUser;
    const byId = users.find(x => x._id === selected.user);
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

  const columns: GridColDef[] = [
    { 
      field: 'user', 
      headerName: 'User', 
      flex: 1,
      renderCell: (params: { row: import('../api/withdrawalsApi').Withdrawal }) => {
        if (!params || !params.row || !params.row.user) return <span>N/A</span>;
        
        // Handle populated user object
        if (typeof params.row.user === 'object' && params.row.user !== null) {
          const userObj = params.row.user as PopulatedUser;
          return <span>{userObj.fullName ?? 'Unknown'} ({userObj.gameId ?? 'N/A'})</span>;
        }
        
        // Fallback to finding user by ID
        const user = users.find(u => u._id === params.row.user);
        return <span>{user ? `${user.fullName} (${user.gameId})` : params.row.user}</span>;
      }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Withdrawal Requests</Typography>
        <Box display="flex" gap={1}>
          <Chip 
            label={`Total: ${(withdrawals || []).length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Pending: ${(withdrawals || []).filter(w => w.status?.toLowerCase() === 'pending').length}`} 
            color="warning" 
            variant="outlined"
          />
        </Box>
      </Box>
      
      {isLoading || isLoadingUsers ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          {(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load withdrawals'}
        </Alert>
            ) : (
        <DataGrid
          rows={withdrawals || []}
          columns={columns}
          getRowId={(row) => row._id || Math.random().toString()}
          autoHeight
          initialState={{ 
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: {
              sortModel: [{ field: 'createdAt', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        />
      )}
      
      {/* View Details Dialog */}
      <Dialog open={viewOpen} onClose={closeView} maxWidth="sm" fullWidth>
        <DialogTitle>Withdrawal Details</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={1.5}>
            <Typography variant="subtitle2" color="text.secondary">User</Typography>
            <Typography variant="body1">
              {selectedUser
                ? `${selectedUser.fullName ?? 'Unknown'} (${selectedUser.gameId ?? 'N/A'})`
                : typeof selected?.user === 'string'
                  ? selected?.user
                  : 'N/A'}
            </Typography>
            {selectedUser?.phone && <Typography variant="body2">Phone: {selectedUser.phone}</Typography>}
            {selectedUser?.email && <Typography variant="body2">Email: {selectedUser.email}</Typography>}
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="text.secondary">Request</Typography>
            <Typography variant="body2">Amount: ₹{(selected?.amount || 0).toLocaleString()}</Typography>
            <Typography variant="body2">Wallet Type: {selected?.walletType || 'N/A'}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">Payment Details</Typography>
            {selected?.paymentMethod ? (
              <>
                <Typography variant="body2">UPI Name: {selected.paymentMethod.name || 'N/A'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                  UPI ID: {selected.paymentMethod.upiId || 'N/A'}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="error">No payment method found</Typography>
            )}
            <Divider sx={{ my: 1 }} />
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
        <DialogActions>
          <Button onClick={closeView}>Close</Button>
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
              <Box sx={{ mt: 1, p: 2, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Withdrawal Details:
                </Typography>
                <Typography variant="body2">
                  Amount: ₹{(selectedWithdrawalForAction.amount || 0).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  User: {(() => {
                    if (typeof selectedWithdrawalForAction.user === 'object' && selectedWithdrawalForAction.user !== null) {
                      const userObj = selectedWithdrawalForAction.user as PopulatedUser;
                      return `${userObj.fullName ?? 'Unknown'} (${userObj.gameId ?? 'N/A'})`;
                    }
                    const user = users.find(u => u._id === selectedWithdrawalForAction.user);
                    return user ? `${user.fullName} (${user.gameId})` : selectedWithdrawalForAction.user;
                  })()}
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