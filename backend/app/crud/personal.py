from sqlalchemy.orm import Session
from app.models.models import Personal
from app.schemas.personal import PersonalCreate, PersonalUpdate

def get_personal_by_cedula(db: Session, cedula: str):
    return db.query(Personal).filter(Personal.cedula == cedula).first()

def get_personal_list(db: Session, skip: int = 0, limit: int = 50, search: str = ""):
    query = db.query(Personal)
    if search:
        query = query.filter(
            (Personal.cedula.ilike(f"%{search}%")) | 
            (Personal.nombres.ilike(f"%{search}%"))
        )
    return query.order_by(Personal.nombres).offset(skip).limit(limit).all()

def create_personal(db: Session, personal: PersonalCreate):
    db_personal = Personal(**personal.model_dump())
    db.add(db_personal)
    db.commit()
    db.refresh(db_personal)
    return db_personal

def update_personal(db: Session, db_personal: Personal, personal_data: PersonalUpdate):
    update_data = personal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_personal, field, value)
    db.commit()
    db.refresh(db_personal)
    return db_personal