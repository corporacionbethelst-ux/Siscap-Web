from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UsuarioBase(BaseModel):
    usuario: str
    nombre_completo: str
    rol: str = "OPERADOR"
    estatus: str = "ACTIVO"

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    estatus: Optional[str] = None
    password: Optional[str] = None

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    usuario: Optional[str] = None