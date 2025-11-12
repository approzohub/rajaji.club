/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck - Material-UI Grid component version compatibility issues
import React, { useState, useEffect } from 'react';
import { 
  useGetImagesQuery, 
  useUploadImageMutation, 
  useUpdateImageMutation, 
  useDeleteImageMutation,
  type Image,
  type ImageFilters 
} from '../api/imagesApi';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  FormControlLabel,
  Checkbox,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as EyeIcon,
  Upload as UploadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { getImageUrl } from '../utils/imageUrl';

export default function ImagesPage() {
  const [filters, setFilters] = useState<ImageFilters>({
    page: 1,
    limit: 20
  });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [uploadForm, setUploadForm] = useState({
    image: null as File | null,
    type: 'general' as 'banner' | 'hero' | 'general',
    altText: '',
    title: '',
    status: 'active' as 'active' | 'inactive',
    // Carousel fields
    isCarousel: false,
    carouselOrder: 0,
    carouselTitle: '',
    carouselDescription: '',
    // Banner specific fields
    bannerType: 'desktop' as 'desktop' | 'mobile',
    mobileText: ''
  });

  const { data: imagesData, isLoading, error } = useGetImagesQuery(filters);
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const [updateImage, { isLoading: updating }] = useUpdateImageMutation();
  const [deleteImage, { isLoading: deleting }] = useDeleteImageMutation();

  // Debug form state changes
  useEffect(() => {
    if (editModalOpen) {
      console.log('Edit modal form state:', uploadForm);
    }
  }, [uploadForm, editModalOpen]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.image) return;

    console.log('Upload form data:', {
      type: uploadForm.type,
      bannerType: uploadForm.bannerType,
      mobileText: uploadForm.mobileText,
      isCarousel: uploadForm.isCarousel
    });

    try {
      await uploadImage({
        image: uploadForm.image,
        type: uploadForm.type,
        altText: uploadForm.altText,
        title: uploadForm.title,
        status: uploadForm.status,
        // Carousel fields
        isCarousel: uploadForm.isCarousel,
        carouselOrder: uploadForm.isCarousel ? uploadForm.carouselOrder : undefined,
        carouselTitle: uploadForm.isCarousel ? uploadForm.carouselTitle : undefined,
        carouselDescription: uploadForm.isCarousel ? uploadForm.carouselDescription : undefined,
        // Banner specific fields
        bannerType: uploadForm.type === 'banner' ? uploadForm.bannerType : undefined,
        mobileText: uploadForm.type === 'banner' && uploadForm.bannerType === 'mobile' ? uploadForm.mobileText : undefined
      }).unwrap();
      
      setUploadModalOpen(false);
      setUploadForm({
        image: null,
        type: 'general',
        altText: '',
        title: '',
        status: 'active',
        isCarousel: false,
        carouselOrder: 0,
        carouselTitle: '',
        carouselDescription: '',
        bannerType: 'desktop',
        mobileText: ''
      });
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    try {
      const updateData = {
        type: uploadForm.type,
        altText: uploadForm.altText,
        title: uploadForm.title,
        status: uploadForm.status,
        isCarousel: uploadForm.isCarousel,
        carouselOrder: uploadForm.isCarousel ? uploadForm.carouselOrder : undefined,
        carouselTitle: uploadForm.isCarousel ? uploadForm.carouselTitle : undefined,
        carouselDescription: uploadForm.isCarousel ? uploadForm.carouselDescription : undefined,
        // Banner specific fields
        bannerType: uploadForm.type === 'banner' ? uploadForm.bannerType : undefined,
        mobileText: uploadForm.type === 'banner' && uploadForm.bannerType === 'mobile' ? uploadForm.mobileText : undefined
      };
      
      console.log('Frontend update data:', updateData);
      console.log('mobileText value:', updateData.mobileText);
      console.log('mobileText type:', typeof updateData.mobileText);
      
      await updateImage({
        id: selectedImage._id,
        data: updateData
      }).unwrap();
      
      setEditModalOpen(false);
      setSelectedImage(null);
    } catch (err) {
      console.error('Failed to update image:', err);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await deleteImage(imageId).unwrap();
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const openEditModal = (image: Image) => {
    console.log('Opening edit modal for image:', image);
    console.log('Banner fields:', {
      bannerType: image.bannerType,
      mobileText: image.mobileText,
      type: image.type
    });
    
    setSelectedImage(image);
    const formData = {
      image: null,
      type: image.type,
      altText: image.altText || '',
      title: image.title || '',
      status: image.status,
      isCarousel: image.isCarousel || false,
      carouselOrder: image.carouselOrder || 0,
      carouselTitle: image.carouselTitle || '',
      carouselDescription: image.carouselDescription || '',
      // Banner specific fields
      bannerType: image.bannerType || 'desktop',
      mobileText: image.mobileText || ''
    };
    
    console.log('Setting form data:', formData);
    setUploadForm(formData);
    setEditModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>Images Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload and manage banner, hero, and general images for your application.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setUploadModalOpen(true)}
        >
          Upload Image
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load images. Please try refreshing the page.
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <FilterIcon color="action" />
            <Typography variant="subtitle2" color="text.secondary">Filters:</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as 'banner' | 'hero' | 'general' | undefined, page: 1 })}
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="banner">Banner</MenuItem>
                <MenuItem value="hero">Hero</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as 'active' | 'inactive' | undefined, page: 1 })}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Images Grid */}
      <Grid container spacing={3}>
        {imagesData?.images.map((image) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={image._id}> {/* @ts-ignore */}
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={getImageUrl(image.url)}
                alt={image.altText || image.originalName}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" gap={1} mb={1}>
                  <Chip 
                    label={image.status} 
                    color={image.status === 'active' ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={image.type} 
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                  {image.isCarousel && (
                    <Chip 
                      label="Carousel" 
                      color="secondary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                <Typography variant="h6" noWrap gutterBottom>
                  {image.title || image.originalName}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatFileSize(image.size)} • {image.mimeType}
                </Typography>
                
                {image.altText && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Alt: {image.altText}
                  </Typography>
                )}
                
                {image.isCarousel && (
                  <Box mt={1} p={1} bgcolor="secondary.50" borderRadius={1}>
                    <Typography variant="caption" color="secondary.main">
                      Carousel Order: {image.carouselOrder || 'Auto'}
                    </Typography>
                    {image.carouselTitle && (
                      <Typography variant="caption" display="block" color="secondary.main">
                        Title: {image.carouselTitle}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
              
              <CardActions>
                <IconButton 
                  size="small" 
                  onClick={() => openEditModal(image)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDelete(image._id)}
                  color="error"
                  disabled={deleting}
                >
                  <DeleteIcon />
                </IconButton>
                <IconButton 
                  size="small"
                  component="a"
                  href={getImageUrl(image.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <EyeIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {imagesData?.pagination && imagesData.pagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              disabled={filters.page === 1}
            >
              Previous
            </Button>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
              Page {filters.page} of {imagesData.pagination.pages}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              disabled={filters.page === imagesData.pagination.pages}
            >
              Next
            </Button>
          </Box>
        </Box>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Image</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleUpload} sx={{ mt: 1 }}>
            <Grid container spacing={3}>
              {/* File Upload */}
              <Grid item xs={12}>
                <TextField
                  type="file"
                  inputProps={{ accept: 'image/*' }}
                  onChange={(e) => setUploadForm({ ...uploadForm, image: (e.target as HTMLInputElement).files?.[0] || null })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <UploadIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Basic Info */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as 'banner' | 'hero' | 'general' })}
                    label="Type"
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="banner">Banner</MenuItem>
                    <MenuItem value="hero">Hero</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Banner Type Selection - Only show when type is 'banner' */}
              {uploadForm.type === 'banner' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Banner Type</InputLabel>
                    <Select
                      value={uploadForm.bannerType}
                      onChange={(e) => setUploadForm({ ...uploadForm, bannerType: e.target.value as 'desktop' | 'mobile' })}
                      label="Banner Type"
                    >
                      <MenuItem value="desktop">Desktop</MenuItem>
                      <MenuItem value="mobile">Mobile</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={uploadForm.status}
                    onChange={(e) => setUploadForm({ ...uploadForm, status: e.target.value as any })}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  fullWidth
                  placeholder="Image title"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Alt Text"
                  value={uploadForm.altText}
                  onChange={(e) => setUploadForm({ ...uploadForm, altText: e.target.value })}
                  fullWidth
                  placeholder="Alt text for accessibility"
                />
              </Grid>

              {/* Mobile Text Field - Only show when banner type is 'mobile' */}
              {uploadForm.type === 'banner' && uploadForm.bannerType === 'mobile' && (
                <Grid item xs={12}>
                  <TextField
                    label="Mobile Text (HTML supported)"
                    value={uploadForm.mobileText}
                    onChange={(e) => setUploadForm({ ...uploadForm, mobileText: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Custom text for mobile banner (supports HTML)"
                    helperText="HTML tags like <span style='color: red;'>text</span> are supported. Leave empty to use default text."
                  />
                </Grid>
              )}

              {/* Carousel Section */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={uploadForm.isCarousel}
                      onChange={(e) => {
                        const isCarousel = e.target.checked;
                        setUploadForm({ 
                          ...uploadForm, 
                          isCarousel,
                          // Automatically set type to hero if carousel is enabled
                          type: isCarousel ? 'hero' : uploadForm.type
                        });
                      }}
                      disabled={uploadForm.type !== 'hero'}
                    />
                  }
                  label="Use as Carousel Image (Hero images only)"
                />
                {uploadForm.type !== 'hero' && uploadForm.isCarousel && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    Only hero images can be used as carousel images. Please change the type to "Hero" first.
                  </Typography>
                )}
              </Grid>

              {uploadForm.isCarousel && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Carousel Order"
                      type="number"
                      value={uploadForm.carouselOrder}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselOrder: parseInt(e.target.value) || 0 })}
                      fullWidth
                      placeholder="Order in carousel (0 = auto)"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Carousel Title"
                      value={uploadForm.carouselTitle}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselTitle: e.target.value })}
                      fullWidth
                      placeholder="Title to display on carousel"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Carousel Description"
                      value={uploadForm.carouselDescription}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselDescription: e.target.value })}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Description to display on carousel"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadModalOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={uploading || !uploadForm.image}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Image</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleUpdate} sx={{ mt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="banner">Banner</MenuItem>
                    <MenuItem value="hero">Hero</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Banner Type Selection - Only show when type is 'banner' */}
              {uploadForm.type === 'banner' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Banner Type</InputLabel>
                    <Select
                      value={uploadForm.bannerType}
                      onChange={(e) => setUploadForm({ ...uploadForm, bannerType: e.target.value as 'desktop' | 'mobile' })}
                      label="Banner Type"
                    >
                      <MenuItem value="desktop">Desktop</MenuItem>
                      <MenuItem value="mobile">Mobile</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={uploadForm.status}
                    onChange={(e) => setUploadForm({ ...uploadForm, status: e.target.value as any })}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  fullWidth
                  placeholder="Image title"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Alt Text"
                  value={uploadForm.altText}
                  onChange={(e) => setUploadForm({ ...uploadForm, altText: e.target.value })}
                  fullWidth
                  placeholder="Alt text for accessibility"
                />
              </Grid>

              {/* Mobile Text Field - Only show when banner type is 'mobile' */}
              {uploadForm.type === 'banner' && uploadForm.bannerType === 'mobile' && (
                <Grid item xs={12}>
                  <TextField
                    label="Mobile Text (HTML supported)"
                    value={uploadForm.mobileText}
                    onChange={(e) => setUploadForm({ ...uploadForm, mobileText: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Custom text for mobile banner (supports HTML)"
                    helperText="HTML tags like <span style='color: red;'>text</span> are supported. Leave empty to use default text."
                  />
                </Grid>
              )}

              {/* Carousel Section */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={uploadForm.isCarousel}
                      onChange={(e) => {
                        const isCarousel = e.target.checked;
                        setUploadForm({ 
                          ...uploadForm, 
                          isCarousel,
                          // Automatically set type to hero if carousel is enabled
                          type: isCarousel ? 'hero' : uploadForm.type
                        });
                      }}
                      disabled={uploadForm.type !== 'hero'}
                    />
                  }
                  label="Use as Carousel Image (Hero images only)"
                />
                {uploadForm.type !== 'hero' && uploadForm.isCarousel && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    Only hero images can be used as carousel images. Please change the type to "Hero" first.
                  </Typography>
                )}
              </Grid>

              {uploadForm.isCarousel && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Carousel Order"
                      type="number"
                      value={uploadForm.carouselOrder}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselOrder: parseInt(e.target.value) || 0 })}
                      fullWidth
                      placeholder="Order in carousel (0 = auto)"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Carousel Title"
                      value={uploadForm.carouselTitle}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselTitle: e.target.value })}
                      fullWidth
                      placeholder="Title to display on carousel"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Carousel Description"
                      value={uploadForm.carouselDescription}
                      onChange={(e) => setUploadForm({ ...uploadForm, carouselDescription: e.target.value })}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Description to display on carousel"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdate} 
            variant="contained"
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 