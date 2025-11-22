import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface CMSPage {
  _id: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
}

export const cmsApi = createApi({
  reducerPath: 'cmsApi',
  baseQuery,
  tagTypes: ['CMSPage'],
  endpoints: (builder) => ({
    getCMSPages: builder.query<CMSPage[], { search?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        const qs = searchParams.toString();
        return `cms${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['CMSPage'],
    }),
    createCMSPage: builder.mutation<CMSPage, Partial<CMSPage>>({
      query: (body) => ({
        url: 'cms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CMSPage'],
    }),
    updateCMSPage: builder.mutation<CMSPage, { slug: string; data: Partial<CMSPage> }>({
      query: ({ slug, data }) => ({
        url: `cms/${slug}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['CMSPage'],
    }),
    deleteCMSPage: builder.mutation<{ success: boolean }, string>({
      query: (slug) => ({
        url: `cms/${slug}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CMSPage'],
    }),
    getCMSPage: builder.query<CMSPage, string>({
      query: (slug) => `cms/${slug}`,
      providesTags: ['CMSPage'],
    }),
  }),
});

export const {
  useGetCMSPagesQuery,
  useCreateCMSPageMutation,
  useUpdateCMSPageMutation,
  useDeleteCMSPageMutation,
  useGetCMSPageQuery,
} = cmsApi; 