import axios from 'axios';

// Set the base URL
axios.defaults.baseURL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001';

// Add any global configurations here
axios.interceptors.request.use((config) => {
  // Add token from local storage if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axios;