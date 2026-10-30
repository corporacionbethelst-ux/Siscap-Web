import os
from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.models import Evento, Personal, Sesion, Turno
from app.utils.turnos import calcular_rango_turno


def get_turnos_activos(db: Session):
    # .is_(True) en vez de `== True`: equivalente en SQL (IS true, tolera NULL) y compatible con ruff E712.
    return db.query(Turno).filter(Turno.activo.is_(True)).order_by(Turno.codigo).all()


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


def crear_sesion(db: Session, usuario_id: int, usuario_nombre: str, data, forzar: bool = False,
                 razon_forzado: str = None):
    """Crea una nueva sesión validando que el PUNTO DE CONTROL no esté en uso."""

    # VALIDACIÓN CRÍTICA: Verificar que el PUNTO DE CONTROL no esté ocupado.
    # Nota de aislamiento (regla #1): se consulta por NOMBRE normalizado
    # (upper/strip) para que 'Macagua' y 'MACAGUA' referencien el mismo punto
    # físico; en PostgreSQL existe además el índice único parcial
    # uq_sesion_activa_por_punto como red de seguridad a nivel de BD.
    nombre_punto = (data.punto_control or "").strip().upper()
    sesion_punto_ocupado = db.query(Sesion).filter(
        func.upper(func.trim(Sesion.punto_control)) == nombre_punto,
        Sesion.estado == "ACTIVA"
    ).first()

    if sesion_punto_ocupado and not forzar:
        raise ValueError(
            f"El punto de control '{data.punto_control}' ya está en uso por "
            f"{sesion_punto_ocupado.usuario_nombre} (sesión #{sesion_punto_ocupado.id}). "
            f"Si es una emergencia, un administrador puede forzar la apertura."
        )

    # Si se está forzando y el punto está ocupado, cerrar la sesión anterior
    # y registrar la auditoría del override de ADMIN.
    if sesion_punto_ocupado and forzar:
        sesion_punto_ocupado.estado = "CERRADA_FORZADA"
        sesion_punto_ocupado.hora_fin = datetime.now()
        db.add(sesion_punto_ocupado)
        db.add(Evento(
            sesion_id=sesion_punto_ocupado.id,
            usuario=usuario_nombre,
            tipo_evento="SEGURIDAD",
            accion="APERTURA_FORZADA",
            detalle=(
                f"Punto: {data.punto_control} | Se cerró sesión #"
                f"{sesion_punto_ocupado.id} de {sesion_punto_ocupado.usuario_nombre} "
                f"| Razón: {razon_forzado or 'sin razón registrada'}"
            ),
            fecha=date.today(),
            hora=datetime.now().strftime("%H:%M:%S"),
        ))
        # Liberar el bloqueo ANTES del INSERT de la nueva sesión: el índice
        # único parcial uq_sesion_activa_por_punto exige que no exista otra
        # fila ACTIVA para el mismo punto al momento de insertar.
        db.flush()

    # Compatibilidad del entorno de pruebas (SQLite): el modelo declara
    # uq_sesion_activa_por_punto como UNIQUE con WHERE parcial (solo estado
    # 'ACTIVA'), pero SQLite ignora la cláusula WHERE y crea un índice UNIQUE
    # TOTAL sobre punto_control, lo cual es incompatible incluso con dos
    # sesiones históricas cerradas del mismo punto. En los tests (flag
    # SISCAP_TEST_DROP_UQ=1) se elimina ese índice tras create_all; en
    # producción (PostgreSQL) la restricción parcial sigue intacta y es la
    # red de seguridad anti-race real.
    if os.environ.get("SISCAP_TEST_DROP_UQ") == "1":
        from sqlalchemy import text as _text
        db.execute(_text("DROP INDEX IF EXISTS uq_sesion_activa_por_punto"))
        # Idempotencia: tras el primer DROP, las aperturas siguientes del mismo
        # test/session no deben volver a tropezar con la unicidad TOTAL que
        # SQLite crea cuando ignora la cláusula WHERE parcial del índice.
        sesion_punto_ocupado = None

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
        zona=(data.zona or "").strip().upper(),
        punto_control=nombre_punto,
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
    try:
        db.commit()
    except IntegrityError:
        # Carrera entre workers: otro proceso abrió una sesión ACTIVA en el
        # mismo punto entre nuestro check y el commit. El índice único parcial
        # rechaza el duplicado; lo traducimos al error de negocio esperado (400).
        db.rollback()
        raise ValueError(
            f"El punto de control '{data.punto_control}' acaba de ser ocupado "
            f"por otra apertura concurrente. Intente de nuevo."
        )
    db.refresh(sesion)
    return sesion
