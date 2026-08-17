from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import MovimientoPersonal, MovimientoMaterial, Personal, Sesion, Vehiculo

# ============================================================
# MOVIMIENTOS DE PERSONAL
# ============================================================
def registrar_movimiento_personal(db: Session, sesion: Sesion, cedula: str, tipo: str, observacion: str = ""):
    """Registra un movimiento de personal vinculado a la sesión activa."""
    persona = db.query(Personal).filter(Personal.cedula == cedula).first()
    if not persona:
        raise ValueError(f"Cédula {cedula} no registrada")

    ahora = datetime.now()
    movimiento = MovimientoPersonal(
        sesion_id=sesion.id,
        fecha=ahora.date(),
        hora=ahora.strftime("%H:%M:%S"),
        cedula=persona.cedula,
        nombres=persona.nombres,
        empresa=persona.empresa,
        tipo_movimiento=tipo,
        punto_control=sesion.punto_control,
        grupo_trabajo=sesion.grupo_trabajo,
        turno_codigo=sesion.turno_codigo,
        numero_semana=sesion.numero_semana,
        observacion=observacion
    )
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)
    return movimiento


def listar_movimientos_del_punto(db: Session, sesion: Sesion):
    """Lista SOLO los movimientos del punto de control de la sesión activa."""
    return db.query(MovimientoPersonal).filter(
        MovimientoPersonal.sesion_id == sesion.id,
        MovimientoPersonal.punto_control == sesion.punto_control
    ).order_by(MovimientoPersonal.fecha.desc(), MovimientoPersonal.hora.desc()).limit(100).all()


def contar_movimientos_punto(db: Session, sesion: Sesion, tipo: str):
    """Cuenta entradas o salidas SOLO del punto de control activo."""
    return db.query(MovimientoPersonal).filter(
        MovimientoPersonal.sesion_id == sesion.id,
        MovimientoPersonal.punto_control == sesion.punto_control,
        MovimientoPersonal.tipo_movimiento == tipo
    ).count()


# ============================================================
# MOVIMIENTOS DE MATERIALES
# ============================================================
def registrar_movimiento_material(db: Session, sesion: Sesion, data):
    """Registra un movimiento de material vinculado a la sesión activa."""
    if not data.descripcion or not data.descripcion.strip():
        raise ValueError("La descripción del material es obligatoria")

    nombres_conductor = ""
    if data.cedula_conductor and data.cedula_conductor.strip():
        persona = db.query(Personal).filter(Personal.cedula == data.cedula_conductor).first()
        if persona:
            nombres_conductor = persona.nombres
        else:
            nombres_conductor = "NO REGISTRADO"

    ahora = datetime.now()
    movimiento = MovimientoMaterial(
        sesion_id=sesion.id,
        fecha=ahora.date(),
        hora=ahora.strftime("%H:%M:%S"),
        cedula_conductor=data.cedula_conductor or None,
        nombres_conductor=nombres_conductor or None,
        descripcion=data.descripcion.strip(),
        placa_vehiculo=data.placa_vehiculo or None,
        condicion_vehiculo=data.condicion_vehiculo or None,
        quien_autoriza=data.quien_autoriza or None,
        destino=data.destino or None,
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


def listar_materiales_del_punto(db: Session, sesion: Sesion):
    """Lista SOLO los movimientos de materiales del punto de control activo."""
    return db.query(MovimientoMaterial).filter(
        MovimientoMaterial.sesion_id == sesion.id,
        MovimientoMaterial.punto_control == sesion.punto_control
    ).order_by(MovimientoMaterial.fecha.desc(), MovimientoMaterial.hora.desc()).limit(100).all()


def contar_materiales_punto(db: Session, sesion: Sesion, tipo: str):
    """Cuenta entradas o salidas de materiales SOLO del punto activo."""
    return db.query(MovimientoMaterial).filter(
        MovimientoMaterial.sesion_id == sesion.id,
        MovimientoMaterial.punto_control == sesion.punto_control,
        MovimientoMaterial.tipo_movimiento == tipo
    ).count()


# ============================================================
# VEHÍCULOS
# ============================================================
def get_vehiculo_by_placa(db: Session, placa: str):
    return db.query(Vehiculo).filter(Vehiculo.placa == placa.upper()).first()


def listar_vehiculos(db: Session, search: str = "", limit: int = 20):
    query = db.query(Vehiculo)
    if search:
        query = query.filter(Vehiculo.placa.ilike(f"%{search}%"))
    return query.order_by(Vehiculo.placa).limit(limit).all()