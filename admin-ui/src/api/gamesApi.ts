import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Card {
  _id: string;
  name: string;
  card: string; // J, Q, K, A, 10
  symbol: string; // ♣, ♠, ♥, ♦
  suit: string; // clubs, spades, hearts, diamonds
  basePrice: number;
  currentPrice: number;
  isActive: boolean;
  totalBids: number;
  totalAmount: number;
  displayOrder: number; // Order in which cards appear on game page
  lastPriceUpdate: string;
  updatedBy?: string;
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

export interface Game {
  _id: string;
  timeWindow: string;
  status: 'open' | 'waiting_result' | 'result_declared';
  totalPool: number;
  totalPayout?: number; // Total amount paid to winners
  winningCard?: string; // Card name that won
  startTime: string;
  biddingEndTime: string; // 25 minutes from start
  gameEndTime: string; // 30 minutes from start
  resultDeclaredAt?: string;
  declaredBy?: string;
  isRandomResult: boolean;
  createdAt: string;
}

export interface CardAnalytics {
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

export const gamesApi = createApi({
  reducerPath: 'gamesApi',
  baseQuery,
  tagTypes: ['Game', 'Card'],
  endpoints: (builder) => ({
    // Game Management
    getGames: builder.query<{
      games: Game[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalResults: number;
        pageSize: number;
      };
      counts: {
        totalGames: number;
        openGames: number;
        waitingResultGames: number;
        declaredGames: number;
      };
    }, { status?: string; page?: number; limit?: number; search?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.search) searchParams.set('search', params.search);
        const qs = searchParams.toString();
        return `games${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Game'],
    }),
    getGame: builder.query<Game, string>({
      query: (id) => `games/${id}`,
      providesTags: ['Game'],
    }),
    
    // Card Management
    getCards: builder.query<Card[], void>({
      query: () => 'games/cards',
      providesTags: ['Card'],
    }),
    getCardsByType: builder.query<Card[], string>({
      query: (cardType) => `games/cards/type/${cardType}`,
      providesTags: ['Card'],
    }),
    getCardsBySuit: builder.query<Card[], string>({
      query: (suit) => `games/cards/suit/${suit}`,
      providesTags: ['Card'],
    }),
    toggleCardActiveStatus: builder.mutation<{
      message: string;
      card: Card;
    }, string>({
      query: (cardId) => ({
        url: `games/cards/${cardId}/toggle-active`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Card'],
      // Optimistically update the cache
      async onQueryStarted(cardId, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedCard } = await queryFulfilled;
          console.log('Optimistic update with:', updatedCard.card);
          
          // Update the cache with the new card data
          dispatch(
            gamesApi.util.updateQueryData('getCards', undefined, (draft) => {
              if (draft) {
                const cardIndex = draft.findIndex(card => card._id === cardId);
                if (cardIndex !== -1) {
                  console.log('Updating card at index:', cardIndex, 'from', draft[cardIndex].isActive, 'to', updatedCard.card.isActive);
                  draft[cardIndex] = updatedCard.card;
                }
              }
            })
          );
          
          // Also update the type and suit queries
          dispatch(
            gamesApi.util.updateQueryData('getCardsByType', 'all', (draft) => {
              if (draft) {
                const cardIndex = draft.findIndex(card => card._id === cardId);
                if (cardIndex !== -1) {
                  draft[cardIndex] = updatedCard.card;
                }
              }
            })
          );
          
          dispatch(
            gamesApi.util.updateQueryData('getCardsBySuit', 'all', (draft) => {
              if (draft) {
                const cardIndex = draft.findIndex(card => card._id === cardId);
                if (cardIndex !== -1) {
                  draft[cardIndex] = updatedCard.card;
                }
              }
            })
          );
        } catch (error) {
          console.error('Optimistic update failed:', error);
        }
      },
    }),
    
    // Winner Declaration
    declareWinner: builder.mutation<{
      message: string;
      game: Game;
      winners: {
        count: number;
        payoutPerWinner: number;
        remainingAmount: number;
        winnerDetails: Array<{
          userId: string;
          userName: string;
          bidAmount: number;
          payoutAmount: number;
        }>;
      };
    }, { gameId: string; winningCard: string; isRandom: boolean }>({
      query: ({ gameId, winningCard, isRandom }) => ({
        url: `games/${gameId}/declare-winner`,
        method: 'POST',
        body: { winningCard, isRandom },
      }),
      invalidatesTags: ['Game'],
    }),
    
    // Legacy support for number-based games
    overrideResult: builder.mutation<{ message: string; override: Record<string, unknown> }, { gameId: string; winnerNumber: number; manualWinners: string[]; note?: string; payoutMultiplier?: number }>({
      query: (body) => ({
        url: 'games/override',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Game'],
    }),
    declareWinnerLegacy: builder.mutation<{
      message: string;
      game: Game;
      winners: {
        count: number;
        payoutPerWinner: number;
        remainingAmount: number;
        winnerDetails: Array<{
          userId: string;
          userName: string;
          bidAmount: number;
          payoutAmount: number;
        }>;
      };
    }, { gameId: string; winnerNumber: number }>({
      query: ({ gameId, winnerNumber }) => ({
        url: `games/${gameId}/declare-winner`,
        method: 'POST',
        body: { winnerNumber },
      }),
      invalidatesTags: ['Game'],
    }),

    // Card Display Order Management
    updateCardDisplayOrder: builder.mutation<{
      message: string;
      result: {
        card: Card;
        oldOrder: number;
        newOrder: number;
      };
    }, { cardName: string; newOrder: number }>({
      query: ({ cardName, newOrder }) => ({
        url: `games/cards/${cardName}/display-order`,
        method: 'PATCH',
        body: { newOrder },
      }),
      invalidatesTags: ['Card'],
    }),

    bulkUpdateDisplayOrders: builder.mutation<{
      message: string;
      results: Array<{
        success: boolean;
        cardName: string;
        result?: {
          card: Card;
          oldOrder: number;
          newOrder: number;
        };
        error?: string;
      }>;
    }, { updates: Array<{ cardName: string; newOrder: number }> }>({
      query: ({ updates }) => ({
        url: 'games/cards/bulk-display-order',
        method: 'PATCH',
        body: { updates },
      }),
      invalidatesTags: ['Card'],
    }),

    // Get Game Winners
    getGameWinners: builder.query<{
      gameId: string;
      winningCard: string;
      totalWinners: number;
      totalWinningAmount: number;
      winners: Array<{
        userId: string;
        userName: string;
        userEmail: string;
        bidAmount: number;
        payoutAmount: number;
        cardName: string;
        cardType: string;
        cardSuit: string;
        quantity: number;
      }>;
    }, string>({
      query: (gameId) => `games/${gameId}/winners`,
      providesTags: (_, __, gameId) => [
        { type: 'Game', id: gameId },
      ],
    }),
  }),
});

export const {
  useGetGamesQuery,
  useGetGameQuery,
  useGetCardsQuery,
  useGetCardsByTypeQuery,
  useGetCardsBySuitQuery,
  useToggleCardActiveStatusMutation,
  useUpdateCardDisplayOrderMutation,
  useBulkUpdateDisplayOrdersMutation,
  useDeclareWinnerMutation,
  useOverrideResultMutation,
  useDeclareWinnerLegacyMutation,
  useGetGameWinnersQuery,
} = gamesApi; 