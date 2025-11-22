import { useState, useEffect } from 'react';
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
  TextField, 
  IconButton,
  Chip,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useGetCMSPagesQuery, useCreateCMSPageMutation, useUpdateCMSPageMutation, useDeleteCMSPageMutation } from '../api/cmsApi';
import type { CMSPage } from '../api/cmsApi';

export default function CMSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term by 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: pages = [], isLoading, error } = useGetCMSPagesQuery({ search: debouncedSearchTerm || undefined });
  const [createCMSPage] = useCreateCMSPageMutation();
  const [updateCMSPage] = useUpdateCMSPageMutation();
  const [deleteCMSPage] = useDeleteCMSPageMutation();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: ''
  });

  const handleOpenDialog = (page?: CMSPage) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        title: page.title || '',
        slug: page.slug || '',
        content: page.content || ''
      });
    } else {
      setEditingPage(null);
      setFormData({ title: '', slug: '', content: '' });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingPage) {
        await updateCMSPage({ slug: editingPage.slug, data: formData });
      } else {
        await createCMSPage(formData);
      }
      setOpenDialog(false);
      setFormData({ title: '', slug: '', content: '' });
    } catch (error) {
      console.error('Error saving CMS page:', error);
    }
  };

  const handleDelete = async (slug: string) => {
    if (window.confirm('Are you sure you want to delete this CMS page?')) {
      try {
        await deleteCMSPage(slug);
      } catch (error) {
        console.error('Error deleting CMS page:', error);
      }
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'title', 
      headerName: 'Title', 
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {params.row.title}
        </Typography>
      )
    },
    { 
      field: 'slug', 
      headerName: 'Slug', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.row.slug} 
          color="primary" 
          variant="outlined"
          size="small"
        />
      )
    },
    { 
      field: 'content', 
      headerName: 'Content', 
      flex: 2,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {params.row.content?.substring(0, 100)}...
        </Typography>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Created At', 
      flex: 1,
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
            onClick={() => handleOpenDialog(params.row)}
            color="primary"
          >
            <Edit />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleDelete(params.row.slug)}
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">CMS Pages Management</Typography>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Tooltip 
          title="Search by: Page Title, Slug (URL), or Content" 
          arrow
          placement="top"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by title, slug, or content..."
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
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Page
        </Button>
      </Box>
      
      {isLoading ? <CircularProgress /> : error ? <Alert severity="error">{(error as unknown as { data?: { error?: string } }).data?.error || 'Failed to load CMS pages'}</Alert> : (
        <DataGrid
          rows={pages}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPage ? 'Edit CMS Page' : 'Create CMS Page'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              fullWidth
              required
              placeholder="e.g., about-us, terms-conditions"
            />
            
            <TextField
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              multiline
              rows={8}
              fullWidth
              required
              placeholder="Enter the page content here..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 