import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds (matches backend timeout)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for future: auth tokens, logging)
apiClient.interceptors.request.use(
  (config) => {
    // Can add auth tokens, logging here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle HTTP errors
    const status = error.response.status;
    const errorMessage = (error.response.data as any)?.error || error.message;

    if (status === 404) {
      return Promise.reject(new Error('Resource not found'));
    } else if (status === 429) {
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    } else if (status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    return Promise.reject(new Error(errorMessage || 'An unexpected error occurred'));
  }
);

export default apiClient;

