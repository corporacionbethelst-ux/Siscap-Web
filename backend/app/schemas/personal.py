from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PersonalBase(BaseModel):
    cedula: str
    nombres: str
    empresa: Optional[str] = None
    gerencia: Optional[str] = None
    tipo: str = "INTERNO"
    estatus: str = "ACTIVO"

class PersonalCreate(PersonalBase):
    pass

class PersonalUpdate(BaseModel):
    nombres: Optional[str] = None
    empresa: Optional[str] = None
    gerencia: Optional[str] = None
    tipo: Optional[str] = None
    estatus: Optional[str] = None

class PersonalResponse(PersonalBase):
    id: int
    fecha_registro: datetime

    class Config:
        from_attributes = True