from datetime import datetime

from pydantic import BaseModel, field_validator

# Roles aceptados en el CRUD administrativo (incluye el nuevo rol de Sala)
_ROLES_PERMITIDOS = {"ADMIN", "OPERADOR", "OBSERVADOR_SALA"}


def _validar_rol(v: str) -> str:
    if v not in _ROLES_PERMITIDOS:
        raise ValueError(f"Rol inválido '{v}'. Permitidos: {sorted(_ROLES_PERMITIDOS)}")
    return v

# ============================================================
# USUARIOS
# ============================================================
class UsuarioAdminResponse(BaseModel):
    id: int
    usuario: str
    nombre_completo: str
    rol: str
    estatus: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    usuario: str
    password: str
    nombre_completo: str
    rol: str = "OPERADOR"

    @field_validator("rol")
    @classmethod
    def _chk_rol(cls, v: str) -> str:
        return _validar_rol(v)

class UsuarioUpdate(BaseModel):
    nombre_completo: str | None = None
    rol: str | None = None
    estatus: str | None = None
    password: str | None = None

    @field_validator("rol")
    @classmethod
    def _chk_rol(cls, v: str | None) -> str | None:
        return _validar_rol(v) if v is not None else v

# ============================================================
# CATÁLOGOS
# ============================================================
class CatalogoBase(BaseModel):
    nombre: str

class CatalogoResponse(BaseModel):
    id: int
    nombre: str
    estatus: str

    class Config:
        from_attributes = True

# ============================================================
# SESIONES
# ============================================================
class SesionResponse(BaseModel):
    id: int
    usuario_nombre: str
    punto_control: str | None = None
    grupo_trabajo: str | None = None
    turno_codigo: str | None = None
    turno_nombre: str | None = None
    dia_operativo: str | None = None
    supervisor_nombre: str | None = None
    centralista_nombre: str | None = None
    hora_inicio: datetime
    hora_fin: datetime | None = None
    estado: str

    class Config:
        from_attributes = True

# ============================================================
# EVENTOS (AUDITORÍA)
# ============================================================
class EventoResponse(BaseModel):
    id: int
    sesion_id: int | None = None
    usuario: str | None = None
    tipo_evento: str
    accion: str
    detalle: str | None = None
    fecha: str
    hora: str

    class Config:
        from_attributes = True
