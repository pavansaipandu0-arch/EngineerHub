import axios from 'axios';
import { isValidApiResponse } from './utils/apiResponse.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((request) => {
  if (typeof FormData !== 'undefined' && request.data instanceof FormData) {
    delete request.headers['Content-Type'];
  }
  return request;
});

let refreshRequest;

api.interceptors.response.use(
  (response) => {
    if (
      !isValidApiResponse({
        status: response.status,
        contentType: response.headers['content-type'],
        responseType: response.config.responseType,
      })
    ) {
      const error = new Error(
        'The API returned a non-JSON response. Check VITE_API_URL and the hosting API route.',
      );
      error.code = 'API_RESPONSE_INVALID';
      return Promise.reject(error);
    }
    return response;
  },
  async (error) => {
    const request = error.config;
    const isAuthRequest = /\/auth\/(login|register|refresh|logout|email\/|password\/)/.test(
      request?.url || '',
    );
    if (error.response?.status !== 401 || !request || request._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      refreshRequest ||= api.post('/auth/refresh');
      await refreshRequest;
      return await api(request);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    } finally {
      refreshRequest = undefined;
    }
  },
);

export default api;
