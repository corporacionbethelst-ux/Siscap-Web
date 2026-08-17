from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.models import Usuario, Turno, Zona, PuntoControl

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_database(db: Session):
    """Carga datos iniciales si la BD está vacía."""
    try:
        # 1. Turnos por defecto
        if db.query(Turno).count() == 0:
            turnos = [
                Turno(codigo="24H", nombre="24 HORAS (7AM-7AM)", hora_inicio="07:00", hora_fin="07:00", duracion_horas=24, cruza_medianoche=True, descripcion="Jornada completa"),
                Turno(codigo="D", nombre="DIURNO (7AM-3PM)", hora_inicio="07:00", hora_fin="15:00", duracion_horas=8, cruza_medianoche=False, descripcion="Turno diurno"),
                Turno(codigo="V", nombre="VESPERTINO (3PM-11PM)", hora_inicio="15:00", hora_fin="23:00", duracion_horas=8, cruza_medianoche=False, descripcion="Turno vespertino"),
                Turno(codigo="N", nombre="NOCTURNO (11PM-7AM)", hora_inicio="23:00", hora_fin="07:00", duracion_horas=8, cruza_medianoche=True, descripcion="Turno nocturno"),
            ]
            db.add_all(turnos)
        
        # 2. Usuarios por defecto
        if db.query(Usuario).filter(Usuario.usuario == "admin").count() == 0:
            db.add(Usuario(usuario="admin", password=pwd_context.hash("admin123"), nombre_completo="Administrador del Sistema", rol="ADMIN"))
        if db.query(Usuario).filter(Usuario.usuario == "operador").count() == 0:
            db.add(Usuario(usuario="operador", password=pwd_context.hash("operador123"), nombre_completo="Operador del Sistema", rol="OPERADOR"))
        
        # NUEVO: Zonas geográficas
        if db.query(Zona).count() == 0:
            zonas = [
                Zona(nombre="MACAGUA", descripcion="Zona industrial Macagua"),
                Zona(nombre="TOCOMA", descripcion="Zona Tocoma"),
                Zona(nombre="GURI", descripcion="Zona Guri - Central Hidroeléctrica"),
                Zona(nombre="CARUACHI", descripcion="Zona Caruachi - Central Hidroeléctrica"),
                Zona(nombre="EDIFICIO SEDE", descripcion="Edificio sede corporativo"),
                Zona(nombre="TORRE CORPORATIVA", descripcion="Torre corporativa"),
            ]
            db.add_all(zonas)   

        db.commit()
        print("✅ Datos iniciales (seed) cargados correctamente")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Error al cargar datos iniciales: {e}")