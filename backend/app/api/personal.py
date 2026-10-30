from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import personal as crud_personal
from app.schemas.personal import PersonalCreate, PersonalResponse, PersonalUpdate
# FIX CRÍTICO (C1): las 3 rutas de /api/personal estaban SIN autenticación.
# Se exige sesión JWT válida (cualquier rol autenticado) en todas ellas.
from app.api.auth import get_current_user
from app.core.security import require_operativo
from app.models.models import Usuario

router = APIRouter(
    prefix="/api/personal",
    tags=["Personal"],
    dependencies=[Depends(get_current_user)],
)

@router.get("/", response_model=list[PersonalResponse])
def listar_personal(skip: int = 0, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    return crud_personal.get_personal_list(db, skip=skip, limit=limit, search=search)

@router.get("/buscar/{cedula}", response_model=PersonalResponse)
def buscar_por_cedula(cedula: str, db: Session = Depends(get_db)):
    personal = crud_personal.get_personal_by_cedula(db, cedula=cedula)
    if not personal:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return personal

@router.post("/", response_model=PersonalResponse, status_code=status.HTTP_201_CREATED)
def crear_personal(
    personal: PersonalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_operativo),
):
    db_personal = crud_personal.get_personal_by_cedula(db, cedula=personal.cedula)
    if db_personal:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    return crud_personal.create_personal(db, personal=personal)