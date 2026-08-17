import { api } from './api';

export interface HistorialItem {
  fecha: string;
  hora: string;
  tipo: string;
  cedula: string | null;
  nombre: string | null;
  empresa_gerencia: string | null;
  zona: string | null;
  punto_control: string | null;
  turno: string | null;
  grupo: string | null;
  semana: string | null;
  movimiento: string;
}

export interface HistorialFiltros {
  fecha_desde: string;
  fecha_hasta: string;
  tipo: string;
  movimiento: string;
  zona?: string;
  punto_control?: string;
  gerencia?: string;
  empresa?: string;
  busqueda?: string;
  grupo_trabajo?: string;
  numero_semana?: number;
}

export const historialApi = {
  buscar: async (filtros: HistorialFiltros) => {
    const response = await api.post<HistorialItem[]>('/api/historial/buscar', filtros);
    return response.data;
  },

  exportarCSV: async (filtros: HistorialFiltros) => {
    const response = await api.post('/api/historial/exportar-csv', filtros, {
      responseType: 'blob'
    });
    return response.data;
  }
};