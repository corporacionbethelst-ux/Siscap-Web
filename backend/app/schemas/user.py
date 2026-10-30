from datetime import datetime

from pydantic import BaseModel


class UsuarioBase(BaseModel):
    usuario: str
    nombre_completo: str
    rol: str = "OPERADOR"
    estatus: str = "ACTIVO"

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nombre_completo: str | None = None
    rol: str | None = None
    estatus: str | None = None
    password: str | None = None

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    usuario: str | None = None
