import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { usersApi } from './api/usersApi';
import { walletApi } from './api/walletApi';
import { withdrawalsApi } from './api/withdrawalsApi';
import { gamesApi } from './api/gamesApi';
import { bidsApi } from './api/bidsApi';
import { notificationsApi } from './api/notificationsApi';
import { cmsApi } from './api/cmsApi';

import { authApi } from './api/authApi';
import { dashboardApi } from './api/dashboardApi';
import { commissionApi } from './api/commissionApi';
import { appSettingsApi } from './api/appSettingsApi';
import { imagesApi } from './api/imagesApi';
import { gameRulesApi } from './api/gameRulesApi';

export const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
    [walletApi.reducerPath]: walletApi.reducer,
    [withdrawalsApi.reducerPath]: withdrawalsApi.reducer,
    [gamesApi.reducerPath]: gamesApi.reducer,
    [bidsApi.reducerPath]: bidsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [cmsApi.reducerPath]: cmsApi.reducer,

    [authApi.reducerPath]: authApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [commissionApi.reducerPath]: commissionApi.reducer,
    [appSettingsApi.reducerPath]: appSettingsApi.reducer,
    [imagesApi.reducerPath]: imagesApi.reducer,
    [gameRulesApi.reducerPath]: gameRulesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      usersApi.middleware,
      walletApi.middleware,
      withdrawalsApi.middleware,
      gamesApi.middleware,
      bidsApi.middleware,
      notificationsApi.middleware,
      cmsApi.middleware,
  
      authApi.middleware,
      dashboardApi.middleware,
      commissionApi.middleware,
      appSettingsApi.middleware,
      imagesApi.middleware,
      gameRulesApi.middleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 