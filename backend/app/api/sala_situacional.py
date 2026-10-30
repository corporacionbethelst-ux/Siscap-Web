"""
Módulo SALA SITUACIONAL — Capa de Proyección de Solo Lectura (Read-Only Projection)

Propósito:
    Permitir que el perfil OBSERVADOR_SALA consulte TODOS los procesos operativos
    del módulo Protección y Prevención (puntos, sesiones, movimientos, personal,
    visitantes, materiales, auditoría e historial) EXCLUSIVAMENTE para fines de
    reporte/monitorización global.

Reglas de diseño (NO NEGOCIABLES):
    1. Este router SOLO expone métodos GET. No existe POST/PUT/PATCH/DELETE.
       Cualquier intento de mutación desde este alcance devuelve 405/403.
    2. Ruptura deliberada del aislamiento por punto_control: la Sala ve TODO
       (todos los puntos/zonas), a diferencia del OPERADOR que solo ve su punto.
    3. Acceso restringido a roles: ADMIN (siempre) y OBSERVADOR_SALA.
       Los OPERADORES quedan excluidos (403).
    4. Sin dependencias de sesión activa: se consulta directamente sobre las
       tablas con filtros opcionales, sin estado ni side-effects.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import (
    Usuario, Sesion, Evento, MovimientoPersonal, MovimientoMaterial,
    MovimientoVisitante, Personal, Visitante, PuntoControl, Zona, Turno,
)

router = APIRouter(prefix="/api/sala-situacional", tags=["Sala Situacional"])

# Roles con derecho a proyección global de solo lectura
ROLES_SALA = {"ADMIN", "OBSERVADOR_SALA"}


def verify_sala(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Dependencia de autorización del módulo Sala Situacional.

    Permite únicamente ADMIN y OBSERVADOR_SALA. El resto de roles (OPERADOR)
    recibe 403: su visibilidad sigue limitada a su punto_control operativo.
    """
    if current_user.rol not in ROLES_SALA:
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido: este módulo es de solo lectura para Sala Situacional (ADMIN / OBSERVADOR_SALA)",
        )
    return current_user


def _rango_fechas(dias: int) -> tuple[date, date]:
    fin = date.today()
    inicio = fin - timedelta(days=max(1, min(dias, 365)))
    return inicio, fin


# ============================================================
# 1. PANORAMA GENERAL (KPIs globales — todos los puntos)
# ============================================================
@router.get("/panorama")
def panorama(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_sala)):
    """Resumen ejecutivo global: estado de puntos y volúmenes del día."""
    hoy = date.today()
    sesiones_activas = (
        db.query(Sesion).filter(Sesion.estado == "ACTIVA").all()
    )
    activos_map = {s.punto_control for s in sesiones_activas}
    puntos = db.query(PuntoControl).all()
    zonas = db.query(Zona).filter(Zona.estatus == "ACTIVO").all()

    def _count(model):
        return db.query(model).filter(model.fecha == hoy).count()

    return {
        "fecha": hoy.isoformat(),
        "total_puntos": len(puntos),
        "puntos_activos": len(activos_map),
        "puntos_inactivos": len([p for p in puntos if p.nombre not in activos_map and p.estatus == "ACTIVO"]),
        "zonas": [z.nombre for z in zonas],
        "turnos_abiertos_hoy": len(sesiones_activas),
        "movimientos_hoy": {
            "personal": _count(MovimientoPersonal),
            "materiales": _count(MovimientoMaterial),
            "visitantes": _count(MovimientoVisitante),
        },
        "sesiones_activas": [
            {
                "id": s.id,
                "punto_control": s.punto_control,
                "zona": s.zona,
                "turno": s.turno_nombre,
                "grupo_trabajo": s.grupo_trabajo,
                "usuario": s.usuario_nombre,
                "hora_inicio": s.hora_inicio.isoformat() if s.hora_inicio else None,
            }
            for s in sesiones_activas
        ],
    }


