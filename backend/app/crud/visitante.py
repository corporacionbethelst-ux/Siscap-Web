from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import (
    EmpresaForanea,
    Gerencia,
    MovimientoVisitante,
    Sesion,
    Visitante,
)


# ============================================================
# VISITANTES (Catálogo)
# ============================================================
def get_visitante_by_cedula(db: Session, cedula: str):
    return db.query(Visitante).filter(Visitante.cedula == cedula).first()


def crear_visitante(db: Session, data):
    db_visitante = Visitante(
        cedula=data.cedula,
        nombres=data.nombres.upper(),
        empresa=data.empresa,
        telefono=data.telefono,
        tipo_visitante=data.tipo_visitante,
        estatus="ACTIVO"
    )
    db.add(db_visitante)
    db.commit()
    db.refresh(db_visitante)
    return db_visitante


# ============================================================
# MOVIMIENTOS DE VISITANTES (FILTRADO POR PUNTO DE CONTROL)
# ============================================================
def registrar_movimiento_visitante(db: Session, sesion: Sesion, data):
    """Registra un movimiento de visitante vinculado a la sesión activa."""
    visitante = db.query(Visitante).filter(Visitante.cedula == data.cedula).first()
    if not visitante:
        raise ValueError(f"Cédula {data.cedula} no registrada como visitante")

    ahora = datetime.now()
    movimiento = MovimientoVisitante(
        sesion_id=sesion.id,
        fecha=ahora.date(),
        hora=ahora.strftime("%H:%M:%S"),
        cedula=visitante.cedula,
        nombres=visitante.nombres,
        empresa=visitante.empresa,
        tipo_visitante=data.tipo_visitante,
        placa_vehiculo=data.placa_vehiculo or None,
        motivo=data.motivo or None,
        a_quien_visita=data.a_quien_visita or None,
        gerencia_destino=data.gerencia_destino or None,
        acompanantes=data.acompanantes or 0,
        tipo_movimiento=data.tipo_movimiento,
        punto_control=sesion.punto_control,
        grupo_trabajo=sesion.grupo_trabajo,
        turno_codigo=sesion.turno_codigo,
        numero_semana=sesion.numero_semana,
        observacion=data.observacion or None
    )
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)
    return movimiento


def listar_visitantes_del_punto(db: Session, sesion: Sesion):
    """Lista SOLO los visitantes del punto de control activo."""
    return db.query(MovimientoVisitante).filter(
        MovimientoVisitante.sesion_id == sesion.id,
        MovimientoVisitante.punto_control == sesion.punto_control
    ).order_by(MovimientoVisitante.fecha.desc(), MovimientoVisitante.hora.desc()).limit(100).all()


def contar_visitantes_punto(db: Session, sesion: Sesion, tipo: str):
    """Cuenta entradas o salidas de visitantes SOLO del punto activo."""
    return db.query(MovimientoVisitante).filter(
        MovimientoVisitante.sesion_id == sesion.id,
        MovimientoVisitante.punto_control == sesion.punto_control,
        MovimientoVisitante.tipo_movimiento == tipo
    ).count()


# ============================================================
# CATÁLOGOS AUXILIARES
# ============================================================
def get_tipos_visitante():
    return ["VISITANTE", "EMPRESA EXTERNA", "MILITAR", "PROVEEDOR",
            "CONTRATISTA", "PERSONALIDAD", "REUNION", "AUDITORIA", "OTRO"]


def get_gerencias(db: Session):
    return db.query(Gerencia).filter(Gerencia.estatus == "ACTIVO").order_by(Gerencia.nombre).all()


def get_empresas_foraneas(db: Session):
    return db.query(EmpresaForanea).filter(EmpresaForanea.estatus == "ACTIVO").order_by(EmpresaForanea.nombre).all()
