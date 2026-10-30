from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import movimiento as crud_movimiento
from app.schemas.movimiento import (
    MovimientoPersonalCreate, MovimientoPersonalResponse,
    MovimientoMaterialCreate, MovimientoMaterialResponse,
    VehiculoResponse
)
from app.models.models import Sesion, Usuario
from app.api.auth import get_current_user
from app.core.security import require_operativo

router = APIRouter(prefix="/api/movimientos", tags=["Movimientos"])


# ============================================================
# PERSONAL
# ============================================================
@router.post("/personal", response_model=MovimientoPersonalResponse, status_code=status.HTTP_201_CREATED)
def registrar_movimiento(
    data: MovimientoPersonalCreate,
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo)
):
    if data.tipo_movimiento not in ["ENTRADA", "SALIDA"]:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

    sesion = db.query(Sesion).filter(Sesion.id == sesion_id, Sesion.estado == "ACTIVA").first()
    if not sesion:
        raise HTTPException(status_code=400, detail="No hay sesión activa")

    try:
        mov = crud_movimiento.registrar_movimiento_personal(
            db=db, sesion=sesion, cedula=data.cedula,
            tipo=data.tipo_movimiento, observacion=data.observacion or ""
        )
        return mov
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/personal/turno/{sesion_id}", response_model=list[MovimientoPersonalResponse])
def listar_movimientos_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista SOLO los movimientos del punto de control de la sesión activa."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return crud_movimiento.listar_movimientos_del_punto(db, sesion)


@router.get("/personal/estadisticas/{sesion_id}")
def estadisticas_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve conteo SOLO del punto de control activo."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    entradas = crud_movimiento.contar_movimientos_punto(db, sesion, "ENTRADA")
    salidas = crud_movimiento.contar_movimientos_punto(db, sesion, "SALIDA")
    return {"entradas": entradas, "salidas": salidas}


# ============================================================
# MATERIALES
# ============================================================
@router.post("/materiales", response_model=MovimientoMaterialResponse, status_code=status.HTTP_201_CREATED)
def registrar_material(
    data: MovimientoMaterialCreate,
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo)
):
    if data.tipo_movimiento not in ["ENTRADA", "SALIDA"]:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

    sesion = db.query(Sesion).filter(Sesion.id == sesion_id, Sesion.estado == "ACTIVA").first()
    if not sesion:
        raise HTTPException(status_code=400, detail="No hay sesión activa")

    try:
        mov = crud_movimiento.registrar_movimiento_material(db=db, sesion=sesion, data=data)
        return mov
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/materiales/turno/{sesion_id}", response_model=list[MovimientoMaterialResponse])
def listar_materiales_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista SOLO los materiales del punto de control activo."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return crud_movimiento.listar_materiales_del_punto(db, sesion)


@router.get("/materiales/estadisticas/{sesion_id}")
def estadisticas_materiales_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve conteo SOLO del punto de control activo."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    entradas = crud_movimiento.contar_materiales_punto(db, sesion, "ENTRADA")
    salidas = crud_movimiento.contar_materiales_punto(db, sesion, "SALIDA")
    return {"entradas": entradas, "salidas": salidas}


# ============================================================
# VEHÍCULOS
# ============================================================
@router.get("/vehiculos/buscar/{placa}", response_model=VehiculoResponse)
def buscar_vehiculo(
    placa: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    vehiculo = crud_movimiento.get_vehiculo_by_placa(db, placa)
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehiculo


@router.get("/vehiculos", response_model=list[VehiculoResponse])
def listar_vehiculos(
    search: str = "",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return crud_movimiento.listar_vehiculos(db, search=search, limit=limit)