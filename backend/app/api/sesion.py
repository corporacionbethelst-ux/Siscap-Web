from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (  # noqa: F401 (oauth2_scheme se importa para el esquema OpenAPI)
    get_current_user,
    oauth2_scheme,
    require_operativo,
)
from app.crud import sesion as crud_sesion
from app.db.session import get_db
from app.models.models import Evento, Sesion, Usuario
from app.schemas.sesion import (
    AperturaSesionRequest,
    CierreSesionRequest,
    LiberacionPuntoRequest,
    RangoTurnoResponse,
    SesionResponse,
    TurnoResponse,
    ValidarPersonaResponse,
)

router = APIRouter(prefix="/api/sesion", tags=["Sesión y Turnos"])


def _registrar_evento(db: Session, sesion_id: int, usuario: str, tipo: str,
                      accion: str, detalle: str = None):
    """Registra un evento de auditoría vinculado a la sesión."""
    from datetime import datetime
    ahora = datetime.now()
    db.add(Evento(
        sesion_id=sesion_id,
        usuario=usuario,
        tipo_evento=tipo,
        accion=accion,
        detalle=detalle,
        fecha=ahora.date(),
        hora=ahora.strftime("%H:%M:%S"),
    ))


@router.get("/turnos", response_model=list[TurnoResponse])
def listar_turnos(db: Session = Depends(get_db)):
    return crud_sesion.get_turnos_activos(db)


@router.get("/rango/{turno_codigo}", response_model=RangoTurnoResponse)
def obtener_rango_turno(turno_codigo: str, db: Session = Depends(get_db)):
    from app.utils.turnos import calcular_rango_turno
    rango_inicio, rango_fin, dia_operativo, turno_nombre = calcular_rango_turno(db, turno_codigo)
    if not rango_inicio:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return {
        "rango_inicio": rango_inicio,
        "rango_fin": rango_fin,
        "dia_operativo": dia_operativo,
        "turno_nombre": turno_nombre
    }


@router.get("/validar-persona/{cedula}", response_model=ValidarPersonaResponse)
def validar_persona(cedula: str, db: Session = Depends(get_db)):
    return crud_sesion.validar_persona_por_cedula(db, cedula)


@router.post("/apertura", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
def abrir_sesion(
    data: AperturaSesionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo)
):
    # REGLA DE NEGOCIO: solo ADMIN puede forzar la apertura de un punto ocupado.
    # Si un no-ADMIN intenta forzar, se rechaza explícitamente (403).
    if data.forzar_zona and current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede forzar la apertura de un punto de control."
        )

    # Si se fuerza, la razón es obligatoria (auditoría)
    if data.forzar_zona and not (data.razon_forzado and data.razon_forzado.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Para forzar la apertura se requiere una razón registrada."
        )

    try:
        sesion = crud_sesion.crear_sesion(
            db=db,
            usuario_id=current_user.id,
            usuario_nombre=current_user.nombre_completo,
            data=data,
            forzar=data.forzar_zona,
            razon_forzado=(data.razon_forzado or "").strip() or None,
        )
        return sesion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/cerrar/{sesion_id}")
def cerrar_sesion(
    sesion_id: int,
    data: CierreSesionRequest = CierreSesionRequest(),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo)
):
    """Cierra una sesión activa, liberando el punto de control. Registra auditoría."""
    from datetime import datetime

    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if sesion.estado != "ACTIVA":
        raise HTTPException(status_code=400, detail=f"La sesión ya está {sesion.estado}")

    # Solo el dueño de la sesión o un ADMIN pueden cerrarla
    if sesion.usuario_id != current_user.id and current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede cerrar una sesión de otro operador."
        )

    sesion.estado = "CERRADA"
    sesion.hora_fin = datetime.now()

    _registrar_evento(
        db, sesion.id, current_user.usuario, "SESION",
        "CIERRE_SESION",
        f"Punto: {sesion.punto_control} | Turno: {sesion.turno_nombre}"
        + (f" | Razón: {data.razon}" if data.razon else "")
    )
    db.commit()
    db.refresh(sesion)

    return {
        "mensaje": "Sesión cerrada correctamente",
        "sesion_id": sesion.id,
        "zona": sesion.zona,
        "punto_control": sesion.punto_control,
        "hora_cierre": sesion.hora_fin.isoformat()
    }


@router.post("/liberar-punto")
def liberar_punto(
    data: LiberacionPuntoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """EXCLUSIVO ADMIN: libera un punto de control bloqueado por una sesión activa
    (ej: tras un apagón). La sesión queda LIBERADA_ADMIN y se exige una razón."""
    from datetime import datetime

    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede liberar puntos de control."
        )

    if not data.razon or not data.razon.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La razón de la liberación es obligatoria."
        )

    sesion = db.query(Sesion).filter(Sesion.id == data.sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if sesion.estado != "ACTIVA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La sesión ya está {sesion.estado}. No hay nada que liberar."
        )

    sesion.estado = "LIBERADA_ADMIN"
    sesion.hora_fin = datetime.now()

    _registrar_evento(
        db, sesion.id, current_user.usuario, "SEGURIDAD",
        "LIBERACION_PUNTO",
        f"Punto liberado: {sesion.punto_control} | Ocupaba: {sesion.usuario_nombre} "
        f"| Razón: {data.razon.strip()}"
    )
    db.commit()
    db.refresh(sesion)

    return {
        "mensaje": f"Punto '{sesion.punto_control}' liberado correctamente",
        "sesion_id": sesion.id,
        "estado": sesion.estado,
        "punto_control": sesion.punto_control,
        "hora_fin": sesion.hora_fin.isoformat()
    }


@router.get("/activas-admin", response_model=list[SesionResponse])
def listar_sesiones_activas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """EXCLUSIVO ADMIN: lista sesiones activas para gestión de liberación de puntos."""
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver las sesiones activas."
        )
    return db.query(Sesion).filter(Sesion.estado == "ACTIVA").order_by(Sesion.hora_inicio.desc()).all()
