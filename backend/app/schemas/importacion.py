"""
Schemas Pydantic para el sistema de importación masiva.
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class TipoImportacion(BaseModel):
    """Tipo de importación disponible."""
    codigo: str
    nombre: str
    descripcion: str
    columnas_requeridas: List[str]
    columna_clave: str  # Campo único para UPSERT (ej: cedula, placa)


class PreviewFila(BaseModel):
    """Una fila del preview del archivo."""
    numero_fila: int
    datos: dict
    es_valida: bool = True
    error: Optional[str] = None


class PreviewResponse(BaseModel):
    """Respuesta del preview de un archivo."""
    archivo_id: str
    nombre_archivo: str
    tipo_importacion: str
    total_filas: int
    filas_preview: List[PreviewFila]
    columnas_detectadas: List[str]
    advertencias: List[str] = []


class ResultadoImportacion(BaseModel):
    """Resultado de una importación procesada."""
    log_id: int
    nombre_archivo: str
    tipo_importacion: str
    total_filas: int
    insertados: int
    actualizados: int
    omitidos: int
    errores: int
    estado: str
    detalles_error: List[dict] = []
    tiempo_procesamiento_seg: int


class ImportacionLogResponse(BaseModel):
    """Respuesta con los datos de un log de importación."""
    id: int
    nombre_archivo: str
    tipo_importacion: str
    usuario_nombre: Optional[str] = None
    fecha_importacion: datetime
    total_filas: int
    insertados: int
    actualizados: int
    omitidos: int
    errores: int
    estado: str
    tamano_archivo_kb: int
    tiempo_procesamiento_seg: int

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    """Respuesta al subir un archivo."""
    archivo_id: str
    nombre_archivo: str
    tamano_kb: int
    tipo_detectado: Optional[str] = None
    mensaje: str