import { useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

export default function MainApp() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = useMemo(() => getTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <App />
      </Provider>
    </ThemeProvider>
  );
} 