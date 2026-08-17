import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('siscap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Función de Login
export const login = async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const response = await api.post('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  if (response.data.access_token) {
    localStorage.setItem('siscap_token', response.data.access_token);
  }
  
  return response.data;
};

// Función para obtener el usuario actual
export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Función para cerrar sesión
export const logout = () => {
  localStorage.removeItem('siscap_token');
};