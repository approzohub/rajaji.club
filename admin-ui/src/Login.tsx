import { Box, Typography, TextField, Button, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './auth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const schema = z.object({
  identifier: z.string().min(1, 'Email, Phone, or Game ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.identifier, data.password);
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 
                          (err as { message?: string })?.message || 'Login failed';
      
      // Check if user role is not allowed
      if (errorMessage.includes('role') || errorMessage.includes('access')) {
        setError('Access denied. Only admin and agent roles can access this dashboard.');
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        bgcolor: (theme) => theme.palette.background.default,
        margin: 0,
        padding: 0,
        width: '100vw',
      }}
    >
      <Box
        maxWidth={360}
        width="90%"
        p={3}
        boxShadow={2}
        borderRadius={2}
        sx={{
          bgcolor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,
          margin: 'auto',
        }}
      >
        <Typography variant="h5" mb={2} textAlign="center" fontWeight="bold">Rajaji Dashboard</Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Email or Phone"
            placeholder="Enter your email or phone"
            fullWidth
            margin="normal"
            variant="outlined"
            {...register('identifier')}
            error={!!errors.identifier}
            helperText={errors.identifier?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            variant="outlined"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Box>
    </Box>
  );
} 