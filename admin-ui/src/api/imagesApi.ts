import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../api';

export interface Image {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  type: 'banner' | 'hero' | 'general';
  altText?: string;
  title?: string;
  status: 'active' | 'inactive';
  uploadedBy: string;
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageFilters {
  type?: 'banner' | 'hero' | 'general';
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface UploadImageData {
  image: File;
  type?: 'banner' | 'hero' | 'general';
  altText?: string;
  title?: string;
  status?: 'active' | 'inactive';
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
}

export interface UpdateImageData {
  type?: 'banner' | 'hero' | 'general';
  altText?: string;
  title?: string;
  status?: 'active' | 'inactive';
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
}

export const imagesApi = createApi({
  reducerPath: 'imagesApi',
  baseQuery,
  tagTypes: ['Images'],
  endpoints: (builder) => ({
    uploadImage: builder.mutation<Image, UploadImageData>({
      query: (data) => {
        const formData = new FormData();
        formData.append('image', data.image);
        if (data.type) formData.append('type', data.type);
        if (data.altText) formData.append('altText', data.altText);
        if (data.title) formData.append('title', data.title);
        if (data.status) formData.append('status', data.status);
        // Carousel fields
        if (data.isCarousel !== undefined) formData.append('isCarousel', data.isCarousel.toString());
        if (data.carouselOrder !== undefined) formData.append('carouselOrder', data.carouselOrder.toString());
        if (data.carouselTitle) formData.append('carouselTitle', data.carouselTitle);
        if (data.carouselDescription) formData.append('carouselDescription', data.carouselDescription);
        // Banner specific fields
        if (data.bannerType) formData.append('bannerType', data.bannerType);
        if (data.mobileText) formData.append('mobileText', data.mobileText);

        console.log('API upload data:', {
          type: data.type,
          bannerType: data.bannerType,
          mobileText: data.mobileText,
          isCarousel: data.isCarousel
        });

        return {
          url: '/images/upload',
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type, let the browser set it with boundary
          },
        };
      },
      invalidatesTags: ['Images'],
    }),
    getImages: builder.query<{ images: Image[]; pagination: { page: number; limit: number; total: number; pages: number } }, ImageFilters>({
      query: (filters) => ({
        url: '/images',
        method: 'GET',
        params: filters,
      }),
      providesTags: ['Images'],
    }),
    getPublicImages: builder.query<Image[], { type?: string }>({
      query: (params) => ({
        url: '/images/public',
        method: 'GET',
        params,
      }),
    }),
    getImageById: builder.query<Image, string>({
      query: (id) => `/images/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Images', id }],
    }),
    updateImage: builder.mutation<Image, { id: string; data: UpdateImageData }>({
      query: ({ id, data }) => {
        console.log('API update data:', {
          id,
          type: data.type,
          bannerType: data.bannerType,
          mobileText: data.mobileText,
          isCarousel: data.isCarousel
        });
        
        return {
          url: `/images/${id}`,
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Images', id },
        'Images',
      ],
    }),
    deleteImage: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/images/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Images'],
    }),
  }),
});

export const {
  useUploadImageMutation,
  useGetImagesQuery,
  useGetPublicImagesQuery,
  useGetImageByIdQuery,
  useUpdateImageMutation,
  useDeleteImageMutation,
} = imagesApi; 