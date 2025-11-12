import axios from 'axios';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE,
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export async function loginApi(identifier: string, password: string) {
  const res = await api.post('/auth/login', { identifier, password });
  return res.data;
}

export async function validateTokenApi() {
  const res = await api.get('/auth/validate');
  return res.data;
}

export function logoutApi() {
  setAuthToken(null);
}

export const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
}); 