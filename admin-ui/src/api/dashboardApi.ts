import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface DashboardStats {
  userCount: number;
  agentCount: number;
  activeGames: number;
  totalPool: number;
  rechargeCount: number;
  txnCount: number;
  recentGames?: Array<{
    _id: string;
    timeWindow: string;
    totalPool: number;
    status: string;
  }>;
  recentBids?: Array<{
    _id: string;
    bidAmount: number;
    createdAt: string;
  }>;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => 'admin/stats',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
} = dashboardApi; 