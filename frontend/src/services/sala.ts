/**
 * Servicio SALA SITUACIONAL — Capa de Proyección de Solo Lectura
 * ------------------------------------------------------------------
 * Consume EXCLUSIVAMENTE endpoints GET de /api/sala-situacional/*.
 * Por diseño NO existen funciones de escritura (create/update/delete):
 * el módulo es 100% reportable. Cualquier intento de mutación debe
 * hacerse desde el módulo operativo Protección y Prevención con rol
 * OPERADOR/ADMIN correspondiente.
 */
import { api } from './api';

const BASE = '/api/sala-situacional';

// ==================== Tipos (contract del backend) ====================

export interface PanoramaGlobal {
  fecha: string;
  total_puntos: number;
  puntos_activos: number;
  puntos_inactivos: number;
  zonas: string[];
  turnos_abiertos_hoy: number;
  movimientos_hoy: { personal: number; materiales: number; visitantes: number };
  sesiones_activas: SesionActiva[];
}

export interface SesionActiva {
  id: number;
  punto_control: string;
  zona: string | null;
  turno: string | null;
  grupo_trabajo: string | null;
  usuario: string | null;
  hora_inicio: string | null;
}

export interface SesionReporte extends SesionActiva {
  dia_operativo: string | null;
  supervisor: string | null;
  centralista: string | null;
  hora_fin: string | null;
  estado: string;
}

export interface MovimientoUnificado {
  tipo: 'PERSONAL' | 'MATERIALES' | 'VISITANTES';
  fecha: string;
  hora: string | null;
  cedula: string | null;
  nombre: string | null;
  detalle: string | null;
  placa?: string | null;
  movimiento: string | null;
  punto_control: string | null;
  turno: string | null;
  observacion: string | null;
}

export interface PadronPersonal {
  cedula: string;
  nombres: string;
  empresa: string | null;
  gerencia: string | null;
}

export interface PadronVisitante {
  cedula: string;
  nombres: string;
  empresa: string | null;
  tipo: string | null;
}

export interface EventoAuditoria {
  id: number;
  sesion_id: number | null;
  usuario: string | null;
  tipo_evento: string;
  accion: string | null;
  detalle: string | null;
  fecha: string;
  hora: string | null;
}

export interface TurnoCatalogo {
  codigo: string;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

// ==================== Parámetros de consulta ====================

export interface FiltroSesiones {
  estado?: string;
  punto_control?: string;
  zona?: string;
  dias?: number;
  limite?: number;
}

export interface FiltroMovimientos {
  tipo?: 'PERSONAL' | 'MATERIALES' | 'VISITANTES' | '';
  punto_control?: string;
  cedula?: string;
  dias?: number;
  limite?: number;
}

export interface FiltroEventos {
  tipo_evento?: string;
  sesion_id?: number;
  dias?: number;
  limite?: number;
}

// ==================== Cliente (solo lectura) ====================

export const salaApi = {
  panorama: () => api.get<PanoramaGlobal>(`${BASE}/panorama`).then((r) => r.data),

  sesiones: (f: FiltroSesiones = {}) =>
    api.get<SesionReporte[]>(`${BASE}/sesiones`, { params: f }).then((r) => r.data),

  movimientos: (f: FiltroMovimientos = {}) =>
    api.get<MovimientoUnificado[]>(`${BASE}/movimientos`, { params: f }).then((r) => r.data),

  personal: (busqueda?: string, limite = 200) =>
    api
      .get<PadronPersonal[]>(`${BASE}/personal`, { params: { busqueda, limite } })
      .then((r) => r.data),

  visitantes: (f: { busqueda?: string; dias?: number; limite?: number } = {}) =>
    api.get<PadronVisitante[]>(`${BASE}/visitantes`, { params: f }).then((r) => r.data),

  eventos: (f: FiltroEventos = {}) =>
    api.get<EventoAuditoria[]>(`${BASE}/eventos`, { params: f }).then((r) => r.data),

  turnos: () => api.get<TurnoCatalogo[]>(`${BASE}/turnos`).then((r) => r.data),
};

/** Exportación CSV client-side (el módulo no escribe en backend). */
export function descargarCsv(nombre: string, filas: Record<string, unknown>[]): void {
  if (!filas.length) return;
  const headers = Object.keys(filas[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...filas.map((f) => headers.map((h) => esc(f[h])).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
