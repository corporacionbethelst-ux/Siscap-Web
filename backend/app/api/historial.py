import csv
import io
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import historial as crud_historial
from app.schemas.historial import HistorialFiltros, HistorialItem
from app.models.models import Usuario
from app.api.auth import get_current_user
from app.core.security import require_operativo  # noqa: F401 (exportación solo lectura: OBSERVADOR_SALA permitido)

router = APIRouter(prefix="/api/historial", tags=["Historial"])

@router.post("/buscar", response_model=list[HistorialItem])
def buscar_historial(
    filtros: HistorialFiltros,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Búsqueda avanzada con filtros múltiples."""
    return crud_historial.buscar_historial(db, filtros)

@router.post("/exportar-csv")
def exportar_csv(
    filtros: HistorialFiltros,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Exporta el historial filtrado a CSV."""
    resultados = crud_historial.buscar_historial(db, filtros)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    # Encabezados
    writer.writerow([
        "FECHA", "HORA", "TIPO", "CÉDULA", "NOMBRE",
        "EMPRESA/GERENCIA", "TURNO", "GRUPO", "SEMANA", "MOVIMIENTO"
    ])

    # Datos
    for r in resultados:
        writer.writerow([
            str(r["fecha"]),
            r["hora"],
            r["tipo"],
            r["cedula"] or "",
            r["nombre"] or "",
            r["empresa_gerencia"] or "",
            r["turno"] or "",
            r["grupo"] or "",
            r["semana"] or "",
            r["movimiento"]
        ])

    output.seek(0)
    filename = f"historial_{filtros.fecha_desde}_a_{filtros.fecha_hasta}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )