from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Personal, Vehiculo, Visitante, Usuario
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/consulta", tags=["Consulta de Datos"])


# ============================================================
# PERSONAL
# ============================================================
@router.get("/personal")
def listar_personal(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todo el personal registrado."""
    personal = db.query(Personal).order_by(Personal.nombres).all()
    return [
        {
            "id": p.id,
            "cedula": p.cedula,
            "nombres": p.nombres,
            "empresa": p.empresa,
            "gerencia": p.gerencia,
            "tipo": p.tipo,
            "estatus": p.estatus,
            "fecha_registro": p.fecha_registro.isoformat() if p.fecha_registro else None
        }
        for p in personal
    ]


# ============================================================
# VEHÍCULOS
# ============================================================
@router.get("/vehiculos")
def listar_vehiculos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todos los vehículos registrados."""
    vehiculos = db.query(Vehiculo).order_by(Vehiculo.placa).all()
    return [
        {
            "id": v.id,
            "placa": v.placa,
            "marca": v.marca,
            "modelo": v.modelo,
            "color": v.color,
            "anio": v.anio,
            "condicion": v.condicion,
            "serial": v.serial,
            "observacion": v.observacion
        }
        for v in vehiculos
    ]


# ============================================================
# VISITANTES
# ============================================================
@router.get("/visitantes")
def listar_visitantes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todos los visitantes registrados."""
    visitantes = db.query(Visitante).order_by(Visitante.nombres).all()
    return [
        {
            "id": v.id,
            "cedula": v.cedula,
            "nombres": v.nombres,
            "empresa": v.empresa,
            "telefono": v.telefono,
            "tipo_visitante": v.tipo_visitante,
            "estatus": v.estatus,
            "fecha_registro": v.fecha_registro.isoformat() if v.fecha_registro else None
        }
        for v in visitantes
    ]