import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface GameRules {
  _id?: string;
  text: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export const gameRulesApi = createApi({
  reducerPath: 'gameRulesApi',
  baseQuery,
  tagTypes: ['GameRules'],
  endpoints: (builder) => ({
    getGameRules: builder.query<GameRules, void>({
      query: () => '/game-rules',
      providesTags: ['GameRules'],
    }),
    updateGameRules: builder.mutation<GameRules, { text: string }>({
      query: (data) => ({
        url: '/game-rules',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['GameRules'],
    }),
  }),
});

export const { 
  useGetGameRulesQuery, 
  useUpdateGameRulesMutation
} = gameRulesApi;

