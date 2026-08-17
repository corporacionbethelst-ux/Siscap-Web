"""
Configuración y utilidades para el sistema de importación masiva.
Gestiona las carpetas de uploads: pending, processed, failed.
"""
import os
from pathlib import Path
from app.core.config import get_settings


def get_upload_paths() -> dict:
    """
    Retorna las rutas de las carpetas de uploads.
    Las crea si no existen.
    """
    settings = get_settings()
    base_dir = Path(settings.UPLOAD_DIR)
    
    paths = {
        "base": base_dir,
        "pending": base_dir / "pending",      # Archivos esperando procesamiento
        "processed": base_dir / "processed",  # Archivos procesados exitosamente
        "failed": base_dir / "failed",        # Archivos con errores
    }
    
    # Crear todas las carpetas si no existen
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    
    return paths


def get_max_upload_size_bytes() -> int:
    """Retorna el tamaño máximo de archivo en bytes."""
    settings = get_settings()
    return settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def get_allowed_extensions() -> list:
    """Retorna las extensiones de archivo permitidas."""
    return [".xlsx", ".xls", ".csv"]


def validate_file_extension(filename: str) -> tuple[bool, str]:
    """
    Valida que la extensión del archivo sea permitida.
    Retorna (es_valido, mensaje_error)
    """
    ext = Path(filename).suffix.lower()
    if ext not in get_allowed_extensions():
        return False, f"Extensión no permitida: {ext}. Use: {', '.join(get_allowed_extensions())}"
    return True, ""


def validate_file_size(size_bytes: int) -> tuple[bool, str]:
    """
    Valida que el tamaño del archivo no exceda el máximo permitido.
    Retorna (es_valido, mensaje_error)
    """
    max_size = get_max_upload_size_bytes()
    if size_bytes > max_size:
        max_mb = max_size / (1024 * 1024)
        actual_mb = size_bytes / (1024 * 1024)
        return False, f"Archivo muy grande: {actual_mb:.2f}MB. Máximo permitido: {max_mb:.0f}MB"
    return True, ""