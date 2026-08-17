from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Zona, PuntoControl, Sesion


# ============================================================
# ZONAS
# ============================================================
def get_zonas(db: Session):
    return db.query(Zona).filter(Zona.estatus == "ACTIVO").order_by(Zona.nombre).all()


def get_zonas_con_estado(db: Session):
    """Lista todas las zonas con información básica y cantidad de puntos.
    NOTA: Las zonas ya no tienen estado 'en_uso' porque la restricción es por Punto de Control."""
    zonas = db.query(Zona).order_by(Zona.nombre).all()
    resultado = []
    
    for zona in zonas:
        # Solo contamos cuántos puntos de control activos tiene asignados esta zona
        total_puntos = db.query(func.count(PuntoControl.id)).filter(
            PuntoControl.zona_id == zona.id,
            PuntoControl.estatus == "ACTIVO"
        ).scalar() or 0
        
        resultado.append({
            "id": zona.id,
            "nombre": zona.nombre,
            "descripcion": zona.descripcion,
            "estatus": zona.estatus,
            "fecha_registro": zona.fecha_registro,
            "total_puntos": total_puntos
            # Se eliminaron 'en_uso' y 'usuario_en_uso'
        })
    
    return resultado


def get_zonas_disponibles(db: Session):
    zonas_ocupadas = db.query(Sesion.zona).filter(
        Sesion.estado == "ACTIVA",
        Sesion.zona.isnot(None)
    ).distinct().all()
    nombres_ocupados = [z[0] for z in zonas_ocupadas]
    
    return db.query(Zona).filter(
        Zona.estatus == "ACTIVO",
        ~Zona.nombre.in_(nombres_ocupados)
    ).order_by(Zona.nombre).all()


def get_zona_by_id(db: Session, zona_id: int):
    return db.query(Zona).filter(Zona.id == zona_id).first()


def get_zona_by_nombre(db: Session, nombre: str):
    return db.query(Zona).filter(Zona.nombre == nombre).first()


def crear_zona(db: Session, nombre: str, descripcion: str = None):
    existente = db.query(Zona).filter(Zona.nombre == nombre.upper().strip()).first()
    if existente:
        raise ValueError(f"La zona '{nombre}' ya existe")
    
    zona = Zona(
        nombre=nombre.upper().strip(),
        descripcion=descripcion,
        estatus="ACTIVO"
    )
    db.add(zona)
    db.commit()
    db.refresh(zona)
    return zona


def actualizar_zona(db: Session, zona_id: int, data) -> Zona:
    """Actualiza una zona existente."""
    zona = get_zona_by_id(db, zona_id)
    if not zona:
        raise ValueError("Zona no encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Si cambia el nombre, validar que no exista otra con ese nombre
    if "nombre" in update_data and update_data["nombre"]:
        nuevo_nombre = update_data["nombre"].upper().strip()
        if nuevo_nombre != zona.nombre:
            existente = db.query(Zona).filter(
                Zona.nombre == nuevo_nombre,
                Zona.id != zona_id
            ).first()
            if existente:
                raise ValueError(f"Ya existe otra zona con el nombre '{nuevo_nombre}'")
            update_data["nombre"] = nuevo_nombre
            
            # Actualizar también las sesiones que tenían el nombre antiguo
            db.query(Sesion).filter(Sesion.zona == zona.nombre).update(
                {"zona": nuevo_nombre}, synchronize_session=False
            )
    
    for field, value in update_data.items():
        setattr(zona, field, value)
    
    db.commit()
    db.refresh(zona)
    return zona


# ============================================================
# PUNTOS DE CONTROL
# ============================================================
def get_puntos_control(db: Session, zona_id: int = None):
    """Lista puntos de control, opcionalmente filtrados por zona."""
    query = db.query(PuntoControl).filter(PuntoControl.estatus == "ACTIVO")
    if zona_id is not None:
        query = query.filter(PuntoControl.zona_id == zona_id)
    return query.order_by(PuntoControl.nombre).all()


def get_punto_control_by_id(db: Session, punto_id: int):
    return db.query(PuntoControl).filter(PuntoControl.id == punto_id).first()


def crear_punto_control(db: Session, nombre: str, zona_id: int = None):
    existente = db.query(PuntoControl).filter(
        PuntoControl.nombre == nombre.upper().strip()
    ).first()
    if existente:
        raise ValueError(f"El punto de control '{nombre}' ya existe")
    
    punto = PuntoControl(
        nombre=nombre.upper().strip(),
        zona_id=zona_id,
        estatus="ACTIVO"
    )
    db.add(punto)
    db.commit()
    db.refresh(punto)
    return punto


def actualizar_punto_control(db: Session, punto_id: int, data) -> PuntoControl:
    """Actualiza un punto de control."""
    punto = get_punto_control_by_id(db, punto_id)
    if not punto:
        raise ValueError("Punto de control no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "nombre" in update_data and update_data["nombre"]:
        nuevo_nombre = update_data["nombre"].upper().strip()
        if nuevo_nombre != punto.nombre:
            existente = db.query(PuntoControl).filter(
                PuntoControl.nombre == nuevo_nombre,
                PuntoControl.id != punto_id
            ).first()
            if existente:
                raise ValueError(f"Ya existe otro punto con el nombre '{nuevo_nombre}'")
            update_data["nombre"] = nuevo_nombre
    
    for field, value in update_data.items():
        setattr(punto, field, value)
    
    db.commit()
    db.refresh(punto)
    return punto

def get_puntos_control_con_estado(db: Session):
    """Lista todos los puntos de control con información de si están en uso."""
    puntos = db.query(PuntoControl).order_by(PuntoControl.nombre).all()
    resultado = []
    
    for punto in puntos:
        # Buscar si hay una sesión ACTIVA en este punto de control
        sesion_activa = db.query(Sesion).filter(
            Sesion.punto_control == punto.nombre,
            Sesion.estado == "ACTIVA"
        ).first()
        
        resultado.append({
            "id": punto.id,
            "nombre": punto.nombre,
            "estatus": punto.estatus,
            "zona_id": punto.zona_id,
            "zona_nombre": punto.zona.nombre if punto.zona else None,
            "en_uso": sesion_activa is not None,
            "usuario_en_uso": sesion_activa.usuario_nombre if sesion_activa else None,
            "sesion_id": sesion_activa.id if sesion_activa else None,
            "zona_en_uso": False  # Ya no se usa, pero se mantiene por compatibilidad
        })
    
    return resultado