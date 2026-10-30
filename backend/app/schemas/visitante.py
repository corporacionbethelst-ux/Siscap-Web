from datetime import date, datetime

from pydantic import BaseModel


class VisitanteBase(BaseModel):
    cedula: str
    nombres: str
    empresa: str | None = None
    telefono: str | None = None
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
    placa_vehiculo: str | None = ""
    motivo: str | None = ""
    a_quien_visita: str | None = ""
    gerencia_destino: str | None = ""
    acompanantes: int = 0
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: str | None = ""

class MovimientoVisitanteResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula: str
    nombres: str | None = None
    empresa: str | None = None
    tipo_visitante: str | None = None
    placa_vehiculo: str | None = None
    motivo: str | None = None
    a_quien_visita: str | None = None
    gerencia_destino: str | None = None
    acompanantes: int | None = 0
    tipo_movimiento: str
    punto_control: str
    observacion: str | None = None

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
