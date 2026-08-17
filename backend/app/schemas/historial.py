from pydantic import BaseModel
from typing import Optional
from datetime import date


class HistorialFiltros(BaseModel):
    fecha_desde: date
    fecha_hasta: date
    tipo: str = "TODOS"
    movimiento: str = "TODOS"
    zona: Optional[str] = None
    punto_control: Optional[str] = None
    gerencia: Optional[str] = None
    empresa: Optional[str] = None
    busqueda: Optional[str] = None
    grupo_trabajo: Optional[str] = None
    numero_semana: Optional[int] = None


class HistorialItem(BaseModel):
    fecha: date
    hora: str
    tipo: str
    cedula: Optional[str] = None
    nombre: Optional[str] = None
    empresa_gerencia: Optional[str] = None
    zona: Optional[str] = None
    punto_control: Optional[str] = None
    turno: Optional[str] = None
    grupo: Optional[str] = None
    semana: Optional[str] = None
    movimiento: str