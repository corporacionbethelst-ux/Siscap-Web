from datetime import date

from pydantic import BaseModel


# ============================================================
# MOVIMIENTOS DE PERSONAL
# ============================================================
class MovimientoPersonalCreate(BaseModel):
    cedula: str
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: str | None = ""

class MovimientoPersonalResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula: str
    nombres: str
    empresa: str | None = None
    tipo_movimiento: str
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    numero_semana: int | None = None
    observacion: str | None = None

    class Config:
        from_attributes = True

# ============================================================
# MOVIMIENTOS DE MATERIALES
# ============================================================
class MovimientoMaterialCreate(BaseModel):
    cedula_conductor: str | None = ""
    descripcion: str
    placa_vehiculo: str | None = ""
    condicion_vehiculo: str | None = ""
    quien_autoriza: str | None = ""
    destino: str | None = ""
    tipo_movimiento: str  # "ENTRADA" o "SALIDA"
    observacion: str | None = ""

class MovimientoMaterialResponse(BaseModel):
    id: int
    sesion_id: int
    fecha: date
    hora: str
    cedula_conductor: str | None = None
    nombres_conductor: str | None = None
    descripcion: str
    placa_vehiculo: str | None = None
    condicion_vehiculo: str | None = None
    quien_autoriza: str | None = None
    destino: str | None = None
    tipo_movimiento: str
    punto_control: str
    grupo_trabajo: str
    turno_codigo: str
    observacion: str | None = None

    class Config:
        from_attributes = True

class VehiculoResponse(BaseModel):
    id: int
    placa: str
    modelo: str | None = None
    marca: str | None = None
    color: str | None = None
    condicion: str | None = None
    estatus: str | None = None

    class Config:
        from_attributes = True
