from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.models import (
    EmpresaForanea,
    Evento,
    Gerencia,
    PuntoControl,
    Sesion,
    Usuario,
)
from app.schemas.admin import UsuarioCreate, UsuarioUpdate


# ============================================================
# USUARIOS
# ============================================================
def get_usuarios(db: Session):
    return db.query(Usuario).order_by(Usuario.id).all()

def get_usuario_by_id(db: Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()

def crear_usuario(db: Session, data: UsuarioCreate):
    # Verificar si el usuario ya existe
    existente = db.query(Usuario).filter(Usuario.usuario == data.usuario).first()
    if existente:
        raise ValueError("El usuario ya existe")

    usuario = Usuario(
        usuario=data.usuario,
        password=get_password_hash(data.password),
        nombre_completo=data.nombre_completo,
        rol=data.rol,
        estatus="ACTIVO"
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

def actualizar_usuario(db: Session, usuario_id: int, data: UsuarioUpdate):
    usuario = get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise ValueError("Usuario no encontrado")

    update_data = data.dict(exclude_unset=True)

    # Si hay contraseña, hashearla
    if update_data.get("password"):
        update_data["password"] = get_password_hash(update_data["password"])
    elif "password" in update_data:
        del update_data["password"]

    for field, value in update_data.items():
        setattr(usuario, field, value)

    db.commit()
    db.refresh(usuario)
    return usuario

# ============================================================
# CATÁLOGOS
# ============================================================
def get_puntos_control(db: Session):
    return db.query(PuntoControl).order_by(PuntoControl.nombre).all()

def get_gerencias(db: Session):
    return db.query(Gerencia).order_by(Gerencia.nombre).all()

def get_empresas_foraneas(db: Session):
    return db.query(EmpresaForanea).order_by(EmpresaForanea.nombre).all()

def crear_punto_control(db: Session, nombre: str):
    existente = db.query(PuntoControl).filter(PuntoControl.nombre == nombre).first()
    if existente:
        raise ValueError("El punto de control ya existe")
    pc = PuntoControl(nombre=nombre, estatus="ACTIVO")
    db.add(pc)
    db.commit()
    db.refresh(pc)
    return pc

def crear_gerencia(db: Session, nombre: str):
    existente = db.query(Gerencia).filter(Gerencia.nombre == nombre).first()
    if existente:
        raise ValueError("La gerencia ya existe")
    ger = Gerencia(nombre=nombre, estatus="ACTIVO")
    db.add(ger)
    db.commit()
    db.refresh(ger)
    return ger

def crear_empresa_foranea(db: Session, nombre: str):
    existente = db.query(EmpresaForanea).filter(EmpresaForanea.nombre == nombre).first()
    if existente:
        raise ValueError("La empresa ya existe")
    emp = EmpresaForanea(nombre=nombre, estatus="ACTIVO")
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

# ============================================================
# SESIONES
# ============================================================
def get_sesiones(db: Session, limit: int = 100):
    return db.query(Sesion).order_by(Sesion.hora_inicio.desc()).limit(limit).all()

# ============================================================
# EVENTOS (AUDITORÍA)
# ============================================================
def get_eventos(db: Session, limit: int = 200):
    return db.query(Evento).order_by(Evento.fecha.desc(), Evento.hora.desc()).limit(limit).all()
