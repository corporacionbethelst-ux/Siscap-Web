from typing import List
from sqlalchemy.orm import Session
from app.models.models import (
    MovimientoPersonal, MovimientoMaterial, MovimientoVisitante,
    Personal, PuntoControl
)


def buscar_historial(db: Session, filtros) -> List[dict]:
    """Búsqueda avanzada con filtros múltiples incluyendo zona y punto."""
    resultados = []

    fecha_desde = filtros.fecha_desde
    fecha_hasta = filtros.fecha_hasta
    tipo = filtros.tipo
    movimiento = filtros.movimiento
    zona = filtros.zona
    punto_control = filtros.punto_control
    gerencia = filtros.gerencia
    empresa = filtros.empresa
    busqueda = filtros.busqueda.lower() if filtros.busqueda else None
    grupo = filtros.grupo_trabajo
    semana = filtros.numero_semana

    # ============================================================
    # PERSONAL
    # ============================================================
    if tipo in ["TODOS", "PERSONAL"]:
        query = db.query(MovimientoPersonal).filter(
            MovimientoPersonal.fecha >= fecha_desde,
            MovimientoPersonal.fecha <= fecha_hasta
        )
        if movimiento != "TODOS":
            query = query.filter(MovimientoPersonal.tipo_movimiento == movimiento)
        if zona:
            puntos_de_zona = [p.nombre for p in db.query(PuntoControl).filter(
                PuntoControl.zona.has(nombre=zona)
            ).all()]
            if puntos_de_zona:
                query = query.filter(MovimientoPersonal.punto_control.in_(puntos_de_zona))
        if punto_control:
            query = query.filter(MovimientoPersonal.punto_control == punto_control)
        if empresa and empresa != "TODAS":
            query = query.filter(MovimientoPersonal.empresa == empresa)
        if grupo and grupo != "TODOS":
            query = query.filter(MovimientoPersonal.grupo_trabajo == grupo)
        if semana:
            query = query.filter(MovimientoPersonal.numero_semana == semana)

        for r in query.order_by(MovimientoPersonal.fecha.desc(), MovimientoPersonal.hora.desc()).limit(500):
            if gerencia and gerencia != "TODAS":
                persona = db.query(Personal).filter(Personal.cedula == r.cedula).first()
                if not persona or persona.gerencia != gerencia:
                    continue
            if busqueda:
                if busqueda not in (r.cedula or "").lower() and busqueda not in (r.nombres or "").lower():
                    continue

            resultados.append({
                "fecha": str(r.fecha),
                "hora": r.hora,
                "tipo": "PERSONAL",
                "cedula": r.cedula,
                "nombre": r.nombres,
                "empresa_gerencia": r.empresa or "",
                "zona": None,
                "punto_control": r.punto_control,
                "turno": r.turno_codigo,
                "grupo": r.grupo_trabajo,
                "semana": f"S{r.numero_semana}" if r.numero_semana else "",
                "movimiento": r.tipo_movimiento
            })

    # ============================================================
    # MATERIALES
    # ============================================================
    if tipo in ["TODOS", "MATERIAL"]:
        query = db.query(MovimientoMaterial).filter(
            MovimientoMaterial.fecha >= fecha_desde,
            MovimientoMaterial.fecha <= fecha_hasta
        )
        if movimiento != "TODOS":
            query = query.filter(MovimientoMaterial.tipo_movimiento == movimiento)
        if zona:
            puntos_de_zona = [p.nombre for p in db.query(PuntoControl).filter(
                PuntoControl.zona.has(nombre=zona)
            ).all()]
            if puntos_de_zona:
                query = query.filter(MovimientoMaterial.punto_control.in_(puntos_de_zona))
        if punto_control:
            query = query.filter(MovimientoMaterial.punto_control == punto_control)
        if grupo and grupo != "TODOS":
            query = query.filter(MovimientoMaterial.grupo_trabajo == grupo)
        if semana:
            query = query.filter(MovimientoMaterial.numero_semana == semana)

        for r in query.order_by(MovimientoMaterial.fecha.desc(), MovimientoMaterial.hora.desc()).limit(500):
            if busqueda:
                if (busqueda not in (r.cedula_conductor or "").lower() and
                    busqueda not in (r.nombres_conductor or "").lower() and
                    busqueda not in (r.descripcion or "").lower()):
                    continue
            descripcion_corta = (r.descripcion or '')[:30]
            detalle = f"{descripcion_corta} | {r.placa_vehiculo or 'N/A'}"
            resultados.append({
                "fecha": str(r.fecha),
                "hora": r.hora,
                "tipo": "MATERIAL",
                "cedula": r.cedula_conductor,
                "nombre": r.nombres_conductor,
                "empresa_gerencia": detalle,
                "zona": None,
                "punto_control": r.punto_control,
                "turno": r.turno_codigo,
                "grupo": r.grupo_trabajo,
                "semana": f"S{r.numero_semana}" if r.numero_semana else "",
                "movimiento": r.tipo_movimiento
            })

    # ============================================================
    # VISITANTES
    # ============================================================
    if tipo in ["TODOS", "VISITANTE"]:
        query = db.query(MovimientoVisitante).filter(
            MovimientoVisitante.fecha >= fecha_desde,
            MovimientoVisitante.fecha <= fecha_hasta
        )
        if movimiento != "TODOS":
            query = query.filter(MovimientoVisitante.tipo_movimiento == movimiento)
        if zona:
            puntos_de_zona = [p.nombre for p in db.query(PuntoControl).filter(
                PuntoControl.zona.has(nombre=zona)
            ).all()]
            if puntos_de_zona:
                query = query.filter(MovimientoVisitante.punto_control.in_(puntos_de_zona))
        if punto_control:
            query = query.filter(MovimientoVisitante.punto_control == punto_control)
        if empresa and empresa != "TODAS":
            query = query.filter(MovimientoVisitante.empresa == empresa)
        if grupo and grupo != "TODOS":
            query = query.filter(MovimientoVisitante.grupo_trabajo == grupo)
        if semana:
            query = query.filter(MovimientoVisitante.numero_semana == semana)

        for r in query.order_by(MovimientoVisitante.fecha.desc(), MovimientoVisitante.hora.desc()).limit(500):
            if busqueda:
                if (busqueda not in (r.cedula or "").lower() and
                    busqueda not in (r.nombres or "").lower() and
                    busqueda not in (r.empresa or "").lower()):
                    continue
            detalle = f"{r.tipo_visitante or 'VISITANTE'} -> {r.a_quien_visita or 'N/A'}"
            resultados.append({
                "fecha": str(r.fecha),
                "hora": r.hora,
                "tipo": "VISITANTE",
                "cedula": r.cedula,
                "nombre": r.nombres,
                "empresa_gerencia": detalle,
                "zona": None,
                "punto_control": r.punto_control,
                "turno": r.turno_codigo,
                "grupo": r.grupo_trabajo,
                "semana": f"S{r.numero_semana}" if r.numero_semana else "",
                "movimiento": r.tipo_movimiento
            })

    # Ordenar por fecha y hora descendente
    resultados.sort(key=lambda x: (x["fecha"], x["hora"]), reverse=True)
    return resultados