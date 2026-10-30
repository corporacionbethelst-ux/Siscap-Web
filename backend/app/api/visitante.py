from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.security import require_operativo
from app.crud import visitante as crud_visitante
from app.db.session import get_db
from app.models.models import Sesion, Usuario
from app.schemas.visitante import (
    EmpresaResponse,
    GerenciaResponse,
    MovimientoVisitanteCreate,
    MovimientoVisitanteResponse,
    VisitanteCreate,
    VisitanteResponse,
)

router = APIRouter(prefix="/api/visitantes", tags=["Visitantes"])


# ============================================================
# CATÁLOGO DE VISITANTES
# ============================================================
@router.get("/catalogo/buscar/{cedula}", response_model=VisitanteResponse)
def buscar_visitante(
    cedula: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    visitante = crud_visitante.get_visitante_by_cedula(db, cedula)
    if not visitante:
        raise HTTPException(status_code=404, detail="Visitante no encontrado")
    return visitante


@router.post("/catalogo", response_model=VisitanteResponse, status_code=status.HTTP_201_CREATED)
def crear_visitante(
    data: VisitanteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo)
):
    existente = crud_visitante.get_visitante_by_cedula(db, data.cedula)
    if existente:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    return crud_visitante.crear_visitante(db, data)


# ============================================================
# MOVIMIENTOS DE VISITANTES
# ============================================================
@router.post("/movimientos", response_model=MovimientoVisitanteResponse, status_code=status.HTTP_201_CREATED)
def registrar_movimiento(
    data: MovimientoVisitanteCreate,
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
        mov = crud_visitante.registrar_movimiento_visitante(db=db, sesion=sesion, data=data)
        return mov
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/movimientos/turno/{sesion_id}", response_model=list[MovimientoVisitanteResponse])
def listar_movimientos_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista SOLO los visitantes del punto de control activo."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return crud_visitante.listar_visitantes_del_punto(db, sesion)


@router.get("/movimientos/estadisticas/{sesion_id}")
def estadisticas_visitantes_turno(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve conteo SOLO del punto de control activo."""
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    entradas = crud_visitante.contar_visitantes_punto(db, sesion, "ENTRADA")
    salidas = crud_visitante.contar_visitantes_punto(db, sesion, "SALIDA")
    return {"entradas": entradas, "salidas": salidas}


# ============================================================
# CATÁLOGOS AUXILIARES
# ============================================================
@router.get("/tipos")
def listar_tipos_visitante(current_user: Usuario = Depends(get_current_user)):
    return crud_visitante.get_tipos_visitante()


@router.get("/gerencias", response_model=list[GerenciaResponse])
def listar_gerencias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return crud_visitante.get_gerencias(db)


@router.get("/empresas", response_model=list[EmpresaResponse])
def listar_empresas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return crud_visitante.get_empresas_foraneas(db)
