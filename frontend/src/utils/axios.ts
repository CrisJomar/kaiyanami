/**
 * Pre-configured axios instance.
 *
 * Base URL comes from VITE_API_URL (set in your .env file).
 * The request interceptor automatically attaches the JWT stored in localStorage.
 *
 * Import this instead of bare axios in any component / context:
 *   import api from '../utils/axios';
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5001",
  withCredentials: true,
});

// Attach JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 responses clear the stale token so the user is sent back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default api;
