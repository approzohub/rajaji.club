import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Notification {
  _id: string;
  type: 'withdrawal_request';
  title: string;
  message: string;
  userId: string;
  userFullName: string;
  withdrawalId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery,
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, { page?: number; limit?: number; search?: string }>({
      query: ({ page = 1, limit = 20, search }) => {
        const searchParams = new URLSearchParams();
        searchParams.set('page', String(page));
        searchParams.set('limit', String(limit));
        if (search) searchParams.set('search', search);
        return `notifications?${searchParams.toString()}`;
      },
      providesTags: ['Notification'],
    }),
    markAsRead: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: 'notifications/mark-all-read',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationsApi; 