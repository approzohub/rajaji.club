import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress
} from '@mui/material';
import { 
  Rule as RuleIcon, 
  Save as SaveIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useGetGameRulesQuery, useUpdateGameRulesMutation } from '../api/gameRulesApi';

export default function GameRulesPage() {
  const [text, setText] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: gameRules, isLoading, error: fetchError } = useGetGameRulesQuery();
  const [updateGameRules, { isLoading: saving }] = useUpdateGameRulesMutation();

  // Update local state when data is fetched
  useEffect(() => {
    if (gameRules) {
      setText(gameRules.text || '');
    }
  }, [gameRules]);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      if ('data' in fetchError && typeof fetchError.data === 'object' && fetchError.data !== null) {
        const errorData = fetchError.data as { error?: string };
        setError(errorData.error || 'Failed to load game rules');
      } else if ('message' in fetchError) {
        setError(fetchError.message as string);
      } else {
        setError('Failed to load game rules');
      }
    } else {
      setError(null);
    }
  }, [fetchError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!text.trim()) {
      setError('Game rules text cannot be empty');
      return;
    }

    try {
      await updateGameRules({ text: text.trim() }).unwrap();
      setSuccess('Game rules updated successfully!');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to update game rules:', err);
      if (err?.data?.error) {
        setError(err.data.error);
      } else if (err?.data?.details) {
        setError(JSON.stringify(err.data.details));
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Failed to update game rules. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Box display="flex" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <RuleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Game Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and update game rules that will be displayed to users
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          icon={<CheckCircleIcon />}
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Game Rules Text"
            multiline
            rows={15}
            fullWidth
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder="Enter game rules here..."
            variant="outlined"
            error={!!error && !fetchError}
            helperText={error && !fetchError ? error : `${text.length} characters`}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'monospace',
                fontSize: '0.95rem',
              }
            }}
          />
        </Box>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={saving || isLoading}
            sx={{ minWidth: 150 }}
          >
            {saving ? 'Saving...' : 'Save Rules'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

