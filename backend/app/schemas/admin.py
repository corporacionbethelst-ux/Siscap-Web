from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

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
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    estatus: Optional[str] = None
    password: Optional[str] = None

    @field_validator("rol")
    @classmethod
    def _chk_rol(cls, v: Optional[str]) -> Optional[str]:
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
    punto_control: Optional[str] = None
    grupo_trabajo: Optional[str] = None
    turno_codigo: Optional[str] = None
    turno_nombre: Optional[str] = None
    dia_operativo: Optional[str] = None
    supervisor_nombre: Optional[str] = None
    centralista_nombre: Optional[str] = None
    hora_inicio: datetime
    hora_fin: Optional[datetime] = None
    estado: str

    class Config:
        from_attributes = True

# ============================================================
# EVENTOS (AUDITORÍA)
# ============================================================
class EventoResponse(BaseModel):
    id: int
    sesion_id: Optional[int] = None
    usuario: Optional[str] = None
    tipo_evento: str
    accion: str
    detalle: Optional[str] = None
    fecha: str
    hora: str

    class Config:
        from_attributes = True