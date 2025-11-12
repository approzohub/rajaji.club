import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface CardBid {
  cardId: string;
  quantity: number;
}

export interface Bid {
  _id: string;
  user: string | {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    gameId?: string;
  };
  game: string | {
    _id: string;
    timeWindow: string;
    status: string;
    totalPool: number;
  };
  // Card-based bidding fields
  cardId: string; // Card ID that was bid on
  cardName: string; // Card name for display purposes
  cardType: string; // J, Q, K, A, 10
  cardSuit: string; // clubs, spades, hearts, diamonds
  quantity: number; // How many cards bought
  totalAmount: number; // quantity * cardPrice
  cardPrice: number; // Price per card at time of bid
  // Legacy support
  bidNumber?: number;
  bidAmount?: number;
  createdAt: string;
}

export interface PlaceBidResponse {
  message: string;
  bids: Bid[];
  totalAmount: number;
  newBalance: number;
  totalPool: number;
}

export interface CardAnalytics {
  cardId: string;
  cardName: string;
  cardType: string;
  cardSuit: string;
  symbol: string;
  totalBids: number;
  totalAmount: number;
  uniqueBidders: number;
  averageBidAmount: number;
  popularityRank: number;
}

export const bidsApi = createApi({
  reducerPath: 'bidsApi',
  baseQuery,
  tagTypes: ['Bid'],
  endpoints: (builder) => ({
    // Multiple card-based bidding
    placeCardBids: builder.mutation<PlaceBidResponse, { gameId: string; bids: CardBid[] }>({
      query: (body) => ({
        url: 'bids',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bid'],
    }),
    
    // Single card bidding (for backward compatibility)
    placeCardBid: builder.mutation<PlaceBidResponse, { gameId: string; cardId: string; quantity: number }>({
      query: (body) => ({
        url: 'bids',
        method: 'POST',
        body: {
          gameId: body.gameId,
          bids: [{ cardId: body.cardId, quantity: body.quantity }]
        },
      }),
      invalidatesTags: ['Bid'],
    }),
    
    // Legacy number-based bidding
    placeBid: builder.mutation<Bid, { gameId: string; bidAmount: number }>({
      query: (body) => ({
        url: 'bids',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bid'],
    }),
    
    getUserBids: builder.query<Bid[], void>({
      query: () => 'bids',
      providesTags: ['Bid'],
    }),
    
    getGameBids: builder.query<Bid[], string>({
      query: (gameId) => `bids/game/${gameId}`,
      providesTags: ['Bid'],
    }),
    
    // Card analytics for games
    getGameCardAnalytics: builder.query<CardAnalytics[], string>({
      query: (gameId) => `bids/game/${gameId}/analytics`,
      providesTags: ['Bid'],
    }),
  }),
});

export const {
  usePlaceCardBidsMutation,
  usePlaceCardBidMutation,
  usePlaceBidMutation,
  useGetUserBidsQuery,
  useGetGameBidsQuery,
  useGetGameCardAnalyticsQuery,
} = bidsApi; 