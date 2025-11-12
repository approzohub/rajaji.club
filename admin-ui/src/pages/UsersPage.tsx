import { Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, DialogContentText, Chip, InputAdornment } from '@mui/material';
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
import { useUpdatePasswordMutation } from '../api/authApi';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  const { data: users = [], isLoading, error } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [changeUserPassword] = useChangeUserPasswordMutation();
  const [banUser] = useBanUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [updateMyPassword] = useUpdatePasswordMutation();

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
  const [myPasswordChangeOpen, setMyPasswordChangeOpen] = useState(false);
  const [myPasswordChangeError, setMyPasswordChangeError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });
  const { register: editRegister, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = useForm<EditUserForm>({ resolver: zodResolver(editUserSchema) });
  const { register: passwordRegister, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting } } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });
  const { register: myPasswordRegister, handleSubmit: handleMyPasswordSubmit, reset: resetMyPassword, formState: { errors: myPasswordErrors, isSubmitting: isMyPasswordSubmitting } } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

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

  const handleMyPasswordChangeSubmit = async (data: ChangePasswordForm) => {
    setMyPasswordChangeError(null);
    try {
      await updateMyPassword({ newPassword: data.newPassword }).unwrap();
      setMyPasswordChangeOpen(false);
      resetMyPassword();
    } catch (e) {
      console.error('My password change error:', e);
      const apiError = (e as { data?: { error?: string }; error?: string })?.data?.error || (e as { error?: string })?.error || 'Failed to change password';
      setMyPasswordChangeError(apiError);
    }
  };

  // Determine page title based on user role
  const getPageTitle = () => {
    if (currentUser?.role === 'agent') {
      return 'My Users';
    }
    return 'Users';
  };

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
      field: 'fullName', 
      headerName: 'Full Name', 
      flex: 0.8,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.fullName} placement="top">
            <Typography variant="body2" sx={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
              width: '100%'
            }}>
              {params.row.fullName}
            </Typography>
          </Tooltip>
        );
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1.0,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: { row?: { email?: string } }) => {
        if (!params || !params.row) return 'No email';
        const email = params.row.email || 'No email';
        return (
          <Tooltip title={email} placement="top">
            <Typography variant="body2" sx={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
              width: '100%'
            }}>
              {email}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: '_id',
      headerName: 'User ID',
      flex: 2.0,
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row._id} placement="top">
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              <Chip
                label={params.row._id.substring(0, 20) + '...'}
                color="primary"
                variant="outlined"
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  minWidth: 'fit-content',
                  height: '32px',
                  justifyContent: 'center',
                  '& .MuiChip-label': {
                    px: 2,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    fontSize: '0.8rem'
                  }
                }}
              />
            </Box>
          </Tooltip>
        );
      }
    },
    { 
      field: 'phone', 
      headerName: 'Phone', 
      flex: 0.8,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.phone} placement="top">
            <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
              {params.row.phone}
            </Typography>
          </Tooltip>
        );
      }
    },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Tooltip title={params.row.role} placement="top">
            <Chip
              label={params.row.role}
              color={params.row.role === 'admin' ? 'error' : params.row.role === 'agent' ? 'warning' : 'primary'}
              variant="outlined"
              size="small"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            />
          </Tooltip>
        );
      }
    },
    {
      field: 'status', 
      headerName: 'Status', 
      flex: 0.7,
      minWidth: 100,
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
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1.3,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: { row?: { createdAt?: string; updatedAt?: string } }) => {
        const row = params?.row;
        const dateValue = row?.createdAt || row?.updatedAt;
        if (!dateValue) return '';
        
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '';
        
        const formattedDate = d.toLocaleString('en-IN', {
          year: 'numeric', month: 'short', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        return (
          <Tooltip title={formattedDate} placement="top">
            <Typography variant="body2" sx={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
              width: '100%'
            }}>
              {formattedDate}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 160,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        if (!params || !params.row) return null;
        const row = params.row;
        
        return (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Tooltip title="View Details"><Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => handleViewUser(row)}><VisibilityIcon fontSize="small" /></Button></Tooltip>
            <Tooltip title="Edit"><Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => handleEdit(row)}><EditIcon fontSize="small" /></Button></Tooltip>
            {(currentUser?.role === 'admin' || (currentUser?.role === 'agent' && row?.assignedAgent === currentUser?.id)) && (
              <Tooltip title="Change Password"><Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => handlePasswordChange(row)}><LockIcon fontSize="small" /></Button></Tooltip>
            )}

            {row.status === 'active' ? (
              // Only Ban (no Disable)
              <Tooltip title="Ban"><Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => banUser(row._id)}><GavelIcon fontSize="small" /></Button></Tooltip>
            ) : row.status === 'disabled' ? (
              // Show Activate and Ban
              <>
                <Tooltip title="Activate"><Button size="small" color="success" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => activateUser(row._id)}><CheckCircleIcon fontSize="small" /></Button></Tooltip>
                <Tooltip title="Ban"><Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => banUser(row._id)}><GavelIcon fontSize="small" /></Button></Tooltip>
              </>
            ) : row.status === 'banned' ? (
              // Allow Activate when banned
              <Tooltip title="Activate"><Button size="small" color="success" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => activateUser(row._id)}><CheckCircleIcon fontSize="small" /></Button></Tooltip>
            ) : null}

            <Tooltip title="Delete"><Button size="small" color="error" sx={{ minWidth: 'auto', p: 0.5 }} onClick={() => handleDelete(row._id)}><DeleteIcon fontSize="small" /></Button></Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">{getPageTitle()}</Typography>
        <Box display="flex" gap={2}>
          {currentUser?.role === 'admin' && (
            <Button variant="outlined" color="primary" onClick={() => setMyPasswordChangeOpen(true)}>
              Change My Password
            </Button>
          )}
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
            Showing {filteredUsers.length} of {users.length} users
          </Typography>
        )}
      </Box>
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load users'}</Alert> : (
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': {
              minWidth: '1200px', // Force minimum width
            },
            '& .MuiDataGrid-main': {
              overflow: 'auto', // Enable horizontal scroll
            },
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            },
            '& .MuiDataGrid-columnHeader': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }
          }}
        />
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
      {/* Change My Password Dialog */}
      <Dialog open={myPasswordChangeOpen} onClose={() => setMyPasswordChangeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change My Password</DialogTitle>
        <form onSubmit={handleMyPasswordSubmit(handleMyPasswordChangeSubmit)}>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Change password for: <strong>{currentUser?.fullName}</strong> ({currentUser?.email})
            </DialogContentText>
            <TextField 
              label="New Password" 
              type="password" 
              fullWidth 
              margin="normal" 
              {...myPasswordRegister('newPassword')} 
              error={!!myPasswordErrors.newPassword} 
              helperText={myPasswordErrors.newPassword?.message} 
            />
            {myPasswordChangeError && <Alert severity="error" sx={{ mt: 2 }}>{myPasswordChangeError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMyPasswordChangeOpen(false)} disabled={isMyPasswordSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isMyPasswordSubmitting}>
              {isMyPasswordSubmitting ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* View User Details Dialog */}
      <Dialog open={viewUserOpen} onClose={() => setViewUserOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {viewUser && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Full Name
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewUser.fullName}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Email
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewUser.email || 'No email provided'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Phone Number
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewUser.phone}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    User ID
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                    {viewUser._id}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Game ID
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewUser.gameId}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Role
                  </Typography>
                  <Chip 
                    label={viewUser.role} 
                    color={viewUser.role === 'admin' ? 'error' : viewUser.role === 'agent' ? 'warning' : 'primary'}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    label={viewUser.status === 'active' ? 'Active' : viewUser.status === 'disabled' ? 'Disabled' : 'Banned'} 
                    color={viewUser.status === 'active' ? 'success' : viewUser.status === 'disabled' ? 'error' : 'warning'}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Created At
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
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
              </Box>
              
              {viewUser.assignedAgent && (
                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Assigned Agent
                  </Typography>
                  <Typography variant="body1">
                    {viewUser.assignedAgent}
                  </Typography>
                </Box>
              )}
              
              {/* Payment Methods Section */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Payment Methods
                </Typography>
                {viewUser.paymentMethods && viewUser.paymentMethods.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {viewUser.paymentMethods.map((payment) => (
                      <Box 
                        key={payment._id} 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: payment.isDefault ? 'primary.main' : 'divider',
                          borderRadius: 1,
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
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No payment methods added
                  </Typography>
                )}
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