
from pydantic import BaseModel


class EstadisticasDashboard(BaseModel):
    total_personal: int
    total_vehiculos: int
    total_visitantes: int
    entradas_personal: int
    salidas_personal: int
    entradas_materiales: int
    salidas_materiales: int
    entradas_visitantes: int
    salidas_visitantes: int
    personal_dentro: int  # Entradas - Salidas (personas actualmente dentro)
