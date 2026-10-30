from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Usuario


settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ============================================================
# CATÁLOGO DE ROLES DEL SISTEMA (única fuente de verdad)
#   ADMIN           : control total (CRUD, liberación forzada, importación)
#   OPERADOR        : operativo — aislado a su punto_control activo
#   OBSERVADOR_SALA : Sala Situacional — proyección GLOBAL de solo lectura
#                     del módulo Protección y Prevención. Sin mutaciones.
# ============================================================
ROLES_VALIDOS = {"ADMIN", "OPERADOR", "OBSERVADOR_SALA"}
ROL_OPERATIVO = "OPERADOR"
ROL_SALA = "OBSERVADOR_SALA"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import jwt
        from app.core.config import get_settings
        settings = get_settings()
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    usuario = db.query(Usuario).filter(Usuario.usuario == username).first()
    if usuario is None:
        raise credentials_exception
    return usuario


def verify_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Dependencia canónica de rol ADMIN (antes duplicada en 3 routers).

    Única fuente de verdad para rutas de escritura administrativa.
    """
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de administrador.",
        )
    return current_user


def require_operativo(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Dependencia para MUTACIONES operativas del módulo Protección y Prevención.

    Regla de modularidad: OBSERVADOR_SALA es estrictamente de SOLO LECTURA;
    cualquier intento de escribir (crear/editar/eliminar) desde ese rol se
    rechaza con 403 explícito. El OPERADOR conserva su flujo normal aislado
    a su punto_control; el ADMIN mantiene control total.
    """
    if current_user.rol == ROL_SALA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Sala Situacional es un módulo de SOLO LECTURA: no puede crear, "
                "actualizar ni eliminar datos de Protección y Prevención."
            ),
        )
    return current_user