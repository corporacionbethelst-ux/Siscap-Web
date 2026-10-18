import { api } from './api';

export interface Turno {
  id: number;
  codigo: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number;
  cruza_medianoche: boolean;
  descripcion: string | null;
}

export interface RangoTurno {
  rango_inicio: string;
  rango_fin: string;
  dia_operativo: string;
  turno_nombre: string;
}

export interface PersonaValidada {
  encontrado: boolean;
  cedula?: string;
  nombres?: string;
  empresa?: string;
  gerencia?: string;
}

export interface Sesion {
  id: number;
  usuario_nombre: string;
  zona: string | null;
  punto_control: string;
  grupo_trabajo: string;
  turno_codigo: string;
  turno_nombre: string;
  dia_operativo: string;
  rango_inicio: string;
  rango_fin: string;
  supervisor_nombre: string;
  centralista_nombre: string;
  hora_inicio: string;
  estado: string;
}

export const sesionApi = {
  listarTurnos: async () => {
    const response = await api.get<Turno[]>('/api/sesion/turnos');
    return response.data;
  },

  obtenerRango: async (turnoCodigo: string) => {
    const response = await api.get<RangoTurno>(`/api/sesion/rango/${turnoCodigo}`);
    return response.data;
  },

  validarPersona: async (cedula: string) => {
    const response = await api.get<PersonaValidada>(`/api/sesion/validar-persona/${cedula}`);
    return response.data;
  },

  abrirSesion: async (data: {
    zona: string;  // ← NUEVO
    punto_control: string;
    grupo_trabajo: string;
    turno_codigo: string;
    supervisor_cedula: string;
    centralista_cedula: string;
    forzar_zona?: boolean;  // ← NUEVO
    razon_forzado?: string; // ← NUEVO: obligatoria si forzar_zona=true (solo ADMIN)
  }) => {
    const response = await api.post<Sesion>('/api/sesion/apertura', data);
    return response.data;
  },

  cerrarSesion: async (sesionId: number, razon?: string) => {
    const response = await api.post(`/api/sesion/cerrar/${sesionId}`, { razon: razon ?? null });
    return response.data;
  },

  // ← NUEVO: liberación de puntos bloqueados (exclusivo ADMIN, razón obligatoria)
  liberarPunto: async (sesionId: number, razon: string) => {
    const response = await api.post('/api/sesion/liberar-punto', {
      sesion_id: sesionId,
      razon,
    });
    return response.data;
  },

  // ← NUEVO: listado de sesiones activas para ADMIN (gestión de liberación)
  listarActivasAdmin: async () => {
    const response = await api.get<Sesion[]>('/api/sesion/activas-admin');
    return response.data;
  },
};