import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface CommissionSettings {
  _id: string;
  adminCommissionPercentage: number;
  agentCommissionPercentage: number;
  winnerPayoutPercentage: number;
  minBetAmount: number;
  maxBetAmount: number;
  minUserRechargeAmount: number;
  minAgentRechargeAmount: number;
  updatedBy: string;
  updatedAt: string;
}

export interface UpdateCommissionSettingsRequest {
  adminCommissionPercentage: number;
  agentCommissionPercentage: number;
  winnerPayoutPercentage: number;
  minBetAmount: number;
  maxBetAmount: number;
  minUserRechargeAmount: number;
  minAgentRechargeAmount: number;
}

export interface CardPriceUpdate {
  cardName: string;
  newPrice: number;
  reason?: string;
}

export interface BulkPriceUpdate {
  updates: CardPriceUpdate[];
  reason?: string;
}

export interface CardPriceHistory {
  _id: string;
  cardName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  reason?: string;
  effectiveFrom: string;
}

export const commissionApi = createApi({
  reducerPath: 'commissionApi',
  baseQuery,
  tagTypes: ['CommissionSettings', 'CardPrice', 'Card'],
  endpoints: (builder) => ({
    // Commission Settings
    getCommissionSettings: builder.query<CommissionSettings, void>({
      query: () => 'commission/settings',
      providesTags: ['CommissionSettings'],
    }),
    updateCommissionSettings: builder.mutation<{
      message: string;
      settings: CommissionSettings;
    }, UpdateCommissionSettingsRequest>({
      query: (settings) => ({
        url: 'commission/settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['CommissionSettings'],
    }),
    getCommissionHistory: builder.query<CommissionSettings[], void>({
      query: () => 'commission/history',
      providesTags: ['CommissionSettings'],
    }),
    
    // Card Price Management
    updateCardPrice: builder.mutation<{
      message: string;
      card: {
        name: string;
        currentPrice: number;
        lastPriceUpdate: string;
      };
    }, { cardName: string; newPrice: number; reason?: string }>({
      query: ({ cardName, newPrice, reason }) => ({
        url: `commission/cards/${cardName}/price`,
        method: 'PUT',
        body: { newPrice, reason },
      }),
      invalidatesTags: ['CardPrice', 'Card'],
    }),
    
    bulkUpdateCardPrices: builder.mutation<{
      message: string;
      updatedCards: number;
      failedCards: string[];
    }, BulkPriceUpdate>({
      query: (bulkUpdate) => ({
        url: 'commission/cards/bulk-price',
        method: 'PUT',
        body: bulkUpdate,
      }),
      invalidatesTags: ['CardPrice', 'Card'],
    }),
    
    getCardPriceHistory: builder.query<CardPriceHistory[], string>({
      query: (cardName) => `commission/cards/${cardName}/price-history`,
      providesTags: ['CardPrice'],
    }),
    
    initializeCards: builder.mutation<{
      message: string;
      initializedCards: number;
    }, void>({
      query: () => ({
        url: 'commission/cards/initialize',
        method: 'POST',
      }),
      invalidatesTags: ['CardPrice', 'Card'],
    }),
  }),
});

export const {
  useGetCommissionSettingsQuery,
  useUpdateCommissionSettingsMutation,
  useGetCommissionHistoryQuery,
  useUpdateCardPriceMutation,
  useBulkUpdateCardPricesMutation,
  useGetCardPriceHistoryQuery,
  useInitializeCardsMutation,
} = commissionApi; 