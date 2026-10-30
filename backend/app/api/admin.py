from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import admin as crud_admin
from app.schemas.admin import (
    UsuarioAdminResponse, UsuarioCreate, UsuarioUpdate,
    CatalogoResponse, CatalogoBase,
    SesionResponse, EventoResponse
)
from app.models.models import Usuario
from app.api.auth import get_current_user
from app.core.security import verify_admin  # dependencia canónica (antes duplicada aquí)

router = APIRouter(prefix="/api/admin", tags=["Administración"])

# ============================================================
# USUARIOS
# ============================================================
@router.get("/usuarios", response_model=list[UsuarioAdminResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_usuarios(db)

@router.post("/usuarios", response_model=UsuarioAdminResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        return crud_admin.crear_usuario(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/usuarios/{usuario_id}", response_model=UsuarioAdminResponse)
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        return crud_admin.actualizar_usuario(db, usuario_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================
# CATÁLOGOS
# ============================================================
@router.get("/puntos-control", response_model=list[CatalogoResponse])
def listar_puntos_control(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_puntos_control(db)

@router.post("/puntos-control", response_model=CatalogoResponse, status_code=status.HTTP_201_CREATED)
def crear_punto_control(
    data: CatalogoBase,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        return crud_admin.crear_punto_control(db, data.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/gerencias", response_model=list[CatalogoResponse])
def listar_gerencias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_gerencias(db)

@router.post("/gerencias", response_model=CatalogoResponse, status_code=status.HTTP_201_CREATED)
def crear_gerencia(
    data: CatalogoBase,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        return crud_admin.crear_gerencia(db, data.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/empresas-foraneas", response_model=list[CatalogoResponse])
def listar_empresas_foraneas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_empresas_foraneas(db)

@router.post("/empresas-foraneas", response_model=CatalogoResponse, status_code=status.HTTP_201_CREATED)
def crear_empresa_foranea(
    data: CatalogoBase,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    try:
        return crud_admin.crear_empresa_foranea(db, data.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================
# SESIONES
# ============================================================
@router.get("/sesiones", response_model=list[SesionResponse])
def listar_sesiones(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_sesiones(db, limit=limit)

# ============================================================
# EVENTOS (AUDITORÍA)
# ============================================================
@router.get("/eventos", response_model=list[EventoResponse])
def listar_eventos(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    return crud_admin.get_eventos(db, limit=limit)