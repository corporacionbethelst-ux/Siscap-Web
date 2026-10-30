from datetime import datetime

from pydantic import BaseModel


class PersonalBase(BaseModel):
    cedula: str
    nombres: str
    empresa: str | None = None
    gerencia: str | None = None
    tipo: str = "INTERNO"
    estatus: str = "ACTIVO"

class PersonalCreate(PersonalBase):
    pass

class PersonalUpdate(BaseModel):
    nombres: str | None = None
    empresa: str | None = None
    gerencia: str | None = None
    tipo: str | None = None
    estatus: str | None = None

class PersonalResponse(PersonalBase):
    id: int
    fecha_registro: datetime

    class Config:
        from_attributes = True
