import { api } from './api';

export interface Zona {
  id: number;
  nombre: string;
  descripcion: string | null;
  estatus: string;
  fecha_registro: string;
  en_uso?: boolean;
  usuario_en_uso?: string | null;
  sesion_id?: number | null;
  total_puntos?: number;
}

export interface PuntoControl {
  id: number;
  nombre: string;
  estatus: string;
  zona_id: number | null;
  zona_nombre: string | null;
}

export interface PuntoControlConEstado extends PuntoControl {
  en_uso: boolean;
  usuario_en_uso: string | null;
  sesion_id: number | null;
}

export const zonaApi = {
  // ============================================================
  // ZONAS
  // ============================================================
  listarTodas: async () => {
    const response = await api.get<Zona[]>('/api/zonas/');
    return response.data;
  },

  listarDisponibles: async () => {
    const response = await api.get<Zona[]>('/api/zonas/disponibles');
    return response.data;
  },

  listarOcupadas: async () => {
    const response = await api.get<Zona[]>('/api/zonas/ocupadas');
    return response.data;
  },

  crear: async (nombre: string, descripcion?: string) => {
    const response = await api.post<Zona>('/api/zonas/', { nombre, descripcion });
    return response.data;
  },

  actualizar: async (id: number, data: { nombre?: string; descripcion?: string; estatus?: string }) => {
    const response = await api.put<Zona>(`/api/zonas/${id}`, data);
    return response.data;
  },

  // ============================================================
  // PUNTOS DE CONTROL
  // ============================================================
  listarPuntosControl: async (zonaId?: number) => {
    const params = zonaId !== undefined ? `?zona_id=${zonaId}` : '';
    const response = await api.get<PuntoControl[]>(`/api/zonas/puntos-control${params}`);
    return response.data;
  },

  listarPuntosConEstado: async () => {
    const response = await api.get<PuntoControlConEstado[]>('/api/zonas/puntos-control/estado');
    return response.data;
  },

  crearPuntoControl: async (nombre: string, zonaId?: number) => {
    const response = await api.post<PuntoControl>('/api/zonas/puntos-control', {
      nombre,
      zona_id: zonaId
    });
    return response.data;
  },

  actualizarPuntoControl: async (id: number, data: { nombre?: string; zona_id?: number | null; estatus?: string }) => {
    const response = await api.put<PuntoControl>(`/api/zonas/puntos-control/${id}`, data);
    return response.data;
  },

  // ============================================================
  // NUEVO: LIBERAR PUNTO DE CONTROL (SOLO ADMIN)
  // ============================================================
  liberarPuntoControl: async (puntoId: number, razon: string) => {
    const response = await api.post(`/api/zonas/puntos-control/${puntoId}/liberar`, { razon });
    return response.data;
  }
};