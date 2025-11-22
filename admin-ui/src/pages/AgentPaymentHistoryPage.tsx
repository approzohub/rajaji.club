import { Box, Typography, CircularProgress, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Tooltip, TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useGetPaymentHistoryQuery } from '../api/walletApi';
import { useState, useMemo, useEffect } from 'react';

export default function AgentPaymentHistoryPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term by 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, error } = useGetPaymentHistoryQuery({
    page: page + 1,
    limit: rowsPerPage,
  });

  const allTransactions = data?.transactions ?? [];

  // Helper functions for filtering (moved before useMemo)
  const getTransactionTypeLabelForFilter = (type: string, transactionType: string) => {
    if (type === 'wallet_transaction') {
      switch (transactionType) {
        case 'recharge': return 'Recharge';
        case 'debit': return 'Debit';
        case 'refund': return 'Refund';
        case 'bonus': return 'Bonus';
        default: return transactionType;
      }
    } else if (type === 'bid') return 'Bid Placed';
    else if (type === 'withdrawal') return 'Withdrawal';
    return type;
  };

  const getProcessedByInfoForFilter = (processedBy?: any) => {
    if (!processedBy) return '-';
    if (typeof processedBy === 'object' && processedBy !== null) {
      return `${processedBy.fullName || 'Unknown'} (${processedBy.role || 'N/A'})`;
    }
    return '-';
  };

  const getCreditDebitInfoForFilter = (transaction: any) => {
    const isCredit = transaction.amount > 0;
    const info = [];
    if (isCredit) {
      info.push('CREDIT');
      if (transaction.processedBy) {
        const processedBy = typeof transaction.processedBy === 'object' ? transaction.processedBy : null;
        if (processedBy) {
          info.push(`From: ${processedBy.fullName || 'System'} (${processedBy.role || 'system'})`);
        }
      }
      if (transaction.transactionType === 'recharge') info.push('Type: Wallet Recharge');
      else if (transaction.transactionType === 'refund') info.push('Type: Refund');
      else if (transaction.transactionType === 'bonus') info.push('Type: Bonus Credit');
    } else {
      info.push('DEBIT');
      if (transaction.type === 'bid') {
        info.push('To: Game Bid');
        if (transaction.cardName) info.push(`Card: ${transaction.cardName}`);
      } else if (transaction.type === 'withdrawal') {
        info.push('To: Withdrawal Request');
        if (transaction.processedBy) {
          const processedBy = typeof transaction.processedBy === 'object' ? transaction.processedBy : null;
          if (processedBy) {
            info.push(`Processed by: ${processedBy.fullName || 'Pending'} (${processedBy.role || 'pending'})`);
          }
        }
      } else if (transaction.transactionType === 'debit') {
        info.push('To: Manual Debit');
        if (transaction.processedBy) {
          const processedBy = typeof transaction.processedBy === 'object' ? transaction.processedBy : null;
          if (processedBy) {
            info.push(`By: ${processedBy.fullName || 'System'} (${processedBy.role || 'system'})`);
          }
        }
      }
    }
    return info.join(' | ');
  };

  const formatDateForFilter = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Filter transactions based on debounced search term
  const filteredTransactions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return allTransactions;
    
    const query = debouncedSearchTerm.trim().toLowerCase();
    return allTransactions.filter((transaction) => {
      const type = getTransactionTypeLabelForFilter(transaction.type, transaction.transactionType).toLowerCase();
      const amount = Math.abs(transaction.amount).toString();
      const walletType = transaction.walletType?.toLowerCase() || '';
      const paymentMode = transaction.paymentMode?.toLowerCase() || '';
      const status = transaction.status?.toLowerCase() || '';
      const note = transaction.note?.toLowerCase() || '';
      const processedBy = getProcessedByInfoForFilter(transaction.processedBy).toLowerCase();
      const creditDebitInfo = getCreditDebitInfoForFilter(transaction).toLowerCase();
      const date = formatDateForFilter(transaction.createdAt).toLowerCase();
      
      return (
        type.includes(query) ||
        amount.includes(query) ||
        walletType.includes(query) ||
        paymentMode.includes(query) ||
        status.includes(query) ||
        note.includes(query) ||
        processedBy.includes(query) ||
        creditDebitInfo.includes(query) ||
        date.includes(query)
      );
    });
  }, [allTransactions, debouncedSearchTerm]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'approved':
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return (
      <Typography
        variant="body2"
        sx={{
          color: isNegative ? 'error.main' : 'success.main',
          fontWeight: 'bold',
        }}
      >
        {isNegative ? '-' : '+'}₹{absAmount.toLocaleString()}
      </Typography>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getTransactionTypeLabel = (type: string, transactionType: string) => {
    if (type === 'wallet_transaction') {
      switch (transactionType) {
        case 'recharge':
          return 'Recharge';
        case 'debit':
          return 'Debit';
        case 'refund':
          return 'Refund';
        case 'bonus':
          return 'Bonus';
        default:
          return transactionType;
      }
    } else if (type === 'bid') {
      return 'Bid Placed';
    } else if (type === 'withdrawal') {
      return 'Withdrawal';
    }
    return type;
  };

  const getProcessedByInfo = (processedBy?: any) => {
    if (!processedBy) return '-';
    if (typeof processedBy === 'object' && processedBy !== null) {
      return `${processedBy.fullName || 'Unknown'} (${processedBy.role || 'N/A'})`;
    }
    return '-';
  };

  const getBidDetails = (transaction: any) => {
    if (transaction.type !== 'bid') return null;
    const details = [];
    if (transaction.cardName) {
      details.push(`Card: ${transaction.cardName}`);
    }
    if (transaction.quantity) {
      details.push(`Qty: ${transaction.quantity}`);
    }
    if (transaction.cardPrice) {
      details.push(`Price: ₹${transaction.cardPrice.toLocaleString()}`);
    }
    if (transaction.gameId) {
      details.push(`Game: ${transaction.gameId.toString().substring(0, 8)}...`);
    }
    return details.length > 0 ? details.join(' | ') : null;
  };

  const getCreditDebitInfo = (transaction: any) => {
    const isCredit = transaction.amount > 0;
    const info = [];
    
    if (isCredit) {
      info.push('CREDIT');
      if (transaction.processedBy) {
        const processedBy = typeof transaction.processedBy === 'object' 
          ? transaction.processedBy 
          : null;
        if (processedBy) {
          info.push(`From: ${processedBy.fullName || 'System'} (${processedBy.role || 'system'})`);
        }
      }
      if (transaction.transactionType === 'recharge') {
        info.push('Type: Wallet Recharge');
      } else if (transaction.transactionType === 'refund') {
        info.push('Type: Refund');
      } else if (transaction.transactionType === 'bonus') {
        info.push('Type: Bonus Credit');
      }
    } else {
      info.push('DEBIT');
      if (transaction.type === 'bid') {
        info.push('To: Game Bid');
        if (transaction.cardName) {
          info.push(`Card: ${transaction.cardName}`);
        }
      } else if (transaction.type === 'withdrawal') {
        info.push('To: Withdrawal Request');
        if (transaction.processedBy) {
          const processedBy = typeof transaction.processedBy === 'object' 
            ? transaction.processedBy 
            : null;
          if (processedBy) {
            info.push(`Processed by: ${processedBy.fullName || 'Pending'} (${processedBy.role || 'pending'})`);
          }
        }
      } else if (transaction.transactionType === 'debit') {
        info.push('To: Manual Debit');
        if (transaction.processedBy) {
          const processedBy = typeof transaction.processedBy === 'object' 
            ? transaction.processedBy 
            : null;
          if (processedBy) {
            info.push(`By: ${processedBy.fullName || 'System'} (${processedBy.role || 'system'})`);
          }
        }
      }
    }
    
    return info.join(' | ');
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          My Payment History
        </Typography>
        <Tooltip 
          title="Search by: Transaction Type (Recharge/Debit/Refund/Bonus/Bid/Withdrawal), Amount, Wallet Type (Main/Bonus), Payment Mode (UPI/Wallet), Status, Note, Processed By (Name/Role), or Date" 
          arrow
          placement="top"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by type, amount, wallet, payment mode, status, note, processed by, or date..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
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
        {searchTerm && searchTerm === debouncedSearchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredTransactions.length} of {allTransactions.length} transactions
          </Typography>
        )}
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          {(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load payment history'}
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
          <TableContainer 
            component={Paper} 
            sx={{ 
              flex: 1,
              width: '100%',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 250px)',
              '&::-webkit-scrollbar': {
                height: '8px',
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            }}
          >
            <Table stickyHeader sx={{ minWidth: 1200, width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 180, whiteSpace: 'nowrap' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 150, whiteSpace: 'nowrap' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 120, whiteSpace: 'nowrap' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100, whiteSpace: 'nowrap' }}>Wallet</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100, whiteSpace: 'nowrap' }}>Payment Mode</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 200, whiteSpace: 'nowrap' }}>Credit/Debit Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 180, whiteSpace: 'nowrap' }}>Processed By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 120, whiteSpace: 'nowrap' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 300, maxWidth: { xs: 300, sm: 400, md: 500 } }}>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm ? 'No transactions found matching your search' : 'No transactions found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const creditDebitInfo = getCreditDebitInfo(transaction);
                    const bidDetails = getBidDetails(transaction);
                    const processedByInfo = getProcessedByInfo(transaction.processedBy);
                    
                    return (
                      <TableRow key={transaction._id} hover>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getTransactionTypeLabel(transaction.type, transaction.transactionType)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatAmount(transaction.amount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.walletType === 'main' ? 'Main' : 'Bonus'}
                            size="small"
                            color={transaction.walletType === 'main' ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{transaction.paymentMode}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={creditDebitInfo || '-'} arrow>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: { xs: 150, sm: 200, md: 250 },
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                cursor: 'help'
                              }}
                            >
                              {creditDebitInfo || '-'}
                            </Typography>
                          </Tooltip>
                          {bidDetails && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ 
                                display: 'block', 
                                mt: 0.5,
                                maxWidth: { xs: 150, sm: 200, md: 250 },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {bidDetails}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography 
                            variant="body2"
                            sx={{
                              maxWidth: { xs: 120, sm: 150, md: 180 },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {processedByInfo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.status ? (
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={getStatusColor(transaction.status)}
                              variant="filled"
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: { xs: 300, sm: 400, md: 500 } }}>
                          {transaction.note ? (
                            <Tooltip title={transaction.note} arrow placement="top" enterDelay={300}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  wordBreak: 'break-word',
                                  whiteSpace: 'normal',
                                  cursor: 'help',
                                  lineHeight: 1.5
                                }}
                              >
                                {transaction.note}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {searchTerm ? (
            <Box sx={{ py: 2, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'}
              </Typography>
            </Box>
          ) : (
            <TablePagination
              component="div"
              count={data?.pagination.totalTransactions ?? 0}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Rows per page:"
              sx={{
                width: '100%',
                overflowX: 'auto',
                '& .MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  gap: 1,
                },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

