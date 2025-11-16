import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Withdrawal {
  _id: string;
  user: string | {
    _id: string;
    fullName: string;
    gameId: string;
    email: string;
  };
  amount: number;
  walletType: 'main'; // Only main wallet withdrawals allowed
  note?: string;
  status: string;
  paymentMethod?: {
    _id: string;
    name: string;
    upiId: string;
  };
  processedBy?: string | {
    _id: string;
    fullName: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

export const withdrawalsApi = createApi({
  reducerPath: 'withdrawalsApi',
  baseQuery,
  tagTypes: ['Withdrawal'],
  endpoints: (builder) => ({
    getWithdrawals: builder.query<{
      withdrawals: Withdrawal[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalResults: number;
        pageSize: number;
      };
      counts: {
        total: number;
        pending: number;
      };
    }, { page?: number; limit?: number } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const qs = searchParams.toString();
        return `wallet/withdrawals${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Withdrawal'],
    }),
    requestWithdrawal: builder.mutation<Withdrawal, { amount: number; walletType: 'main'; note?: string }>({
      query: (body) => ({
        url: '/withdraw',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Withdrawal'],
    }),
    approveWithdrawal: builder.mutation<Withdrawal, { id: string; note?: string }>({
      query: ({ id, note }) => ({
        url: `wallet/withdrawals/${id}/approve`,
        method: 'PATCH',
        body: { note: note || '' },
      }),
      invalidatesTags: ['Withdrawal'],
    }),
    rejectWithdrawal: builder.mutation<Withdrawal, { id: string; note?: string }>({
      query: ({ id, note }) => ({
        url: `wallet/withdrawals/${id}/reject`,
        method: 'PATCH',
        body: { note: note || '' },
      }),
      invalidatesTags: ['Withdrawal'],
    }),

  }),
});

export const {
  useGetWithdrawalsQuery,
  useRequestWithdrawalMutation,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
} = withdrawalsApi; 