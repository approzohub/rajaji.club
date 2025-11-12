import { useState } from 'react';

interface AlertState {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    type: 'info'
  });

  const showSuccess = (message: string) => {
    setAlert({
      open: true,
      message,
      type: 'success'
    });
  };

  const showError = (message: string) => {
    setAlert({
      open: true,
      message,
      type: 'error'
    });
  };

  const showInfo = (message: string) => {
    setAlert({
      open: true,
      message,
      type: 'info'
    });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  return {
    alert,
    showSuccess,
    showError,
    showInfo,
    closeAlert
  };
} 