from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ZonaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class ZonaCreate(ZonaBase):
    pass


class ZonaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estatus: Optional[str] = None


class ZonaResponse(ZonaBase):
    id: int
    estatus: str
    fecha_registro: datetime
    # Campos heredados del modelo antiguo "zona en uso" (obsoletos desde v6.0:
    # el bloqueo es por PUNTO DE CONTROL, no por zona). Se conservan como
    # opcionales con default para no romper clientes antiguos.
    en_uso: bool = False
    usuario_en_uso: Optional[str] = None
    sesion_id: Optional[int] = None
    total_puntos: int = 0  # ← NUEVO: Cantidad de puntos asignados

    class Config:
        from_attributes = True


class PuntoControlBase(BaseModel):
    nombre: str
    zona_id: Optional[int] = None


class PuntoControlCreate(PuntoControlBase):
    pass


class PuntoControlUpdate(BaseModel):
    nombre: Optional[str] = None
    zona_id: Optional[int] = None
    estatus: Optional[str] = None


class PuntoControlResponse(BaseModel):
    id: int
    nombre: str
    estatus: str
    zona_id: Optional[int] = None
    zona_nombre: Optional[str] = None

    class Config:
        from_attributes = True