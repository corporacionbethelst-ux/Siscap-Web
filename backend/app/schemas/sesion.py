from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class TurnoResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    hora_inicio: str
    hora_fin: str
    duracion_horas: int
    cruza_medianoche: bool
    activo: bool
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True

class RangoTurnoResponse(BaseModel):
    rango_inicio: str
    rango_fin: str
    dia_operativo: str
    turno_nombre: str

class ValidarPersonaResponse(BaseModel):
    encontrado: bool
    cedula: Optional[str] = None
    nombres: Optional[str] = None
    empresa: Optional[str] = None
    gerencia: Optional[str] = None

class AperturaSesionRequest(BaseModel):
    zona: str
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    supervisor_cedula: str
    centralista_cedula: str
    forzar_zona: bool = False
    razon_forzado: Optional[str] = None

class CierreSesionRequest(BaseModel):
    razon: Optional[str] = None

class LiberacionPuntoRequest(BaseModel):
    sesion_id: int
    razon: str  # obligatoria: exigida por regla de negocio para ADMIN

class SesionResponse(BaseModel):
    id: int
    usuario_nombre: str
    zona: Optional[str] = None
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    turno_nombre: str
    dia_operativo: date
    rango_inicio: datetime
    rango_fin: datetime
    supervisor_nombre: str
    centralista_nombre: str
    hora_inicio: datetime
    estado: str

    class Config:
        from_attributes = True