
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


# ============================================================
# USUARIOS Y AUTENTICACIÓN
# ============================================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    rol = Column(String(20), default="OPERADOR")
    estatus = Column(String(20), default="ACTIVO")
    fecha_creacion = Column(DateTime, default=func.now())

    sesiones = relationship("Sesion", back_populates="usuario")


# ============================================================
# CATÁLOGOS MAESTROS
# ============================================================
class PuntoControl(Base):
    __tablename__ = "puntos_control"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    estatus = Column(String(20), default="ACTIVO")
    zona_id = Column(Integer, ForeignKey("zonas.id"), nullable=True)  # ← NUEVO

    zona = relationship("Zona", back_populates="puntos_control")  # ← NUEVO

class Gerencia(Base):
    __tablename__ = "gerencias"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    estatus = Column(String(20), default="ACTIVO")


class EmpresaForanea(Base):
    __tablename__ = "empresas_foraneas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), unique=True, nullable=False)
    estatus = Column(String(20), default="ACTIVO")


class EstatusCatalogo(Base):
    __tablename__ = "estatus_catalogo"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)


class Condicion(Base):
    __tablename__ = "condiciones"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)


class Direccion(Base):
    __tablename__ = "direcciones"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), unique=True, nullable=False)


# ============================================================
# TURNOS
# ============================================================
class Turno(Base):
    __tablename__ = "turnos"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    hora_inicio = Column(String(5), nullable=False)  # "07:00"
    hora_fin = Column(String(5), nullable=False)     # "15:00"
    duracion_horas = Column(Integer, nullable=False)
    cruza_medianoche = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    descripcion = Column(Text)


# ============================================================
# PERSONAL, VEHÍCULOS Y VISITANTES
# ============================================================
class Personal(Base):
    __tablename__ = "personal"
    id = Column(Integer, primary_key=True, index=True)
    cedula = Column(String(30), unique=True, nullable=False, index=True)  # Aumentado a 30
    nombres = Column(String(255), nullable=False)                          # Aumentado a 255
    empresa = Column(String(255))                                          # Aumentado a 255
    gerencia = Column(String(255))                                         # Aumentado a 255
    tipo = Column(String(50), default="INTERNO")
    estatus = Column(String(20), default="ACTIVO")
    fecha_registro = Column(DateTime, default=func.now())


class Vehiculo(Base):
    __tablename__ = "vehiculos"
    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(20), unique=True, nullable=False, index=True)
    modelo = Column(String(50))
    marca = Column(String(50))
    color = Column(String(30))
    serial = Column(String(50))
    anio = Column(String(4))
    condicion = Column(String(50))
    estatus = Column(String(20), default="ACTIVO")
    observacion = Column(Text)


class Visitante(Base):
    __tablename__ = "visitantes"
    id = Column(Integer, primary_key=True, index=True)
    cedula = Column(String(20), unique=True, nullable=False, index=True)
    nombres = Column(String(200), nullable=False)
    empresa = Column(String(150))
    telefono = Column(String(20))
    tipo_visitante = Column(String(50), default="VISITANTE")
    estatus = Column(String(20), default="ACTIVO")
    fecha_registro = Column(DateTime, default=func.now())


# ============================================================
# SESIONES (Apertura de turno)
# ============================================================
class Sesion(Base):
    __tablename__ = "sesiones"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    usuario_nombre = Column(String(150))
    zona = Column(String(100))  # ← NUEVO: Zona geográfica
    punto_control = Column(String(100))
    grupo_trabajo = Column(String(10))
    turno_codigo = Column(String(10))
    turno_nombre = Column(String(100))
    dia_operativo = Column(Date)
    rango_inicio = Column(DateTime)
    rango_fin = Column(DateTime)
    numero_semana = Column(Integer)
    anio_semana = Column(Integer)
    supervisor_cedula = Column(String(20))
    supervisor_nombre = Column(String(200))
    centralista_cedula = Column(String(20))
    centralista_nombre = Column(String(200))
    hora_inicio = Column(DateTime, nullable=False)
    hora_fin = Column(DateTime)
    estado = Column(String(20), default="ACTIVA")

    usuario = relationship("Usuario", back_populates="sesiones")
    eventos = relationship("Evento", back_populates="sesion")
    movimientos_personal = relationship("MovimientoPersonal", back_populates="sesion")
    movimientos_materiales = relationship("MovimientoMaterial", back_populates="sesion")
    movimientos_visitantes = relationship("MovimientoVisitante", back_populates="sesion")

    __table_args__ = (
        # INTEGRIDAD (regla de negocio #2 — bloqueo exclusivo):
        # Garantiza a nivel de BD que un punto de control tenga como máximo
        # UNA sesión ACTIVA, incluso ante aperturas concurrentes (race entre
        # workers Gunicorn). El check-then-insert de crud.sesion.crear_sesion
        # queda respaldado por este índice único parcial (PostgreSQL).
        Index(
            "uq_sesion_activa_por_punto",
            "punto_control",
            unique=True,
            postgresql_where=text("estado = 'ACTIVA'"),
        ),
        # RENDIMIENTO (M-1): bloqueo exclusivo por punto → consulta
        # WHERE punto_control = ? AND estado = 'ACTIVA' en cada apertura/liberación.
        Index("idx_sesion_punto_estado", "punto_control", "estado"),
        # Reportes/historial: filtrado por rango de fechas y aislamiento por punto.
        Index("idx_sesion_fecha_inicio", "hora_inicio"),
        Index("idx_sesion_dia_operativo", "dia_operativo"),
    )


