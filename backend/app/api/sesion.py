from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import sesion as crud_sesion
from app.schemas.sesion import (
    TurnoResponse, RangoTurnoResponse, ValidarPersonaResponse,
    AperturaSesionRequest, SesionResponse
)
from app.api.auth import oauth2_scheme
from app.core.security import get_current_user
from app.models.models import Usuario, Sesion

router = APIRouter(prefix="/api/sesion", tags=["Sesión y Turnos"])

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
    current_user: Usuario = Depends(get_current_user)
):
    try:
        # Solo ADMIN puede forzar zona
        forzar = data.forzar_zona and current_user.rol == "ADMIN"
        
        sesion = crud_sesion.crear_sesion(
            db=db,
            usuario_id=current_user.id,
            usuario_nombre=current_user.nombre_completo,
            data=data,
            forzar=forzar
        )
        return sesion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cerrar/{sesion_id}")
def cerrar_sesion(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Cierra una sesión activa, liberando el punto de control."""
    from datetime import datetime
    
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if sesion.estado != "ACTIVA":
        raise HTTPException(status_code=400, detail=f"La sesión ya está {sesion.estado}")
    
    # Actualizar estado y hora de cierre
    sesion.estado = "CERRADA"
    sesion.hora_fin = datetime.now()
    db.commit()
    db.refresh(sesion)
    
    return {
        "mensaje": "Sesión cerrada correctamente",
        "sesion_id": sesion.id,
        "zona": sesion.zona,
        "punto_control": sesion.punto_control,
        "hora_cierre": sesion.hora_fin.isoformat()
    }