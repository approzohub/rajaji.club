import { Box, Typography, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Chip, Tooltip, IconButton, InputAdornment } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useGetWalletsQuery, useRechargeWalletMutation, useManualDebitMutation, useGetUserTransactionsQuery } from '../api/walletApi';
import { useGetUsersQuery } from '../api/usersApi';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth';
import { useMemo, useState, useEffect } from 'react';
import ContentCopy from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';

const walletTypes = [
  { value: 'main', label: 'Main' },
  { value: 'bonus', label: 'Bonus' },
];

type User = import('../api/usersApi').User;

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '');

export default function WalletPage() {
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

  const { data, isLoading, error, refetch } = useGetWalletsQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    search: debouncedSearchTerm || undefined,
  });

  const wallets = data?.wallets ?? [];
  const [rechargeWallet] = useRechargeWalletMutation();
  const [manualDebit] = useManualDebitMutation();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [debitOpen, setDebitOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRechargeOpen, setConfirmRechargeOpen] = useState(false);
  const [rechargeFormData, setRechargeFormData] = useState<RechargePayload | null>(null);
  const [rechargeUserIdentifier, setRechargeUserIdentifier] = useState('');

  const { data: usersResponse } = useGetUsersQuery();
  const users: User[] = usersResponse?.users ?? [];
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((user: User) => map.set(user._id, user));
    return map;
  }, [users]);

  const resolveUserIdFromInput = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (objectIdRegex.test(trimmed)) return trimmed;

    const normalizedInput = normalizePhoneNumber(trimmed);
    if (!normalizedInput) return null;

    const matchedUser = users.find((user: User) => normalizePhoneNumber(user.phone || '') === normalizedInput);
    return matchedUser?._id || null;
  };
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WalletFormData>();
  
  // Get current user from auth context
  const { user: currentUser } = useAuth();

  // Get transactions for selected user
  const { data: userTransactions = [], isLoading: transactionsLoading } = useGetUserTransactionsQuery(
    selectedUserId || '',
    { skip: !selectedUserId }
  );

  // Determine page title based on user role
  const getPageTitle = () => {
    if (currentUser?.role === 'agent') {
      return 'My Users Wallets';
    }
    return 'Wallet';
  };


  const columns: GridColDef[] = [
    {
      field: 'userId',
      headerName: 'User ID',
      flex: 1.5,
      minWidth: 220,
      renderCell: (params) => {
        if (!params || !params.value) return 'N/A';
        const value = params.value;
        return (
          <Tooltip title={value} placement="top">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  flex: 1,
                }}
              >
                {value}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(value);
                }}
                title="Copy User ID"
                sx={{ p: 0.5, flexShrink: 0 }}
              >
                <ContentCopy sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Box>
          </Tooltip>
        );
      }
    },
    { field: 'userName', headerName: 'User', flex: 1.2, minWidth: 150 },
    {
      field: 'userPhone',
      headerName: 'Phone',
      flex: 1,
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
      )
    },
    { 
      field: 'userRole', 
      headerName: 'Role', 
      flex: 0.8, 
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.value) return null;
        const role = params.value;
        return (
          <Tooltip title={role} placement="top">
            <Chip
              label={role?.toUpperCase() || 'N/A'}
              color={role === 'admin' ? 'error' : role === 'agent' ? 'warning' : 'primary'}
              variant="outlined"
              size="small"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            />
          </Tooltip>
        );
      }
    },
    { field: 'main', headerName: 'Main Balance', flex: 1, minWidth: 120, renderCell: (params: { value?: number }) => `₹${params.value || 0}` },
    { field: 'bonus', headerName: 'Bonus Balance', flex: 1, minWidth: 120, renderCell: (params: { value?: number }) => `₹${params.value || 0}` },
    { field: 'totalBalance', headerName: 'Total Balance', flex: 1, minWidth: 120, renderCell: (params: { row?: { main?: number; bonus?: number } }) => {
      const main = params.row?.main || 0;
      const bonus = params.row?.bonus || 0;
      return `₹${main + bonus}`;
    } },
    { field: 'updatedAt', headerName: 'Last Updated', flex: 1, minWidth: 180, renderCell: (params: { value?: string }) => {
      return params.value ? new Date(params.value).toLocaleString() : '';
    } },
  ];

  // Debug log to see the data
  // React.useEffect(() => {
  //   console.log('Transactions data:', transactions);
  // }, [transactions]);

  const walletRows = useMemo(() => wallets.map(wallet => {
    const matchedUser = wallet.user?._id ? usersMap.get(wallet.user._id) : undefined;
    const userId = wallet.user?._id || matchedUser?._id || '';
    const userPhone = wallet.user?.phone || matchedUser?.phone || '';
    const userName = wallet.user?.fullName || matchedUser?.fullName || wallet.user?.email || matchedUser?.email || userId || 'Unknown';
    const userRole = wallet.user?.role || matchedUser?.role || '';

    return {
      ...wallet,
      userName,
      userId,
      userPhone,
      userRole,
      userEmail: wallet.user?.email || matchedUser?.email || '',
    };
  }), [wallets, usersMap]);

  // Reset to first page when debounced search changes
  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [debouncedSearchTerm]);

  const handleRowClick = (params: { row: { user: { _id: string } } }) => {
    setSelectedUserId(params.row.user._id);
    setTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setTransactionModalOpen(false);
    setSelectedUserId(null);
  };

  const getTransactionColor = (type: string) => {
    return type === 'debit' ? 'error.main' : 'success.main';
  };

  const getTransactionIcon = (type: string) => {
    return type === 'debit' ? '↓' : '↑';
  };

  interface WalletFormData {
    userIdentifier: string;
    amount: number;
    walletType: string;
    note?: string;
  }

  interface RechargePayload {
    userId: string;
    amount: number;
    walletType: string;
    note?: string;
  }

  const onRecharge = async (data: WalletFormData) => {
    setFormError(null);
    const resolvedUserId = resolveUserIdFromInput(data.userIdentifier);
    if (!resolvedUserId) {
      setFormError('No user found with that phone number or ID');
      return;
    }

    setRechargeFormData({
      userId: resolvedUserId,
      amount: Number(data.amount),
      walletType: data.walletType,
      note: data.note,
    });
    setRechargeUserIdentifier(data.userIdentifier.trim());
    setConfirmRechargeOpen(true);
  };

  const confirmRecharge = async () => {
    if (!rechargeFormData) return;
    
    setFormError(null);
    try {
      await rechargeWallet(rechargeFormData).unwrap();
      setRechargeOpen(false);
      handleCloseRechargeConfirm();
      reset();
      refetch();
    } catch (e: unknown) {
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to recharge wallet';
      setFormError(apiError);
      handleCloseRechargeConfirm();
    }
  };

  const handleCloseRechargeConfirm = () => {
    setConfirmRechargeOpen(false);
    setRechargeFormData(null);
    setRechargeUserIdentifier('');
  };

  const onManualDebit = async (data: WalletFormData) => {
    setFormError(null);
    const resolvedUserId = resolveUserIdFromInput(data.userIdentifier);
    if (!resolvedUserId) {
      setFormError('No user found with that phone number or ID');
      return;
    }

    try {
      await manualDebit({
        userId: resolvedUserId,
        amount: Number(data.amount),
        walletType: data.walletType,
        note: data.note,
      }).unwrap();
      setDebitOpen(false);
      reset();
      refetch();
    } catch (e: unknown) {
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to debit wallet';
      setFormError(apiError);
    }
  };

  return (
    <Box>
      <Box mb={2} display="flex" flexDirection="column" gap={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{getPageTitle()}</Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <Button variant="contained" onClick={() => setRechargeOpen(true)}>Recharge Wallet</Button>
            {currentUser?.role === 'admin' && (
              <Button variant="outlined" color="error" onClick={() => setDebitOpen(true)}>Manual Debit</Button>
            )}
          </Box>
        </Box>
        <Tooltip 
          title="Search by: User Name, User ID, Phone, Email, or Game ID" 
          arrow
          placement="top"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, user ID, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
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
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load wallets'}</Alert> : (
        <Box sx={{ width: '100%', overflow: 'auto' }}>
          <DataGrid
            rows={walletRows}
            columns={columns}
            getRowId={(row) => row._id}
            onRowClick={handleRowClick}
            autoHeight
            paginationMode="server"
            rowCount={data?.pagination.totalResults ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => setPaginationModel(model)}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              width: '100%',
              minHeight: 400,
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeader': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
              '& .MuiDataGrid-root': {
                border: '1px solid #e0e0e0',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
                cursor: 'pointer',
              },
            }}
          />
        </Box>
      )}
      {/* Transaction History Modal */}
      <Dialog 
        open={transactionModalOpen} 
        onClose={handleCloseTransactionModal} 
        maxWidth={false}
        sx={{
          '& .MuiDialog-paper': {
            width: '90vw',
            maxWidth: '1200px',
            height: '80vh',
          },
        }}
      >
          <DialogTitle>
            Transaction History - {selectedUserId && wallets.find((w) => w.user._id === selectedUserId)?.user.fullName}
          </DialogTitle>
        <DialogContent>
          {transactionsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : userTransactions.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" p={3}>
              No transactions found for this user.
            </Typography>
          ) : (
            <Box sx={{ mt: 2, height: 'calc(80vh - 200px)' }}>
              <DataGrid
                rows={userTransactions}
                columns={[
                  {
                    field: 'type',
                    headerName: 'Type',
                    width: 150,
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: getTransactionColor(params.value) }}>
                          {getTransactionIcon(params.value)}
                        </Typography>
                        <Typography sx={{ color: getTransactionColor(params.value), fontWeight: 'medium' }}>
                          {params.value === 'debit' ? 'Debit' : 'Recharge'}
                        </Typography>
                      </Box>
                    ),
                  },
                  {
                    field: 'amount',
                    headerName: 'Amount',
                    width: 150,
                    renderCell: (params) => (
                      <Typography sx={{ color: getTransactionColor(params.row.type), fontWeight: 'bold' }}>
                        ₹{params.value}
                      </Typography>
                    ),
                  },
                  {
                    field: 'walletType',
                    headerName: 'Wallet',
                    width: 120,
                    renderCell: (params) => (
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {params.value}
                      </Typography>
                    ),
                  },
                  {
                    field: 'initiator',
                    headerName: 'Initiator',
                    width: 200,
                    renderCell: (params) => {
                      const initiatorId = params.value;
                      const initiator = users.find((u: User) => u._id === initiatorId);
                      return (
                        <Typography>
                          {initiator ? `${initiator.fullName} (${initiator.role})` : initiatorId}
                        </Typography>
                      );
                    },
                  },
                  {
                    field: 'note',
                    headerName: 'Note',
                    flex: 1,
                    minWidth: 200,
                    renderCell: (params) => (
                      <Typography sx={{ fontStyle: params.value ? 'normal' : 'italic', color: params.value ? 'text.primary' : 'text.secondary' }}>
                        {params.value || 'No note'}
                      </Typography>
                    ),
                  },
                  {
                    field: 'createdAt',
                    headerName: 'Date & Time',
                    width: 200,
                    renderCell: (params) => (
                      <Typography variant="body2">
                        {new Date(params.value).toLocaleString()}
                      </Typography>
                    ),
                  },
                ]}
                getRowId={(row) => row._id}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 100 },
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransactionModal}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Recharge Wallet Dialog */}
      <Dialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Recharge Wallet</DialogTitle>
        {currentUser?.role === 'agent' && (
          <DialogContent sx={{ pb: 0 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Agents can only recharge main wallet of their assigned users. Bonus wallet recharges are admin-only.
            </Alert>
          </DialogContent>
        )}
        <form onSubmit={handleSubmit(onRecharge)}>
          <DialogContent>
            <TextField 
              label="Phone Number or User ID" 
              fullWidth 
              margin="normal" 
              {...register('userIdentifier', { required: 'Phone number or User ID is required' })} 
              error={!!errors.userIdentifier} 
              helperText={errors.userIdentifier?.message || 'Enter a 10-digit phone number or paste the user ID'} 
              placeholder="e.g., 9876543210 or 507f1f77bcf86cd799439011"
            />
            <TextField label="Amount" type="number" fullWidth margin="normal" {...register('amount', { required: true, min: 1 })} error={!!errors.amount} helperText={errors.amount && 'Amount is required'} />
            <TextField select label="Wallet Type" fullWidth margin="normal" defaultValue="main" {...register('walletType', { required: true })} error={!!errors.walletType} helperText={errors.walletType && 'Wallet type is required'}>
              {currentUser?.role === 'admin' ? (
                // Admin can recharge both main and bonus wallets
                walletTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))
              ) : (
                // Agents can only recharge main wallet
                <MenuItem value="main">Main</MenuItem>
              )}
            </TextField>
            <TextField label="Note" fullWidth margin="normal" {...register('note')} />
            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRechargeOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Recharging...' : 'Recharge'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Recharge Confirmation Dialog */}
      <Dialog open={confirmRechargeOpen} onClose={() => setConfirmRechargeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Recharge</DialogTitle>
        <DialogContent>
          {rechargeFormData && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Are you sure you want to recharge with this amount?
                </Typography>
              </Alert>
              <Box sx={{ mb: 2 }}>
                {(() => {
                  const user = users.find((u: User) => u._id === rechargeFormData.userId);
                  return (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Lookup Input:</strong> {rechargeUserIdentifier || rechargeFormData.userId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>User ID:</strong> {rechargeFormData.userId}
                      </Typography>
                      {user && (
                        <>
                          {user.fullName && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Name:</strong> {user.fullName}
                            </Typography>
                          )}
                          {user.phone && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Phone:</strong> {user.phone}
                            </Typography>
                          )}
                          {user.email && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Email:</strong> {user.email}
                            </Typography>
                          )}
                        </>
                      )}
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                        <strong>Amount:</strong> ₹{rechargeFormData.amount.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Wallet Type:</strong> {rechargeFormData.walletType === 'main' ? 'Main' : 'Bonus'}
                      </Typography>
                      {rechargeFormData.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>Note:</strong> {rechargeFormData.note}
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
              </Box>
              {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRechargeConfirm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={confirmRecharge} variant="contained" color="warning" disabled={isSubmitting}>
            {isSubmitting ? 'Recharging...' : 'Yes, Recharge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Debit Dialog */}
      <Dialog open={debitOpen} onClose={() => setDebitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Manual Debit</DialogTitle>
        <form onSubmit={handleSubmit(onManualDebit)}>
          <DialogContent>
            <TextField 
              label="Phone Number or User ID" 
              fullWidth 
              margin="normal" 
              {...register('userIdentifier', { required: 'Phone number or User ID is required' })} 
              error={!!errors.userIdentifier} 
              helperText={errors.userIdentifier?.message || 'Enter a 10-digit phone number or paste the user ID'} 
              placeholder="e.g., 9876543210 or 507f1f77bcf86cd799439011"
            />
            <TextField label="Amount" type="number" fullWidth margin="normal" {...register('amount', { required: true, min: 1 })} error={!!errors.amount} helperText={errors.amount && 'Amount is required'} />
            <TextField select label="Wallet Type" fullWidth margin="normal" defaultValue="main" {...register('walletType', { required: true })} error={!!errors.walletType} helperText={errors.walletType && 'Wallet type is required'}>
              {walletTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Note" fullWidth margin="normal" {...register('note')} />
            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDebitOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={isSubmitting}>{isSubmitting ? 'Debiting...' : 'Debit'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 