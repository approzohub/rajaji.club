import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          paper: {
            width: '100%',
            maxWidth: 400,
          },
        },
      },
    },
  }); 