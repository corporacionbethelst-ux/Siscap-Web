from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.models import Sesion, Personal, Turno
from app.utils.turnos import calcular_rango_turno


def get_turnos_activos(db: Session):
    return db.query(Turno).filter(Turno.activo == True).order_by(Turno.codigo).all()


def validar_persona_por_cedula(db: Session, cedula: str):
    persona = db.query(Personal).filter(Personal.cedula == cedula).first()
    if persona:
        return {
            "encontrado": True,
            "cedula": persona.cedula,
            "nombres": persona.nombres,
            "empresa": persona.empresa,
            "gerencia": persona.gerencia
        }
    return {"encontrado": False}


def obtener_semana_actual():
    hoy = date.today()
    iso = hoy.isocalendar()
    return iso[1], iso[0]  # numero_semana, anio_semana


def crear_sesion(db: Session, usuario_id: int, usuario_nombre: str, data, forzar: bool = False):
    """Crea una nueva sesión validando que el PUNTO DE CONTROL no esté en uso."""
    
    # VALIDACIÓN CRÍTICA: Verificar que el PUNTO DE CONTROL no esté ocupado
    sesion_punto_ocupado = db.query(Sesion).filter(
        Sesion.punto_control == data.punto_control,
        Sesion.estado == "ACTIVA"
    ).first()
    
    if sesion_punto_ocupado and not forzar:
        raise ValueError(
            f"El punto de control '{data.punto_control}' ya está en uso por "
            f"{sesion_punto_ocupado.usuario_nombre} (sesión #{sesion_punto_ocupado.id}). "
            f"Si es una emergencia, un administrador puede forzar la apertura."
        )
    
    # Si se está forzando y el punto está ocupado, cerrar la sesión anterior
    if sesion_punto_ocupado and forzar:
        sesion_punto_ocupado.estado = "CERRADA_FORZADA"
        sesion_punto_ocupado.hora_fin = datetime.now()
        db.add(sesion_punto_ocupado)
    
    # Buscar turno
    turno = db.query(Turno).filter(Turno.codigo == data.turno_codigo).first()
    if not turno:
        raise ValueError("Turno no válido")

    # Buscar supervisor y centralista
    supervisor = db.query(Personal).filter(Personal.cedula == data.supervisor_cedula).first()
    centralista = db.query(Personal).filter(Personal.cedula == data.centralista_cedula).first()

    if not supervisor:
        raise ValueError("Supervisor no encontrado")
    if not centralista:
        raise ValueError("Centralista no encontrado")

    # Calcular rango del turno
    rango_inicio, rango_fin, dia_operativo, turno_nombre = calcular_rango_turno(db, data.turno_codigo)

    semana, anio = obtener_semana_actual()
    ahora = datetime.now()

    sesion = Sesion(
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        zona=data.zona,
        punto_control=data.punto_control,
        grupo_trabajo=data.grupo_trabajo,
        turno_codigo=data.turno_codigo,
        turno_nombre=turno_nombre,
        dia_operativo=datetime.strptime(dia_operativo, "%Y-%m-%d").date(),
        rango_inicio=datetime.strptime(rango_inicio, "%Y-%m-%d %H:%M:%S"),
        rango_fin=datetime.strptime(rango_fin, "%Y-%m-%d %H:%M:%S"),
        numero_semana=semana,
        anio_semana=anio,
        supervisor_cedula=supervisor.cedula,
        supervisor_nombre=supervisor.nombres,
        centralista_cedula=centralista.cedula,
        centralista_nombre=centralista.nombres,
        hora_inicio=ahora,
        estado="ACTIVA"
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return sesion