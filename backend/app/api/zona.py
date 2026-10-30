from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.security import verify_admin  # dependencia canónica
from app.crud import zona as crud_zona
from app.db.session import get_db
from app.models.models import PuntoControl, Sesion, Usuario
from app.schemas.zona import (
    PuntoControlCreate,
    PuntoControlResponse,
    PuntoControlUpdate,
    ZonaCreate,
    ZonaResponse,
    ZonaUpdate,
)

router = APIRouter(prefix="/api/zonas", tags=["Zonas Geográficas"])


# ============================================================
# ENDPOINTS DE ZONAS
# ============================================================
@router.get("/", response_model=list[ZonaResponse])
def listar_zonas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return crud_zona.get_zonas_con_estado(db)


@router.get("/disponibles", response_model=list[ZonaResponse])
def listar_zonas_disponibles(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    zonas = crud_zona.get_zonas_disponibles(db)
    return [
        ZonaResponse(
            id=z.id, nombre=z.nombre, descripcion=z.descripcion,
            estatus=z.estatus, fecha_registro=z.fecha_registro,
            en_uso=False, usuario_en_uso=None, total_puntos=0
        )
        for z in zonas
    ]


@router.get("/ocupadas")
def listar_zonas_ocupadas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return [z for z in crud_zona.get_zonas_con_estado(db) if z.get("en_uso")]


@router.post("/", response_model=ZonaResponse, status_code=status.HTTP_201_CREATED)
def crear_zona(
    data: ZonaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        zona = crud_zona.crear_zona(db, data.nombre, data.descripcion)
        return ZonaResponse(
            id=zona.id, nombre=zona.nombre, descripcion=zona.descripcion,
            estatus=zona.estatus, fecha_registro=zona.fecha_registro,
            en_uso=False, usuario_en_uso=None, total_puntos=0
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{zona_id}", response_model=ZonaResponse)
def actualizar_zona(
    zona_id: int,
    data: ZonaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        zona = crud_zona.actualizar_zona(db, zona_id, data)
        zonas_estado = crud_zona.get_zonas_con_estado(db)
        estado_zona = next((z for z in zonas_estado if z["id"] == zona.id), None)
        return ZonaResponse(
            id=zona.id, nombre=zona.nombre, descripcion=zona.descripcion,
            estatus=zona.estatus, fecha_registro=zona.fecha_registro,
            en_uso=estado_zona.get("en_uso", False) if estado_zona else False,
            usuario_en_uso=estado_zona.get("usuario_en_uso") if estado_zona else None,
            total_puntos=estado_zona.get("total_puntos", 0) if estado_zona else 0
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# ============================================================
# ENDPOINTS DE PUNTOS DE CONTROL
# ============================================================
@router.get("/puntos-control", response_model=list[PuntoControlResponse])
def listar_puntos_control(
    zona_id: int = Query(None, description="Filtrar por zona"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    puntos = crud_zona.get_puntos_control(db, zona_id=zona_id)
    return [
        PuntoControlResponse(
            id=p.id, nombre=p.nombre, estatus=p.estatus,
            zona_id=p.zona_id,
            zona_nombre=p.zona.nombre if p.zona else None
        )
        for p in puntos
    ]


@router.get("/puntos-control/estado")
def listar_puntos_con_estado(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todos los puntos de control con su estado (en uso o disponible)."""
    return crud_zona.get_puntos_control_con_estado(db)


@router.post("/puntos-control", response_model=PuntoControlResponse, status_code=status.HTTP_201_CREATED)
def crear_punto_control(
    data: PuntoControlCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        punto = crud_zona.crear_punto_control(db, data.nombre, data.zona_id)
        return PuntoControlResponse(
            id=punto.id, nombre=punto.nombre, estatus=punto.estatus,
            zona_id=punto.zona_id,
            zona_nombre=punto.zona.nombre if punto.zona else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/puntos-control/{punto_id}", response_model=PuntoControlResponse)
def actualizar_punto_control(
    punto_id: int,
    data: PuntoControlUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        punto = crud_zona.actualizar_punto_control(db, punto_id, data)
        return PuntoControlResponse(
            id=punto.id, nombre=punto.nombre, estatus=punto.estatus,
            zona_id=punto.zona_id,
            zona_nombre=punto.zona.nombre if punto.zona else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# ============================================================
# ENDPOINT DEPRECADO: LIBERAR PUNTO DE CONTROL (SOLO ADMIN)
# ============================================================
# ⚠️ DEPRECATED (v6.1): este endpoint era un DUPLICADO de
# POST /api/sesion/liberar-punto (app/api/sesion.py) y NO registraba
# el evento en la tabla de auditoría `eventos`, incumpliendo la regla de
# negocio "Override ADMIN con auditoría". Se mantiene solo como fachada de
# compatibilidad hacia atrás: delega en el endpoint canónico tras resolver
# la sesión ACTIVA del punto. El frontend debe usar sesionApi.liberarPunto.


class LiberarPuntoRequest(BaseModel):
    razon: str | None = None


@router.post("/puntos-control/{punto_id}/liberar", deprecated=True)
def liberar_punto_control(
    punto_id: int,
    data: LiberarPuntoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    """
    [DEPRECADO] Libera un punto de control ocupado delegando en el
    endpoint canónico POST /api/sesion/liberar-punto, que sí escribe
    el evento LIBERACION_PUNTO en la tabla `eventos`.
    Solo ADMIN (verify_admin). Razón obligatoria (422 si falta o es vacía).
    """
    from app.api.sesion import liberar_punto as _liberar_canonico
    from app.schemas.sesion import LiberacionPuntoRequest

    if not data.razon or not data.razon.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La razón de la liberación es obligatoria."
        )

    # Validar que el punto existe
    punto = db.query(PuntoControl).filter(PuntoControl.id == punto_id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de control no encontrado")

    # Resolver la sesión ACTIVA del punto (regla: una sola sesión activa por punto)
    sesion_activa = db.query(Sesion).filter(
        Sesion.punto_control == punto.nombre,
        Sesion.estado == "ACTIVA"
    ).first()

    if not sesion_activa:
        raise HTTPException(status_code=400, detail="El punto de control no está ocupado")

    # Delegar en el endpoint canónico: estado LIBERADA_ADMIN + auditoría garantizados
    resultado = _liberar_canonico(
        LiberacionPuntoRequest(sesion_id=sesion_activa.id, razon=data.razon.strip()),
        db=db,
        current_user=current_user,
    )
    return {
        "mensaje": "Punto de control liberado correctamente",
        "punto": punto.nombre,
        "sesion_anterior": sesion_activa.id,
        "usuario_anterior": sesion_activa.usuario_nombre,
        "liberado_por": current_user.nombre_completo,
        "razon": data.razon.strip(),
        "estado": resultado["estado"],
        "deprecado": True,
        "reemplazo": "POST /api/sesion/liberar-punto",
    }
