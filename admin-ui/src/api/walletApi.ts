import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Wallet {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  main: number;
  bonus: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  user: string;
  initiator: string;
  initiatorRole: string;
  amount: number;
  walletType: string;
  type: string;
  note?: string;
  createdAt: string;
}

export const walletApi = createApi({
  reducerPath: 'walletApi',
  baseQuery,
  tagTypes: ['Wallet'],
  endpoints: (builder) => ({
    getWallets: builder.query<Wallet[], void>({
      query: () => 'wallet',
      providesTags: ['Wallet'],
    }),
    getMyWallet: builder.query<Wallet, void>({
      query: () => 'wallet/my-wallet',
      providesTags: ['Wallet'],
    }),
    getUserTransactions: builder.query<WalletTransaction[], string>({
      query: (userId) => `wallet/transactions?userId=${userId}`,
      providesTags: ['Wallet'],
    }),
    rechargeWallet: builder.mutation<{ message: string; balance: Wallet }, { userId: string; amount: number; walletType: string; note?: string }>({
      query: (body) => ({
        url: 'wallet/recharge',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet'],
    }),
    manualDebit: builder.mutation<{ message: string; balance: Wallet }, { userId: string; amount: number; walletType: string; note?: string }>({
      query: (body) => ({
        url: 'wallet/manual-debit',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet'],
    }),
  }),
});

export const {
  useGetWalletsQuery,
  useGetMyWalletQuery,
  useGetUserTransactionsQuery,
  useRechargeWalletMutation,
  useManualDebitMutation,
} = walletApi; 