from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.security import require_operativo  # noqa: F401 (consistencia de guardias)
from app.crud import dashboard as crud_dashboard
from app.db.session import get_db
from app.models.models import Sesion, Usuario
from app.schemas.dashboard import EstadisticasDashboard

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/estadisticas/{sesion_id}", response_model=EstadisticasDashboard)
def obtener_estadisticas(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    sesion = db.query(Sesion).filter(Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return crud_dashboard.obtener_estadisticas_dashboard(db, sesion)
