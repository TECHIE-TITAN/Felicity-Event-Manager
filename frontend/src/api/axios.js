import axios from 'axios';

// In production (Vercel) set REACT_APP_API_URL to your deployed backend URL, e.g.
// https://felicity-backend.onrender.com/api
// In development the CRA proxy handles /api → http://localhost:5000
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('felicity_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('felicity_token');
      localStorage.removeItem('felicity_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
