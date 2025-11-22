import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface PaymentMethod {
  _id: string;
  name: string;
  upiId: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  fullName: string;
  email?: string;
  phone: string;
  gameId: string;
  role: string;
  status: string;
  assignedAgent?: string;
  mustChangePassword?: boolean;
  createdBy?: string;
  createdAt?: string;
  paymentMethods?: PaymentMethod[];
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUsers: builder.query<{
      users: User[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalResults: number;
        pageSize: number;
      };
      counts: {
        total: number;
        active: number;
        disabled: number;
        banned: number;
      };
    }, { page?: number; limit?: number; search?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.search) searchParams.set('search', params.search);
        const qs = searchParams.toString();
        return `users${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({
        url: 'users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    disableUser: builder.mutation<User, string>({
      query: (id) => ({
        url: `users/${id}/disable`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    banUser: builder.mutation<User, string>({
      query: (id) => ({
        url: `users/${id}/ban`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    activateUser: builder.mutation<User, string>({
      query: (id) => ({
        url: `users/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    changeUserPassword: builder.mutation<{ message: string }, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: `users/${id}/change-password`,
        method: 'PATCH',
        body: { newPassword },
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useBanUserMutation,
  useActivateUserMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
} = usersApi; 