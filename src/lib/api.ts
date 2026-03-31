/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';

// Point to your Symfony backend. 
// If running in AI Studio, you might need to use the full URL of your backend if it's hosted.
// If running locally, http://localhost:8000 is the standard Symfony port.
const API_URL = import.meta.env.VITE_API_URL || 'https://api.donalgros-gestion.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user data on 401
      localStorage.removeItem('nexus_jwt_token');
      localStorage.removeItem('nexus_current_user');
      // Optionally redirect to login or reload
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