# ============================================================
# AUDITORÍA DE EVENTOS
# ============================================================
class Evento(Base):
    __tablename__ = "eventos"
    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    usuario = Column(String(50))
    tipo_evento = Column(String(50), nullable=False)
    accion = Column(String(100), nullable=False)
    detalle = Column(Text)
    fecha = Column(Date, nullable=False)
    hora = Column(String(8), nullable=False)

    sesion = relationship("Sesion", back_populates="eventos")

    __table_args__ = (
        # RENDIMIENTO (M-1): trazabilidad por sesión en historial de auditoría.
        Index("idx_evento_sesion_fecha", "sesion_id", "fecha"),
    )


# ============================================================
# MOVIMIENTOS
# ============================================================
class MovimientoPersonal(Base):
    __tablename__ = "movimientos_personal"
    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(String(8), nullable=False)
    cedula = Column(String(20), nullable=False, index=True)
    nombres = Column(String(200))
    empresa = Column(String(150))
    tipo_movimiento = Column(String(20), nullable=False)  # ENTRADA / SALIDA
    punto_control = Column(String(100))
    grupo_trabajo = Column(String(10))
    turno_codigo = Column(String(10))
    numero_semana = Column(Integer)
    observacion = Column(Text)

    sesion = relationship("Sesion", back_populates="movimientos_personal")

    __table_args__ = (
        Index("idx_mov_per_turno_fecha", "turno_codigo", "fecha"),
    )


class MovimientoMaterial(Base):
    __tablename__ = "movimientos_materiales"
    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(String(8), nullable=False)
    cedula_conductor = Column(String(20))
    nombres_conductor = Column(String(200))
    descripcion = Column(Text, nullable=False)
    placa_vehiculo = Column(String(20))
    condicion_vehiculo = Column(String(50))
    quien_autoriza = Column(String(150))
    destino = Column(String(150))
    tipo_movimiento = Column(String(20), nullable=False)
    punto_control = Column(String(100))
    grupo_trabajo = Column(String(10))
    turno_codigo = Column(String(10))
    numero_semana = Column(Integer)
    observacion = Column(Text)

    sesion = relationship("Sesion", back_populates="movimientos_materiales")

    __table_args__ = (
        # RENDIMIENTO (M-1): aislamiento por punto_control + filtros de reporte.
        Index("idx_mov_mat_punto_fecha", "punto_control", "fecha"),
        Index("idx_mov_mat_turno_fecha", "turno_codigo", "fecha"),
    )


class MovimientoVisitante(Base):
    __tablename__ = "movimientos_visitantes"
    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(String(8), nullable=False)
    cedula = Column(String(20), nullable=False, index=True)
    nombres = Column(String(200))
    empresa = Column(String(150))
    tipo_visitante = Column(String(50))
    placa_vehiculo = Column(String(20))
    motivo = Column(Text)
    a_quien_visita = Column(String(200))
    gerencia_destino = Column(String(100))
    acompanantes = Column(Integer, default=0)
    tipo_movimiento = Column(String(20), nullable=False)
    punto_control = Column(String(100))
    grupo_trabajo = Column(String(10))
    turno_codigo = Column(String(10))
    numero_semana = Column(Integer)
    observacion = Column(Text)

    sesion = relationship("Sesion", back_populates="movimientos_visitantes")

    __table_args__ = (
        # RENDIMIENTO (M-1): aislamiento por punto_control + filtros de reporte.
        Index("idx_mov_vis_punto_fecha", "punto_control", "fecha"),
        Index("idx_mov_vis_turno_fecha", "turno_codigo", "fecha"),
    )

# ============================================================
# ZONAS GEOGRÁFICAS
# ============================================================
class Zona(Base):
    """Zona geográfica donde opera el sistema (Macagua, Tocoma, etc.)"""
    __tablename__ = "zonas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(String(255))
    estatus = Column(String(20), default="ACTIVO")
    fecha_registro = Column(DateTime, default=func.now())

    puntos_control = relationship("PuntoControl", back_populates="zona")


# ============================================================
# IMPORTACIÓN MASIVA - LOG DE AUDITORÍA
# ============================================================
class ImportacionLog(Base):
    """Registro de auditoría de cada importación masiva realizada."""
    __tablename__ = "importacion_logs"

    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    tipo_importacion = Column(String(50), nullable=False)  # PERSONAL, VEHICULOS, etc.
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    usuario_nombre = Column(String(150))
    fecha_importacion = Column(DateTime, default=func.now())

    # Estadísticas del proceso
    total_filas = Column(Integer, default=0)
    insertados = Column(Integer, default=0)
    actualizados = Column(Integer, default=0)
    omitidos = Column(Integer, default=0)
    errores = Column(Integer, default=0)

    # Detalles de errores (JSON)
    detalles_error = Column(Text)  # JSON string con lista de errores

    # Estado y ubicación
    estado = Column(String(20), default="COMPLETADO")  # COMPLETADO, PARCIAL, FALLIDO
    ruta_archivo = Column(String(500))
    tamano_archivo_kb = Column(Integer, default=0)

    # Tiempo de procesamiento
    tiempo_procesamiento_seg = Column(Integer, default=0)
