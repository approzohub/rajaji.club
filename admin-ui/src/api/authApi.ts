import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  gameId: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  mustChangePassword?: boolean;
  user?: User;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, { identifier: string; password: string }>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    updatePassword: builder.mutation<{ message: string }, { newPassword: string }>({
      query: (body) => ({
        url: '/auth/update-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useUpdatePasswordMutation } = authApi; 