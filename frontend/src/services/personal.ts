import { api } from './api';

export interface Personal {
  id: number;
  cedula: string;
  nombres: string;
  empresa: string | null;
  gerencia: string | null;
  tipo: string;
  estatus: string;
  fecha_registro: string;
}

export const personalApi = {
  listar: async (search = '') => {
    const response = await api.get<Personal[]>('/api/personal/', {
      params: { search, limit: 100 }
    });
    return response.data;
  },
  
  buscar: async (cedula: string) => {
    const response = await api.get<Personal>(`/api/personal/buscar/${cedula}`);
    return response.data;
  },

  crear: async (data: Omit<Personal, 'id' | 'fecha_registro'>) => {
    const response = await api.post<Personal>('/api/personal/', data);
    return response.data;
  }
};