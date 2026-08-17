from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class VisitanteBase(BaseModel):
    cedula: str
    nombres: str
    empresa: Optional[str] = None
    telefono: Optional[str] = None
    tipo_visitante: str = "VISITANTE"

class VisitanteCreate(VisitanteBase):
    pass

class VisitanteResponse(VisitanteBase):
    id: int
    estatus: str
    fecha_registro: datetime

    class Config:
        from_attributes = True

class MovimientoVisitanteCreate(BaseModel):
    cedula: str
    tipo_visitante: str
    placa_vehiculo: Optional[str] = ""
    motivo: Optional[str] = ""
    a_quien_visita: Optional[str] = ""
    gerencia_destino: Optional[str] = ""
    acompanantes: int = 0
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: Optional[str] = ""

class MovimientoVisitanteResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula: str
    nombres: Optional[str] = None
    empresa: Optional[str] = None
    tipo_visitante: Optional[str] = None
    placa_vehiculo: Optional[str] = None
    motivo: Optional[str] = None
    a_quien_visita: Optional[str] = None
    gerencia_destino: Optional[str] = None
    acompanantes: Optional[int] = 0
    tipo_movimiento: str
    punto_control: str
    observacion: Optional[str] = None

    class Config:
        from_attributes = True

class GerenciaResponse(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True

class EmpresaResponse(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True