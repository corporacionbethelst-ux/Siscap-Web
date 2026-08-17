import { api } from './api';

export interface MovimientoPersonal {
  id: number;
  sesion_id: number;
  fecha: string;
  hora: string;
  cedula: string;
  nombres: string;
  empresa: string | null;
  tipo_movimiento: string;
  punto_control: string;
  grupo_trabajo: string;
  turno_codigo: string;
  observacion: string | null;
}

export interface EstadisticasTurno {
  entradas: number;
  salidas: number;
}

export const movimientoApi = {
  registrar: async (sesionId: number, cedula: string, tipo: 'ENTRADA' | 'SALIDA', observacion = '') => {
    const response = await api.post<MovimientoPersonal>(
      `/api/movimientos/personal?sesion_id=${sesionId}`,
      { cedula, tipo_movimiento: tipo, observacion }
    );
    return response.data;
  },

  listarDelTurno: async (sesionId: number) => {
    const response = await api.get<MovimientoPersonal[]>(`/api/movimientos/personal/turno/${sesionId}`);
    return response.data;
  },

  estadisticas: async (sesionId: number) => {
    const response = await api.get<EstadisticasTurno>(`/api/movimientos/personal/estadisticas/${sesionId}`);
    return response.data;
  }
};

// ============================================================
// MATERIALES
// ============================================================
export interface MovimientoMaterial {
  id: number;
  sesion_id: number;
  fecha: string;
  hora: string;
  cedula_conductor: string | null;
  nombres_conductor: string | null;
  descripcion: string;
  placa_vehiculo: string | null;
  condicion_vehiculo: string | null;
  quien_autoriza: string | null;
  destino: string | null;
  tipo_movimiento: string;
  punto_control: string;
  observacion: string | null;
}

export interface Vehiculo {
  id: number;
  placa: string;
  modelo: string | null;
  marca: string | null;
  color: string | null;
  condicion: string | null;
}

export const materialApi = {
  registrar: async (sesionId: number, data: {
    cedula_conductor?: string;
    descripcion: string;
    placa_vehiculo?: string;
    condicion_vehiculo?: string;
    quien_autoriza?: string;
    destino?: string;
    tipo_movimiento: 'ENTRADA' | 'SALIDA';
    observacion?: string;
  }) => {
    const response = await api.post<MovimientoMaterial>(
      `/api/movimientos/materiales?sesion_id=${sesionId}`,
      data
    );
    return response.data;
  },

  listarDelTurno: async (sesionId: number) => {
    const response = await api.get<MovimientoMaterial[]>(`/api/movimientos/materiales/turno/${sesionId}`);
    return response.data;
  },

  estadisticas: async (sesionId: number) => {
    const response = await api.get<EstadisticasTurno>(`/api/movimientos/materiales/estadisticas/${sesionId}`);
    return response.data;
  }
};

export const vehiculoApi = {
  buscar: async (placa: string) => {
    const response = await api.get<Vehiculo>(`/api/movimientos/vehiculos/buscar/${placa}`);
    return response.data;
  }
};