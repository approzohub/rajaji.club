import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface AppSettings {
  _id?: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail?: string;
  supportHours?: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  updatedBy: string;
  updatedAt?: Date;
  createdAt?: Date;
}

// Re-export for better compatibility
// export type { AppSettings };

export const appSettingsApi = createApi({
  reducerPath: 'appSettingsApi',
  baseQuery,
  tagTypes: ['AppSettings'],
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => '/app-settings',
      providesTags: ['AppSettings'],
    }),
    updateAppSettings: builder.mutation<AppSettings, Partial<AppSettings>>({
      query: (settings) => ({
        url: '/app-settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['AppSettings'],
    }),
    getPublicAppSettings: builder.query<AppSettings, void>({
      query: () => '/app-settings/public',
    }),
  }),
});

export const { 
  useGetAppSettingsQuery, 
  useUpdateAppSettingsMutation, 
  useGetPublicAppSettingsQuery 
} = appSettingsApi; 