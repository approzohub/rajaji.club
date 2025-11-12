import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Button, 
  IconButton,
  Chip
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from '../api/notificationsApi';

export default function NotificationsPage() {
  const { data: notificationsData, isLoading, error } = useGetNotificationsQuery({ page: 1, limit: 100 });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  
  const notifications = notificationsData?.notifications || [];
  




  const columns: GridColDef[] = [
    { 
      field: 'type', 
      headerName: 'Type', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.row.type === 'withdrawal_request' ? 'Withdrawal Request' : params.row.type} 
          color="primary"
          variant="outlined"
          size="small"
        />
      )
    },
    { 
      field: 'title', 
      headerName: 'Title', 
      flex: 1.5,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {params.row.title}
        </Typography>
      )
    },
    { 
      field: 'message', 
      headerName: 'Message', 
      flex: 2,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {params.row.message}
        </Typography>
      )
    },
    { 
      field: 'userFullName', 
      headerName: 'User', 
      flex: 1,
      renderCell: (params) => params.row.userFullName || 'N/A'
    },
    { 
      field: 'isRead', 
      headerName: 'Status', 
      flex: 0.8,
      renderCell: (params) => (
        <Chip 
          label={params.row.isRead ? 'Read' : 'Unread'} 
          color={params.row.isRead ? 'default' : 'error'}
          size="small"
        />
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Created At', 
      flex: 1.5,
      renderCell: (params) => {
        const value = params.row.createdAt;
        if (!value) return 'No data';
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return value;
          }
          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        } catch {
          return value;
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <IconButton 
            size="small" 
            onClick={() => markAsRead(params.row._id)}
            color="primary"
            disabled={params.row.isRead}
          >
            <Edit />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Notifications Management</Typography>
        <Button 
          variant="outlined" 
          onClick={() => markAllAsRead()}
          disabled={!notifications.some(n => !n.isRead)}
        >
          Mark All as Read
        </Button>
      </Box>
      
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load notifications'}</Alert> : (
        <DataGrid
          rows={notifications}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
          }}
        />
      )}
    </Box>
  );
} 