# ============================================================
# 2. SESIONES (histórico + activas, sin aislamiento por punto)
# ============================================================
@router.get("/sesiones")
def listar_sesiones(
    estado: Optional[str] = Query(None, description="ACTIVA|CERRADA|CERRADA_FORZADA|LIBERADA_ADMIN"),
    punto_control: Optional[str] = None,
    zona: Optional[str] = None,
    dias: int = Query(7, ge=1, le=365),
    limite: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_sala),
):
    """Listado global de turnos/sesiones con filtros. Solo lectura."""
    inicio, fin = _rango_fechas(dias)
    q = db.query(Sesion).filter(Sesion.dia_operativo >= inicio, Sesion.dia_operativo <= fin)
    if estado:
        q = q.filter(Sesion.estado == estado.upper())
    if punto_control:
        q = q.filter(Sesion.punto_control.ilike(f"%{punto_control}%"))
    if zona:
        q = q.filter(Sesion.zona.ilike(f"%{zona}%"))
    rows = q.order_by(Sesion.hora_inicio.desc()).limit(limite).all()
    return [
        {
            "id": s.id,
            "zona": s.zona,
            "punto_control": s.punto_control,
            "turno": s.turno_nombre,
            "grupo_trabajo": s.grupo_trabajo,
            "dia_operativo": s.dia_operativo.isoformat() if s.dia_operativo else None,
            "usuario": s.usuario_nombre,
            "supervisor": s.supervisor_nombre,
            "centralista": s.centralista_nombre,
            "hora_inicio": s.hora_inicio.isoformat() if s.hora_inicio else None,
            "hora_fin": s.hora_fin.isoformat() if s.hora_fin else None,
            "estado": s.estado,
        }
        for s in rows
    ]


# ============================================================
# 3. MOVIMIENTOS UNIFICADOS (personal + materiales + visitantes)
# ============================================================
@router.get("/movimientos")
def movimientos_unificados(
    tipo: Optional[str] = Query(None, description="PERSONAL|MATERIALES|VISITANTES (vacío = todos)"),
    punto_control: Optional[str] = None,
    cedula: Optional[str] = None,
    dias: int = Query(1, ge=1, le=365),
    limite: int = Query(300, ge=1, le=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_sala),
):
    """Stream consolidado de movimientos de los 3 sub-módulos, ordenado por fecha/hora."""
    inicio, fin = _rango_fechas(dias)
    resultado: list[dict] = []
    t = (tipo or "").upper()

    if t in ("", "PERSONAL"):
        q = db.query(MovimientoPersonal).filter(
            MovimientoPersonal.fecha >= inicio, MovimientoPersonal.fecha <= fin
        )
        if punto_control:
            q = q.filter(MovimientoPersonal.punto_control.ilike(f"%{punto_control}%"))
        if cedula:
            q = q.filter(MovimientoPersonal.cedula == cedula)
        for m in q.order_by(MovimientoPersonal.fecha.desc(), MovimientoPersonal.id.desc()).limit(limite).all():
            resultado.append({
                "tipo": "PERSONAL", "fecha": m.fecha.isoformat(), "hora": m.hora,
                "cedula": m.cedula, "nombre": m.nombres, "detalle": m.empresa,
                "movimiento": m.tipo_movimiento, "punto_control": m.punto_control,
                "turno": m.turno_codigo, "observacion": m.observacion,
            })

    if t in ("", "MATERIALES"):
        q = db.query(MovimientoMaterial).filter(
            MovimientoMaterial.fecha >= inicio, MovimientoMaterial.fecha <= fin
        )
        if punto_control:
            q = q.filter(MovimientoMaterial.punto_control.ilike(f"%{punto_control}%"))
        if cedula:
            q = q.filter(MovimientoMaterial.cedula_conductor == cedula)
        for m in q.order_by(MovimientoMaterial.fecha.desc(), MovimientoMaterial.id.desc()).limit(limite).all():
            resultado.append({
                "tipo": "MATERIALES", "fecha": m.fecha.isoformat(), "hora": m.hora,
                "cedula": m.cedula_conductor, "nombre": m.nombres_conductor,
                "detalle": m.descripcion, "placa": m.placa_vehiculo,
                "movimiento": m.tipo_movimiento, "punto_control": m.punto_control,
                "turno": m.turno_codigo, "observacion": m.observacion,
            })

    if t in ("", "VISITANTES"):
        q = db.query(MovimientoVisitante).filter(
            MovimientoVisitante.fecha >= inicio, MovimientoVisitante.fecha <= fin
        )
        if punto_control:
            q = q.filter(MovimientoVisitante.punto_control.ilike(f"%{punto_control}%"))
        if cedula:
            q = q.filter(MovimientoVisitante.cedula == cedula)
        for m in q.order_by(MovimientoVisitante.fecha.desc(), MovimientoVisitante.id.desc()).limit(limite).all():
            resultado.append({
                "tipo": "VISITANTES", "fecha": m.fecha.isoformat(), "hora": m.hora,
                "cedula": m.cedula, "nombre": m.nombres,
                "detalle": f"Visita a: {m.a_quien_visita or 'N/D'} | Motivo: {m.motivo or 'N/D'}",
                "placa": m.placa_vehiculo, "movimiento": m.tipo_movimiento,
                "punto_control": m.punto_control, "turno": m.turno_codigo,
                "observacion": m.observacion,
            })

    # Orden global por fecha+hora desc, recorte final al límite
    resultado.sort(key=lambda r: (r["fecha"], r["hora"] or ""), reverse=True)
    return resultado[:limite]


