from datetime import datetime

from pydantic import BaseModel


class ZonaBase(BaseModel):
    nombre: str
    descripcion: str | None = None


class ZonaCreate(ZonaBase):
    pass


class ZonaUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    estatus: str | None = None


class ZonaResponse(ZonaBase):
    id: int
    estatus: str
    fecha_registro: datetime
    # Campos heredados del modelo antiguo "zona en uso" (obsoletos desde v6.0:
    # el bloqueo es por PUNTO DE CONTROL, no por zona). Se conservan como
    # opcionales con default para no romper clientes antiguos.
    en_uso: bool = False
    usuario_en_uso: str | None = None
    sesion_id: int | None = None
    total_puntos: int = 0  # ← NUEVO: Cantidad de puntos asignados

    class Config:
        from_attributes = True


class PuntoControlBase(BaseModel):
    nombre: str
    zona_id: int | None = None


class PuntoControlCreate(PuntoControlBase):
    pass


class PuntoControlUpdate(BaseModel):
    nombre: str | None = None
    zona_id: int | None = None
    estatus: str | None = None


class PuntoControlResponse(BaseModel):
    id: int
    nombre: str
    estatus: str
    zona_id: int | None = None
    zona_nombre: str | None = None

    class Config:
        from_attributes = True
