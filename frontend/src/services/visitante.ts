import { api } from './api';

export interface Visitante {
  id: number;
  cedula: string;
  nombres: string;
  empresa: string | null;
  telefono: string | null;
  tipo_visitante: string;
  estatus: string;
}

export interface MovimientoVisitante {
  id: number;
  sesion_id: number;
  fecha: string;
  hora: string;
  cedula: string;
  nombres: string | null;
  empresa: string | null;
  tipo_visitante: string | null;
  placa_vehiculo: string | null;
  motivo: string | null;
  a_quien_visita: string | null;
  gerencia_destino: string | null;
  acompanantes: number;
  tipo_movimiento: string;
  punto_control: string;
  observacion: string | null;
}

export interface Gerencia {
  id: number;
  nombre: string;
}

export interface Empresa {
  id: number;
  nombre: string;
}

export const visitanteApi = {
  buscar: async (cedula: string) => {
    const response = await api.get<Visitante>(`/api/visitantes/catalogo/buscar/${cedula}`);
    return response.data;
  },

  crear: async (data: Omit<Visitante, 'id' | 'estatus'>) => {
    const response = await api.post<Visitante>('/api/visitantes/catalogo', data);
    return response.data;
  },

  registrarMovimiento: async (sesionId: number, data: {
    cedula: string;
    tipo_visitante: string;
    placa_vehiculo?: string;
    motivo?: string;
    a_quien_visita?: string;
    gerencia_destino?: string;
    acompanantes?: number;
    tipo_movimiento: 'ENTRADA' | 'SALIDA';
    observacion?: string;
  }) => {
    const response = await api.post<MovimientoVisitante>(
      `/api/visitantes/movimientos?sesion_id=${sesionId}`,
      data
    );
    return response.data;
  },

  listarDelTurno: async (sesionId: number) => {
    const response = await api.get<MovimientoVisitante[]>(`/api/visitantes/movimientos/turno/${sesionId}`);
    return response.data;
  },

  estadisticas: async (sesionId: number) => {
    const response = await api.get<{ entradas: number; salidas: number }>(
      `/api/visitantes/movimientos/estadisticas/${sesionId}`
    );
    return response.data;
  },

  listarTipos: async () => {
    const response = await api.get<string[]>('/api/visitantes/tipos');
    return response.data;
  },

  listarGerencias: async () => {
    const response = await api.get<Gerencia[]>('/api/visitantes/gerencias');
    return response.data;
  },

  listarEmpresas: async () => {
    const response = await api.get<Empresa[]>('/api/visitantes/empresas');
    return response.data;
  }
};