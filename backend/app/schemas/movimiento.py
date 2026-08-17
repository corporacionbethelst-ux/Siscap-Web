from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

# ============================================================
# MOVIMIENTOS DE PERSONAL
# ============================================================
class MovimientoPersonalCreate(BaseModel):
    cedula: str
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: Optional[str] = ""

class MovimientoPersonalResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula: str
    nombres: str
    empresa: Optional[str] = None
    tipo_movimiento: str
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    numero_semana: Optional[int] = None
    observacion: Optional[str] = None

    class Config:
        from_attributes = True

# ============================================================
# MOVIMIENTOS DE MATERIALES
# ============================================================
class MovimientoMaterialCreate(BaseModel):
    cedula_conductor: Optional[str] = ""
    descripcion: str
    placa_vehiculo: Optional[str] = ""
    condicion_vehiculo: Optional[str] = ""
    quien_autoriza: Optional[str] = ""
    destino: Optional[str] = ""
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: Optional[str] = ""

class MovimientoMaterialResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula_conductor: Optional[str] = None
    nombres_conductor: Optional[str] = None
    descripcion: str
    placa_vehiculo: Optional[str] = None
    condicion_vehiculo: Optional[str] = None
    quien_autoriza: Optional[str] = None
    destino: Optional[str] = None
    tipo_movimiento: str
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    observacion: Optional[str] = None

    class Config:
        from_attributes = True

class VehiculoResponse(BaseModel):
    id: int
    placa: str
    modelo: Optional[str] = None
    marca: Optional[str] = None
    color: Optional[str] = None
    condicion: Optional[str] = None
    estatus: Optional[str] = None

    class Config:
        from_attributes = True