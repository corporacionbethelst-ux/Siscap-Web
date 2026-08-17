import { api } from './api';

export interface Usuario {
  id: number;
  usuario: string;
  nombre_completo: string;
  rol: string;
  estatus: string;
  fecha_creacion: string;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
  estatus: string;
}

export interface Sesion {
  id: number;
  usuario_nombre: string;
  punto_control: string | null;
  grupo_trabajo: string | null;
  turno_codigo: string | null;
  turno_nombre: string | null;
  dia_operativo: string | null;
  supervisor_nombre: string | null;
  centralista_nombre: string | null;
  hora_inicio: string;
  hora_fin: string | null;
  estado: string;
}

export interface Evento {
  id: number;
  sesion_id: number | null;
  usuario: string | null;
  tipo_evento: string;
  accion: string;
  detalle: string | null;
  fecha: string;
  hora: string;
}

export const adminApi = {
  // Usuarios
  listarUsuarios: async () => {
    const response = await api.get<Usuario[]>('/api/admin/usuarios');
    return response.data;
  },

  crearUsuario: async (data: { usuario: string; password: string; nombre_completo: string; rol: string }) => {
    const response = await api.post<Usuario>('/api/admin/usuarios', data);
    return response.data;
  },

  actualizarUsuario: async (id: number, data: { nombre_completo?: string; rol?: string; estatus?: string; password?: string }) => {
    const response = await api.put<Usuario>(`/api/admin/usuarios/${id}`, data);
    return response.data;
  },

  // Catálogos
  listarPuntosControl: async () => {
    const response = await api.get<CatalogoItem[]>('/api/admin/puntos-control');
    return response.data;
  },

  crearPuntoControl: async (nombre: string) => {
    const response = await api.post<CatalogoItem>('/api/admin/puntos-control', { nombre });
    return response.data;
  },

  listarGerencias: async () => {
    const response = await api.get<CatalogoItem[]>('/api/admin/gerencias');
    return response.data;
  },

  crearGerencia: async (nombre: string) => {
    const response = await api.post<CatalogoItem>('/api/admin/gerencias', { nombre });
    return response.data;
  },

  listarEmpresasForaneas: async () => {
    const response = await api.get<CatalogoItem[]>('/api/admin/empresas-foraneas');
    return response.data;
  },

  crearEmpresaForanea: async (nombre: string) => {
    const response = await api.post<CatalogoItem>('/api/admin/empresas-foraneas', { nombre });
    return response.data;
  },

  // Sesiones
  listarSesiones: async (limit = 100) => {
    const response = await api.get<Sesion[]>(`/api/admin/sesiones?limit=${limit}`);
    return response.data;
  },

  // Eventos
  listarEventos: async (limit = 200) => {
    const response = await api.get<Evento[]>(`/api/admin/eventos?limit=${limit}`);
    return response.data;
  }
};