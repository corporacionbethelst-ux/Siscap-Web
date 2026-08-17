from app.db.session import engine, Base
from app.core.seed import seed_database
from app.core.upload_config import get_upload_paths
from sqlalchemy.orm import Session

# IMPORTANTE: Importar todos los modelos para que SQLAlchemy los conozca
from app.models import models  # noqa


def init_db():
    """
    Inicializa la base de datos y el sistema de archivos:
    1. Crea todas las tablas definidas en los modelos si no existen.
    2. Crea las carpetas de uploads.
    3. Ejecuta el script de datos iniciales (seed).
    """
    print("🔄 Inicializando base de datos...")
    
    # 1. Crear tablas
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas de la base de datos creadas/verificadas correctamente.")
    
    # 2. Crear carpetas de uploads (NUEVO)
    try:
        paths = get_upload_paths()
        print(f"✅ Carpetas de uploads creadas en: {paths['base']}")
    except Exception as e:
        print(f"⚠️ Error al crear carpetas de uploads: {e}")
    
    # 3. Cargar datos iniciales
    try:
        with Session(engine) as db:
            seed_database(db)
        print("✅ Datos iniciales cargados correctamente.")
    except Exception as e:
        print(f"⚠️ Error al cargar datos iniciales: {e}")