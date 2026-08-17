import { api } from './api';

// ============================================================
// INTERFACES
// ============================================================
export interface TipoImportacion {
  codigo: string;
  nombre: string;
  descripcion: string;
  columna_clave: string;
  columnas_requeridas: string[];
}

export interface PreviewFila {
  numero_fila: number;
  datos: Record<string, string>;
  es_valida: boolean;
  error: string | null;
}

export interface PreviewResponse {
  archivo_id: string;
  nombre_archivo: string;
  tipo_importacion: string;
  total_filas: number;
  filas_preview: PreviewFila[];
  columnas_detectadas: string[];
  advertencias: string[];
}

export interface UploadResponse {
  archivo_id: string;
  nombre_archivo: string;
  tamano_kb: number;
  tipo_detectado: string | null;
  mensaje: string;
}

export interface ResultadoImportacion {
  log_id: number;
  nombre_archivo: string;
  tipo_importacion: string;
  total_filas: number;
  insertados: number;
  actualizados: number;
  omitidos: number;
  errores: number;
  estado: string;
  detalles_error: Array<{ fila: number; error: string; datos: Record<string, string> }>;
  tiempo_procesamiento_seg: number;
}

export interface ImportacionLog {
  id: number;
  nombre_archivo: string;
  tipo_importacion: string;
  usuario_nombre: string | null;
  fecha_importacion: string;
  total_filas: number;
  insertados: number;
  actualizados: number;
  omitidos: number;
  errores: number;
  estado: string;
  tamano_archivo_kb: number;
  tiempo_procesamiento_seg: number;
}

export interface DetalleImportacion extends ImportacionLog {
  detalles_error: Array<{ fila: number; error: string; datos: Record<string, string> }>;
}

// ============================================================
// API CALLS
// ============================================================
export const importacionApi = {
  // Subir archivo
  upload: async (archivo: File, tipoSugerido?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const params = tipoSugerido ? `?tipo_sugerido=${tipoSugerido}` : '';
    const response = await api.post<UploadResponse>(`/api/importacion/upload${params}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Preview del archivo
  preview: async (archivoId: string, tipo: string): Promise<PreviewResponse> => {
    const response = await api.get<PreviewResponse>(
      `/api/importacion/preview/${archivoId}?tipo=${tipo}`
    );
    return response.data;
  },

  // Procesar importación
  procesar: async (archivoId: string, tipo: string): Promise<ResultadoImportacion> => {
    const response = await api.post<ResultadoImportacion>(
      `/api/importacion/procesar/${archivoId}?tipo=${tipo}`
    );
    return response.data;
  },

  // Listar tipos disponibles
  listarTipos: async (): Promise<TipoImportacion[]> => {
    const response = await api.get<TipoImportacion[]>('/api/importacion/tipos');
    return response.data;
  },

  // Historial de importaciones
  historial: async (limit = 50): Promise<ImportacionLog[]> => {
    const response = await api.get<ImportacionLog[]>(`/api/importacion/historial?limit=${limit}`);
    return response.data;
  },

  // Detalle de una importación
  detalle: async (logId: number): Promise<DetalleImportacion> => {
    const response = await api.get<DetalleImportacion>(`/api/importacion/detalle/${logId}`);
    return response.data;
  }
};