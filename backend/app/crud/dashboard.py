from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    MovimientoMaterial,
    MovimientoPersonal,
    MovimientoVisitante,
    Personal,
    Sesion,
    Vehiculo,
    Visitante,
)


def obtener_estadisticas_dashboard(db: Session, sesion: Sesion):
    """Obtiene estadísticas del PUNTO DE CONTROL activo."""

    # Totales de catálogos (globales, no cambian)
    total_personal = db.query(func.count(Personal.id)).scalar() or 0
    total_vehiculos = db.query(func.count(Vehiculo.id)).scalar() or 0
    total_visitantes = db.query(func.count(Visitante.id)).scalar() or 0

    # FILTRADO POR PUNTO DE CONTROL ACTIVO
    punto = sesion.punto_control

    entradas_personal = db.query(func.count(MovimientoPersonal.id)).filter(
        MovimientoPersonal.sesion_id == sesion.id,
        MovimientoPersonal.punto_control == punto,
        MovimientoPersonal.tipo_movimiento == "ENTRADA"
    ).scalar() or 0

    salidas_personal = db.query(func.count(MovimientoPersonal.id)).filter(
        MovimientoPersonal.sesion_id == sesion.id,
        MovimientoPersonal.punto_control == punto,
        MovimientoPersonal.tipo_movimiento == "SALIDA"
    ).scalar() or 0

    entradas_materiales = db.query(func.count(MovimientoMaterial.id)).filter(
        MovimientoMaterial.sesion_id == sesion.id,
        MovimientoMaterial.punto_control == punto,
        MovimientoMaterial.tipo_movimiento == "ENTRADA"
    ).scalar() or 0

    salidas_materiales = db.query(func.count(MovimientoMaterial.id)).filter(
        MovimientoMaterial.sesion_id == sesion.id,
        MovimientoMaterial.punto_control == punto,
        MovimientoMaterial.tipo_movimiento == "SALIDA"
    ).scalar() or 0

    entradas_visitantes = db.query(func.count(MovimientoVisitante.id)).filter(
        MovimientoVisitante.sesion_id == sesion.id,
        MovimientoVisitante.punto_control == punto,
        MovimientoVisitante.tipo_movimiento == "ENTRADA"
    ).scalar() or 0

    salidas_visitantes = db.query(func.count(MovimientoVisitante.id)).filter(
        MovimientoVisitante.sesion_id == sesion.id,
        MovimientoVisitante.punto_control == punto,
        MovimientoVisitante.tipo_movimiento == "SALIDA"
    ).scalar() or 0

    personal_dentro = max(0, entradas_personal - salidas_personal)

    return {
        "total_personal": total_personal,
        "total_vehiculos": total_vehiculos,
        "total_visitantes": total_visitantes,
        "entradas_personal": entradas_personal,
        "salidas_personal": salidas_personal,
        "entradas_materiales": entradas_materiales,
        "salidas_materiales": salidas_materiales,
        "entradas_visitantes": entradas_visitantes,
        "salidas_visitantes": salidas_visitantes,
        "personal_dentro": personal_dentro
    }
