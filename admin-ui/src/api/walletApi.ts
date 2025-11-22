import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Wallet {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
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
    getWallets: builder.query<{
      wallets: Wallet[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalResults: number;
        pageSize: number;
      };
      counts: {
        total: number;
        agents: number;
        users: number;
      };
    }, { page?: number; limit?: number; search?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.search) searchParams.set('search', params.search);
        const qs = searchParams.toString();
        return `wallet${qs ? `?${qs}` : ''}`;
      },
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
    getPaymentHistory: builder.query<{
      transactions: Array<{
        _id: string;
        type: 'wallet_transaction' | 'bid' | 'withdrawal';
        amount: number;
        transactionType: string;
        walletType: 'main' | 'bonus';
        paymentMode: 'UPI' | 'Wallet';
        note?: string;
        status?: string;
        processedBy?: {
          _id: string;
          fullName: string;
          email: string;
          gameId: string;
          role: string;
        };
        createdAt: string;
        updatedAt?: string;
        gameId?: string;
        gameStatus?: string;
        cardName?: string;
        cardType?: string;
        cardSuit?: string;
        quantity?: number;
        cardPrice?: number;
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalTransactions: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }, { page?: number; limit?: number } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const qs = searchParams.toString();
        return `wallet/payment-history${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Wallet'],
    }),
  }),
});

export const {
  useGetWalletsQuery,
  useGetMyWalletQuery,
  useGetUserTransactionsQuery,
  useRechargeWalletMutation,
  useManualDebitMutation,
  useGetPaymentHistoryQuery,
} = walletApi; 