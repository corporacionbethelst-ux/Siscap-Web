from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.models import Usuario
from app.schemas.user import UsuarioCreate, UsuarioUpdate


def get_usuario_by_username(db: Session, usuario: str):
    return db.query(Usuario).filter(Usuario.usuario == usuario).first()

def get_usuario_by_id(db: Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()

def create_usuario(db: Session, usuario: UsuarioCreate):
    hashed_password = get_password_hash(usuario.password)
    db_usuario = Usuario(
        usuario=usuario.usuario,
        password=hashed_password,
        nombre_completo=usuario.nombre_completo,
        rol=usuario.rol,
        estatus=usuario.estatus
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def update_usuario(db: Session, db_usuario: Usuario, usuario_data: UsuarioUpdate):
    update_data = usuario_data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    for field, value in update_data.items():
        setattr(db_usuario, field, value)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario
