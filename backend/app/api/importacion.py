"""
Endpoints REST para el sistema de importación masiva.
"""
import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import ImportacionLog, Usuario
from app.api.auth import get_current_user
from app.core.upload_config import (
    get_upload_paths, validate_file_extension, validate_file_size
)
from app.utils.excel_parser import parse_excel_file, detectar_tipo_por_columnas
from app.core.import_engine import (
    mapear_columnas, validar_columnas_requeridas,
    procesar_importacion, obtener_tipos_disponibles, TIPOS_IMPORTACION
)
from app.schemas.importacion import (
    UploadResponse, PreviewResponse, PreviewFila,
    ResultadoImportacion, ImportacionLogResponse, TipoImportacion
)

router = APIRouter(prefix="/api/importacion", tags=["Importación Masiva"])

# Almacenamiento temporal de archivos subidos (en memoria, por archivo_id)
_archivos_pendientes = {}


def verify_admin(current_user: Usuario = Depends(get_current_user)):
    """Solo administradores pueden importar datos."""
    if current_user.rol != "ADMIN":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return current_user


# ============================================================
# ENDPOINT: Subir archivo
# ============================================================
@router.post("/upload", response_model=UploadResponse)
async def upload_archivo(
    archivo: UploadFile = File(...),
    tipo_sugerido: str = Query(None, description="Tipo de importación sugerido"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """
    Sube un archivo Excel/CSV al servidor para su posterior procesamiento.
    """
    # Validar extensión
    es_valido, error_msg = validate_file_extension(archivo.filename)
    if not es_valido:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Leer contenido para validar tamaño
    contenido = await archivo.read()
    tamano_bytes = len(contenido)
    
    es_valido, error_msg = validate_file_size(tamano_bytes)
    if not es_valido:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Generar ID único para el archivo
    archivo_id = str(uuid.uuid4())
    
    # Guardar en carpeta pending
    paths = get_upload_paths()
    nombre_seguro = f"{archivo_id}_{archivo.filename}"
    ruta_destino = paths["pending"] / nombre_seguro
    
    with open(ruta_destino, "wb") as f:
        f.write(contenido)
    
    # Detectar tipo automáticamente si no se especificó
    tipo_detectado = tipo_sugerido
    if not tipo_detectado:
        try:
            columnas, _, _ = parse_excel_file(str(ruta_destino), max_preview=0)
            tipo_detectado = detectar_tipo_por_columnas(columnas)
        except Exception:
            tipo_detectado = None
    
    # Registrar en memoria para el preview
    _archivos_pendientes[archivo_id] = {
        "ruta": str(ruta_destino),
        "nombre_original": archivo.filename,
        "tamano_kb": tamano_bytes // 1024,
        "tipo_detectado": tipo_detectado
    }
    
    return UploadResponse(
        archivo_id=archivo_id,
        nombre_archivo=archivo.filename,
        tamano_kb=tamano_bytes // 1024,
        tipo_detectado=tipo_detectado,
        mensaje="Archivo subido correctamente. Use /preview para ver el contenido."
    )


# ============================================================
# ENDPOINT: Preview del archivo
# ============================================================
@router.get("/preview/{archivo_id}", response_model=PreviewResponse)
def preview_archivo(
    archivo_id: str,
    tipo: str = Query(..., description="Tipo de importación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """
    Muestra las primeras 10 filas del archivo para que el usuario confirme.
    """
    if archivo_id not in _archivos_pendientes:
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expirado")
    
    if tipo not in TIPOS_IMPORTACION:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {tipo}")
    
    info = _archivos_pendientes[archivo_id]
    
    try:
        columnas, filas_preview, total_filas = parse_excel_file(info["ruta"], max_preview=10)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer archivo: {str(e)}")
    
    # Mapear columnas
    mapeo = mapear_columnas(columnas, tipo)
    es_valido, errores = validar_columnas_requeridas(mapeo, tipo)
    
    if not es_valido:
        raise HTTPException(status_code=400, detail={
            "mensaje": "El archivo no tiene las columnas requeridas",
            "errores": errores,
            "columnas_detectadas": columnas
        })
    
    # Convertir filas a PreviewFila
    filas_preview_obj = []
    for idx, fila in enumerate(filas_preview, start=2):
        # Validar fila
        fila_valida = True
        error_fila = None
        campo_clave = TIPOS_IMPORTACION[tipo]["columna_clave"]
        col_clave_archivo = mapeo.get(campo_clave)
        
        if col_clave_archivo and not fila.get(col_clave_archivo, "").strip():
            fila_valida = False
            error_fila = f"Campo clave '{campo_clave}' vacío"
        
        filas_preview_obj.append(PreviewFila(
            numero_fila=idx,
            datos=fila,
            es_valida=fila_valida,
            error=error_fila
        ))
    
    advertencias = []
    if total_filas > 1000:
        advertencias.append(f"Archivo grande: {total_filas} filas. El procesamiento puede tardar.")
    
    return PreviewResponse(
        archivo_id=archivo_id,
        nombre_archivo=info["nombre_original"],
        tipo_importacion=tipo,
        total_filas=total_filas,
        filas_preview=filas_preview_obj,
        columnas_detectadas=columnas,
        advertencias=advertencias
    )


# ============================================================
# ENDPOINT: Procesar importación
# ============================================================
@router.post("/procesar/{archivo_id}", response_model=ResultadoImportacion)
def procesar_archivo(
    archivo_id: str,
    tipo: str = Query(..., description="Tipo de importación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """
    Confirma y procesa el archivo, ejecutando UPSERT en la base de datos.
    """
    import traceback
    import shutil
    import json
    from pathlib import Path

    if archivo_id not in _archivos_pendientes:
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expirado")
    
    if tipo not in TIPOS_IMPORTACION:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {tipo}")
    
    info = _archivos_pendientes[archivo_id]
    ruta_archivo = info["ruta"]
    
    try:
        # Leer todas las filas
        columnas, filas, total_filas = parse_excel_file(ruta_archivo, max_preview=0)
        
        # Mapear columnas
        mapeo = mapear_columnas(columnas, tipo)
        es_valido, errores = validar_columnas_requeridas(mapeo, tipo)
        
        if not es_valido:
            raise HTTPException(status_code=400, detail={
                "mensaje": "Columnas requeridas no encontradas",
                "errores": errores
            })
        
        # Procesar importación
        log = procesar_importacion(
            db=db,
            tipo=tipo,
            filas=filas,
            mapeo=mapeo,
            usuario_id=current_user.id,
            usuario_nombre=current_user.nombre_completo,
            nombre_archivo=info["nombre_original"],
            ruta_archivo=ruta_archivo,
            tamano_kb=info["tamano_kb"]
        )
        
        # Mover archivo según resultado
        paths = get_upload_paths()
        destino = paths["processed"] if log.estado in ["COMPLETADO", "PARCIAL"] else paths["failed"]
        shutil.move(ruta_archivo, str(destino / Path(ruta_archivo).name))
        
        # Limpiar de memoria
        del _archivos_pendientes[archivo_id]
        
        return ResultadoImportacion(
            log_id=log.id,
            nombre_archivo=log.nombre_archivo,
            tipo_importacion=log.tipo_importacion,
            total_filas=log.total_filas,
            insertados=log.insertados,
            actualizados=log.actualizados,
            omitidos=log.omitidos,
            errores=log.errores,
            estado=log.estado,
            detalles_error=json.loads(log.detalles_error) if log.detalles_error else [],
            tiempo_procesamiento_seg=log.tiempo_procesamiento_seg
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Capturar el error real y mostrarlo en los logs de Docker
        error_trace = traceback.format_exc()
        print(f"❌ ERROR CRÍTICO EN IMPORTACIÓN:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Error interno al procesar: {str(e)}")


# ============================================================
# ENDPOINT: Historial de importaciones
# ============================================================
@router.get("/historial", response_model=list[ImportacionLogResponse])
def listar_historial(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """Lista las importaciones realizadas, más recientes primero."""
    logs = db.query(ImportacionLog).order_by(ImportacionLog.fecha_importacion.desc()).limit(limit).all()
    return logs


# ============================================================
# ENDPOINT: Detalle de una importación
# ============================================================
@router.get("/detalle/{log_id}")
def obtener_detalle(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """Obtiene el detalle completo de una importación, incluyendo errores."""
    log = db.query(ImportacionLog).filter(ImportacionLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    
    detalles = __import__("json").loads(log.detalles_error) if log.detalles_error else []
    
    return {
        "id": log.id,
        "nombre_archivo": log.nombre_archivo,
        "tipo_importacion": log.tipo_importacion,
        "usuario_nombre": log.usuario_nombre,
        "fecha_importacion": log.fecha_importacion.isoformat() if log.fecha_importacion else None,
        "total_filas": log.total_filas,
        "insertados": log.insertados,
        "actualizados": log.actualizados,
        "omitidos": log.omitidos,
        "errores": log.errores,
        "estado": log.estado,
        "detalles_error": detalles,
        "tiempo_procesamiento_seg": log.tiempo_procesamiento_seg
    }


# ============================================================
# ENDPOINT: Tipos disponibles
# ============================================================
@router.get("/tipos", response_model=list[TipoImportacion])
def listar_tipos(current_user: Usuario = Depends(verify_admin)):
    """Lista todos los tipos de importación disponibles."""
    return obtener_tipos_disponibles()