# ============================================================
# 4. MAESTROS DE REFERENCIA (catálogos, solo lectura)
# ============================================================
@router.get("/personal")
def padron_personal(
    busqueda: Optional[str] = None,
    limite: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_sala),
):
    """Padrón global de personal registrado (maestro, no movimientos)."""
    q = db.query(Personal)
    if busqueda:
        like = f"%{busqueda}%"
        q = q.filter(
            (Personal.cedula.ilike(like)) | (Personal.nombres.ilike(like)) | (Personal.empresa.ilike(like))
        )
    return [
        {"cedula": p.cedula, "nombres": p.nombres, "empresa": p.empresa,
         "gerencia": getattr(p, "gerencia", None)}
        for p in q.limit(limite).all()
    ]


@router.get("/visitantes")
def padron_visitantes(
    busqueda: Optional[str] = None,
    dias: int = Query(7, ge=1, le=365),
    limite: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_sala),
):
    """Registro reciente de visitantes (maestro Visitante)."""
    inicio, fin = _rango_fechas(dias)
    q = db.query(Visitante).filter(Visitante.fecha_registro >= inicio) if hasattr(Visitante, "fecha_registro") else db.query(Visitante)
    if busqueda:
        like = f"%{busqueda}%"
        q = q.filter((Visitante.cedula.ilike(like)) | (Visitante.nombres.ilike(like)))
    return [
        {"cedula": v.cedula, "nombres": v.nombres, "empresa": v.empresa,
         "tipo": getattr(v, "tipo_visitante", None)}
        for v in q.limit(limite).all()
    ]


@router.get("/eventos")
def auditoria_eventos(
    tipo_evento: Optional[str] = Query(None, description="APERTURA_SESION|CIERRE_SESION|LIBERACION_PUNTO|..."),
    sesion_id: Optional[int] = None,
    dias: int = Query(7, ge=1, le=365),
    limite: int = Query(300, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_sala),
):
    """Trazabilidad de eventos críticos (apertura/cierre/liberación forzada)."""
    inicio, fin = _rango_fechas(dias)
    q = db.query(Evento).filter(Evento.fecha >= inicio, Evento.fecha <= fin)
    if tipo_evento:
        q = q.filter(Evento.tipo_evento == tipo_evento.upper())
    if sesion_id:
        q = q.filter(Evento.sesion_id == sesion_id)
    return [
        {"id": e.id, "sesion_id": e.sesion_id, "usuario": e.usuario,
         "tipo_evento": e.tipo_evento, "accion": e.accion, "detalle": e.detalle,
         "fecha": e.fecha.isoformat(), "hora": e.hora}
        for e in q.order_by(Evento.fecha.desc(), Evento.id.desc()).limit(limite).all()
    ]


@router.get("/turnos")
def catalogos_turnos(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_sala)):
    """Catálogo de turnos (referencia para filtros de reportes)."""
    return [
        {"codigo": t.codigo, "nombre": t.nombre,
         "hora_inicio": str(t.hora_inicio) if getattr(t, "hora_inicio", None) else None,
         "hora_fin": str(t.hora_fin) if getattr(t, "hora_fin", None) else None}
        for t in db.query(Turno).all()
    ]
