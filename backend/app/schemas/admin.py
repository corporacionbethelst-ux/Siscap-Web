from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    estatus: Optional[str] = None
    password: Optional[str] = None

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