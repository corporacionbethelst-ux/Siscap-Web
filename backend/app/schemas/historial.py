from datetime import date

from pydantic import BaseModel


class HistorialFiltros(BaseModel):
    fecha_desde: date
    fecha_hasta: date
    tipo: str = "TODOS"
    movimiento: str = "TODOS"
    zona: str | None = None
    punto_control: str | None = None
    gerencia: str | None = None
    empresa: str | None = None
    busqueda: str | None = None
    grupo_trabajo: str | None = None
    numero_semana: int | None = None


class HistorialItem(BaseModel):
    fecha: date
    hora: str
    tipo: str
    cedula: str | None = None
    nombre: str | None = None
    empresa_gerencia: str | None = None
    zona: str | None = None
    punto_control: str | None = None
    turno: str | None = None
    grupo: str | None = None
    semana: str | None = None
    movimiento: str
