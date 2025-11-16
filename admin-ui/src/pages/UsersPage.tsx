import { Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, DialogContentText, Chip, InputAdornment, Divider, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useBanUserMutation,
  useActivateUserMutation,
} from '../api/usersApi';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';
import { useAuth } from '../auth';
import { useState, useEffect } from 'react';

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'agent']),
  assignedAgent: z.string().optional(),
});

const editUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['user', 'agent']),
  assignedAgent: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

type User = import('../api/usersApi').User;

export default function UsersPage() {
  const [paginationModel, setPaginationModel] = useState<{ page: number; pageSize: number }>({
    page: 0,
    pageSize: 10,
  });

  const { data, isLoading, error } = useGetUsersQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  });

  const users = data?.users ?? [];
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [changeUserPassword] = useChangeUserPasswordMutation();
  const [banUser] = useBanUserMutation();
  const [activateUser] = useActivateUserMutation();

  // Get current user from auth context
  const { user: currentUser } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });
  const { register: editRegister, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = useForm<EditUserForm>({ resolver: zodResolver(editUserSchema) });
  const { register: passwordRegister, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting } } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  // Debug form state
  useEffect(() => {
    console.log('Edit form errors:', editErrors);
    console.log('Edit form is submitting:', isEditSubmitting);
  }, [editErrors, isEditSubmitting]);

  const handleAddUser = async (data: CreateUserForm) => {
    setAddError(null);
    try {
      // Handle empty email - convert to undefined if empty string
      const userData = {
        ...data,
        email: data.email === '' ? undefined : data.email
      };
      await createUser(userData).unwrap();
      setAddOpen(false);
      reset();
    } catch (e) {
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to add user';
      setAddError(apiError);
    }
  };

  function handleEdit(user: User) {
    if (!user) return;
    setEditUser(user);
    resetEdit({
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone,
      role: user.role as 'user' | 'agent',
      assignedAgent: user.assignedAgent,
    });
    setEditOpen(true);
  }

  function handleViewUser(user: User) {
    if (!user) return;
    setViewUser(user);
    setViewUserOpen(true);
  }

  const onEditSubmit = async (data: EditUserForm) => {
    setEditError(null);
    if (!editUser) return;
    console.log('Edit form submitted with data:', data);
    console.log('Edit user ID:', editUser._id);
    try {
      // Handle empty email - convert to undefined if empty string
      // Handle null assignedAgent - convert to undefined
      const userData = {
        ...data,
        email: data.email === '' ? undefined : data.email,
        assignedAgent: data.assignedAgent || undefined
      };
      await updateUser({ id: editUser._id, data: userData }).unwrap();
      setEditOpen(false);
    } catch (e: unknown) {
      console.error('Edit user error:', e);
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to update user';
      setEditError(apiError);
    }
  };



  async function handleDelete(id: string) {
    setDeleteUserId(id);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (deleteUserId) {
      await deleteUser(deleteUserId);
      setDeleteUserId(null);
      setDeleteConfirmOpen(false);
    }
  }

  function cancelDelete() {
    setDeleteUserId(null);
    setDeleteConfirmOpen(false);
  }

  function handlePasswordChange(user: User) {
    if (!user) return;
    setPasswordChangeUser(user);
    resetPassword();
    setPasswordChangeOpen(true);
  }

  const handlePasswordChangeSubmit = async (data: ChangePasswordForm) => {
    if (!passwordChangeUser) return;
    
    setPasswordChangeError(null);
    try {
      console.log('Attempting to change password for user:', {
        userId: passwordChangeUser._id,
        userEmail: passwordChangeUser.email,
        userRole: passwordChangeUser.role,
        newPasswordLength: data.newPassword.length
      });
      
      await changeUserPassword({ id: passwordChangeUser._id, newPassword: data.newPassword }).unwrap();
      setPasswordChangeOpen(false);
      setPasswordChangeUser(null);
      resetPassword();
    } catch (e) {
      console.error('Password change error:', e);
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to change password';
      setPasswordChangeError(apiError);
    }
  };


  // Determine page title based on user role
  const pageTitle = currentUser?.role === 'agent' ? 'My Users' : 'Users';

  // Determine if user can add new users
  const canAddUsers = currentUser?.role === 'admin' || currentUser?.role === 'agent';

  // Debug current user and canAddUsers
  useEffect(() => {
    console.log('Current user:', currentUser);
    console.log('Current user role:', currentUser?.role);
    console.log('Can add users:', canAddUsers);
    console.log('User role check:', {
      isAdmin: currentUser?.role === 'admin',
      isAgent: currentUser?.role === 'agent',
      canAdd: canAddUsers
    });
  }, [currentUser, canAddUsers]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user._id?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.status?.toLowerCase().includes(searchLower)
    );
  });

  const columns: GridColDef[] = [
    { 
      field: '_id',
      headerName: 'User ID',
      flex: 1.5,
      minWidth: 200,
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
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(params.row._id);
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
    { 
      field: 'fullName', 
      headerName: 'Full Name', 
      flex: 1.0,
      minWidth: 150,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.fullName} placement="top">
            <Typography variant="body2" sx={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'left',
              width: '100%'
            }}>
              {params.row.fullName}
            </Typography>
          </Tooltip>
        );
      }
    },
    { 
      field: 'phone', 
      headerName: 'Phone', 
      flex: 1.0,
      minWidth: 130,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.phone} placement="top">
            <Typography variant="body2" sx={{ textAlign: 'left', width: '100%' }}>
              {params.row.phone}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'status', 
      headerName: 'Status', 
      flex: 0.8,
      minWidth: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        const status = params.row.status;
        let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
        let label = 'Unknown';

        if (status === 'active') {
          color = 'success';
          label = 'Active';
        } else if (status === 'disabled') {
          color = 'error';
          label = 'Disabled';
        } else if (status === 'banned') {
          color = 'warning';
          label = 'Banned';
        }

        return (
          <Tooltip title={`Status: ${label}`} placement="top">
            <Chip label={label} color={color} size="small" />
          </Tooltip>
        );
      }
    },
    {
      field: 'role', 
      headerName: 'Role', 
      flex: 0.8,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.role} placement="top">
            <Chip
              label={params.row.role?.toUpperCase() || 'N/A'}
              color={params.row.role === 'admin' ? 'error' : params.row.role === 'agent' ? 'warning' : 'primary'}
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
    {
      field: 'view',
      headerName: 'View',
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title="View Full Details">
            <Button 
              size="small" 
              sx={{ minWidth: 'auto', p: 0.5 }} 
              onClick={() => handleViewUser(params.row)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{pageTitle}</Typography>
        <Box display="flex" gap={2}>
          {canAddUsers && (
            <Button variant="contained" color="primary" onClick={() => setAddOpen(true)}>
              Add User
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users by name, email, phone, user ID, role, or status..."
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
        {searchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredUsers.length} of {data?.pagination.totalResults ?? 0} users
          </Typography>
        )}
      </Box>
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load users'}</Alert> : (
        <Box sx={{ width: '100%', overflow: 'auto' }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row._id}
            autoHeight
            paginationMode="server"
            rowCount={data?.pagination.totalResults ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => setPaginationModel(model)}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
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
      )}
      {/* Add User Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add User</DialogTitle>
        <form onSubmit={handleSubmit(handleAddUser)}>
          <DialogContent>
            <TextField label="Full Name" fullWidth margin="normal" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} />
            <TextField label="Email (Optional)" fullWidth margin="normal" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
            <TextField label="Phone" fullWidth margin="normal" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
            <TextField label="Password" type="password" fullWidth margin="normal" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
            {currentUser?.role === 'admin' ? (
              <TextField select label="Role" fullWidth margin="normal" defaultValue="user" {...register('role')} error={!!errors.role} helperText={errors.role?.message}>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
              </TextField>
            ) : (
              <input type="hidden" {...register('role')} value="user" />
            )}
            {/* Optionally, add assignedAgent dropdown here */}
            {addError && <Alert severity="error" sx={{ mt: 2 }}>{addError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting || isCreating}>{isSubmitting || isCreating ? 'Adding...' : 'Add'}</Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Edit User Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogContent>
            <TextField label="Full Name" fullWidth margin="normal" {...editRegister('fullName')} error={!!editErrors.fullName} helperText={editErrors.fullName?.message} />
            <TextField label="Email (Optional)" fullWidth margin="normal" {...editRegister('email')} error={!!editErrors.email} helperText={editErrors.email?.message} />
            <TextField label="Phone" fullWidth margin="normal" {...editRegister('phone')} error={!!editErrors.phone} helperText={editErrors.phone?.message} />
            <TextField 
              select 
              label="Role" 
              fullWidth 
              margin="normal" 
              defaultValue={editUser?.role || 'user'} 
              {...editRegister('role')} 
              error={!!editErrors.role} 
              helperText={editErrors.role?.message}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="agent">Agent</MenuItem>
            </TextField>
            {/* Optionally, add assignedAgent dropdown here */}
            {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={isEditSubmitting}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this user? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Change Password Dialog */}
      <Dialog open={passwordChangeOpen} onClose={() => setPasswordChangeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change User Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit(handlePasswordChangeSubmit)}>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Change password for user: <strong>{passwordChangeUser?.fullName}</strong> ({passwordChangeUser?.email})
            </DialogContentText>
            <TextField 
              label="New Password" 
              type="password" 
              fullWidth 
              margin="normal" 
              {...passwordRegister('newPassword')} 
              error={!!passwordErrors.newPassword} 
              helperText={passwordErrors.newPassword?.message} 
            />
            {passwordChangeError && <Alert severity="error" sx={{ mt: 2 }}>{passwordChangeError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordChangeOpen(false)} disabled={isPasswordSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* View User Details Dialog */}
      <Dialog open={viewUserOpen} onClose={() => setViewUserOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="span">
              User Details
            </Typography>
            {viewUser && (
              <Chip 
                label={viewUser.role?.toUpperCase() || 'N/A'} 
                color={viewUser.role === 'admin' ? 'error' : viewUser.role === 'agent' ? 'warning' : 'primary'}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewUser && (
            <Box sx={{ mt: 2 }}>
              {/* Basic Information Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Full Name
                  </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {viewUser.fullName}
                  </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Phone Number
                  </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {viewUser.phone}
                  </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    User ID
                  </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {viewUser._id}
                  </Typography>
                </Box>
                
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Game ID
                  </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {viewUser.gameId}
                  </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Account Information Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Account Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Role
                  </Typography>
                    <Box sx={{ mt: 0.5 }}>
                  <Chip 
                        label={viewUser.role?.toUpperCase() || 'N/A'} 
                    color={viewUser.role === 'admin' ? 'error' : viewUser.role === 'agent' ? 'warning' : 'primary'}
                    variant="outlined"
                    size="small"
                        sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Status
                  </Typography>
                    <Box sx={{ mt: 0.5 }}>
                  <Chip 
                    label={viewUser.status === 'active' ? 'Active' : viewUser.status === 'disabled' ? 'Disabled' : 'Banned'} 
                    color={viewUser.status === 'active' ? 'success' : viewUser.status === 'disabled' ? 'error' : 'warning'}
                    variant="outlined"
                    size="small"
                  />
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Created At
                  </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 'N/A'}
                  </Typography>
              </Box>
              
              {viewUser.assignedAgent && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Assigned Agent
                  </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {viewUser.assignedAgent}
                  </Typography>
                </Box>
              )}
                </Box>
              </Box>
              
              {/* Payment Methods Section */}
              {viewUser.paymentMethods && viewUser.paymentMethods.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Payment Methods
                </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {viewUser.paymentMethods.map((payment) => (
                      <Box 
                        key={payment._id} 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: payment.isDefault ? 'primary.main' : 'divider',
                          borderRadius: 1,
                            backgroundColor: payment.isDefault ? 'action.hover' : 'transparent',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {payment.name}
                          </Typography>
                          {payment.isDefault && (
                            <Chip 
                              label="Default" 
                              color="primary" 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {payment.upiId}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Actions Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Actions
                  </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Tooltip title="Edit User">
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setViewUserOpen(false);
                        handleEdit(viewUser);
                      }}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  
                  {(currentUser?.role === 'admin' || (currentUser?.role === 'agent' && viewUser?.assignedAgent === currentUser?.id)) && (
                    <Tooltip title="Change Password">
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<LockIcon />}
                        onClick={() => {
                          setViewUserOpen(false);
                          handlePasswordChange(viewUser);
                        }}
                      >
                        Change Password
                      </Button>
                    </Tooltip>
                  )}

                  {viewUser.status === 'active' ? (
                    <Tooltip title="Ban User">
                      <Button 
                        variant="outlined" 
                        color="warning"
                        size="small" 
                        startIcon={<GavelIcon />}
                        onClick={() => {
                          setViewUserOpen(false);
                          banUser(viewUser._id);
                        }}
                      >
                        Ban
                      </Button>
                    </Tooltip>
                  ) : viewUser.status === 'disabled' ? (
                    <>
                      <Tooltip title="Activate User">
                        <Button 
                          variant="outlined" 
                          color="success"
                          size="small" 
                          startIcon={<CheckCircleIcon />}
                          onClick={() => {
                            setViewUserOpen(false);
                            activateUser(viewUser._id);
                          }}
                        >
                          Activate
                        </Button>
                      </Tooltip>
                      <Tooltip title="Ban User">
                        <Button 
                          variant="outlined" 
                          color="warning"
                          size="small" 
                          startIcon={<GavelIcon />}
                          onClick={() => {
                            setViewUserOpen(false);
                            banUser(viewUser._id);
                          }}
                        >
                          Ban
                        </Button>
                      </Tooltip>
                    </>
                  ) : viewUser.status === 'banned' ? (
                    <Tooltip title="Activate User">
                      <Button 
                        variant="outlined" 
                        color="success"
                        size="small" 
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                          setViewUserOpen(false);
                          activateUser(viewUser._id);
                        }}
                      >
                        Activate
                      </Button>
                    </Tooltip>
                  ) : null}

                  <Tooltip title="Delete User">
                    <Button 
                      variant="outlined" 
                      color="error"
                      size="small" 
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setViewUserOpen(false);
                        handleDelete(viewUser._id);
                      }}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewUserOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 