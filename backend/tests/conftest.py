"""
Configuración de fixtures para la suite de pruebas SISCAP (pytest).

Estrategia:
    - Base de datos SQLite en memoria (StaticPool) inyectada vía override de
      get_db — no se requiere PostgreSQL para correr los tests.
    - Esquema creado con Base.metadata.create_all (incluye el índice único
      parcial uq_sesion_activa_por_punto, ignorado por SQLite sin error).
    - Seed mínimo determinístico: turnos, personal (supervisor/centralista),
      zona/punto y un usuario por rol (ADMIN, OPERADOR, OBSERVADOR_SALA).
"""
import os
import sys

# --- Entorno ANTES de importar app (config.py exige DATABASE_URL/SECRET_KEY) ---
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-no-usar-en-produccion"
os.environ["DEBUG"] = "false"
os.environ.setdefault("ENVIRONMENT", "test")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402

# Compatibilidad SQLite (ver app/crud/sesion.py): SQLite ignora la cláusula
# WHERE del índice único parcial uq_sesion_activa_por_punto y lo crea como
# UNIQUE TOTAL sobre punto_control, lo que rompería el bloqueo exclusivo por
# estado en pruebas. Este flag hace que crud.sesion dropee ese índice en los
# tests; la unicidad parcial real se valida en PostgreSQL (producción/CI).
os.environ.setdefault("SISCAP_TEST_DROP_UQ", "1")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.session import Base, get_db  # noqa: E402
from app.models.models import (  # noqa: E402
    Usuario, Turno, Personal, Zona, PuntoControl,
)
from app.core.security import get_password_hash  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402


# ============================================================
# Base de datos de prueba (SQLite en memoria compartida)
# ============================================================
engine_test = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    """Crea el esquema una sola vez por sesión de tests."""
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db():
    """Sesión SQLAlchemy aislada por test.

    IMPORTANTE (arreglo de contaminación entre tests): el endpoint de apertura
    ejecuta db.commit() dentro del request; al compartir la MISMA sesión ORM
    entre el fixture y la app, ese commit persistía datos del test anterior en
    la conexión StaticPool (p. ej. una sesión ACTIVA que hacía fallar la
    apertura del test siguiente con 400 espurio). Por eso, además del rollback
    final, se limpian las tablas de dominio AL INICIO de cada test (ver el
    fixture `seed`), garantizando aislamiento real sin importar los commits.
    """
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db):
    """TestClient con get_db apuntando a la BD de prueba.

    IMPORTANTE: se construye SIN el gestor de contexto (`with`) para NO
    disparar el lifespan de la app. El lifespan ejecuta init_db() sobre el
    engine global (DATABASE_URL=sqlite:///:memory: -> otra BD en memoria
    distinta) y sembraría zonas/puntos duplicados que contaminan los tests
    al compartir la misma conexión StaticPool por nombre de tabla.
    Para pruebas de arranque real existe el fixture `client_lifespan`.
    """
    def _override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    c = TestClient(fastapi_app)
    try:
        yield c
    finally:
        fastapi_app.dependency_overrides.clear()


@pytest.fixture()
def client_lifespan():
    """TestClient con lifespan activo e init_db neutralizado.

    Permite ejercitar el ciclo de vida real de la app (startup/shutdown)
    sin tocar ninguna base de datos: se parcha app.main.init_db.
    """
    import app.main as app_main

    original_init_db = app_main.init_db
    app_main.init_db = lambda: None
    try:
        with TestClient(fastapi_app) as c:
            yield c
    finally:
        app_main.init_db = original_init_db


# ============================================================
# Seed determinístico (se repite por test con limpieza total)
# ============================================================
@pytest.fixture(autouse=True)
def seed(_setup_schema, db):
    """Limpieza total + datos mínimos necesarios para todos los escenarios.

    Se borran TODAS las tablas del dominio (no solo las maestras) porque el
    endpoint de apertura hace commit dentro del request y podría dejar filas
    persistidas que contaminarían el test siguiente (bloqueo exclusivo falso).
    """
    from app.models.models import (
        Sesion, Evento, MovimientoPersonal, MovimientoMaterial,
        MovimientoVisitante,
    )
    db.expunge_all()
    for modelo in (MovimientoVisitante, MovimientoMaterial, MovimientoPersonal,
                   Evento, Sesion, Personal, PuntoControl, Zona, Turno, Usuario):
        db.query(modelo).delete()
    db.commit()

    # Turnos (mismos códigos del seed real)
    db.add_all([
        Turno(codigo="D", nombre="DIURNO (7AM-3PM)", hora_inicio="07:00",
              hora_fin="15:00", duracion_horas=8, cruza_medianoche=False, activo=True),
        Turno(codigo="V", nombre="VESPERTINO (3PM-11PM)", hora_inicio="15:00",
              hora_fin="23:00", duracion_horas=8, cruza_medianoche=False, activo=True),
        Turno(codigo="N", nombre="NOCTURNO (11PM-7AM)", hora_inicio="23:00",
              hora_fin="07:00", duracion_horas=8, cruza_medianoche=True, activo=True),
        Turno(codigo="24H", nombre="24 HORAS (7AM-7AM)", hora_inicio="07:00",
              hora_fin="07:00", duracion_horas=24, cruza_medianoche=True, activo=True),
    ])

    # Zona + puntos de control
    zona = Zona(nombre="Macagua", descripcion="Planta Macagua", estatus="ACTIVO")
    db.add(zona)
    db.flush()
    db.add_all([
        PuntoControl(nombre="PRINCIPAL", estatus="ACTIVO", zona_id=zona.id),
        PuntoControl(nombre="PERIMETRAL", estatus="ACTIVO", zona_id=zona.id),
    ])

    # Personal maestro (supervisor y centralista exigidos en apertura)
    db.add_all([
        Personal(cedula="V-10.000.001", nombres="PEDRO SUPERVISOR", empresa="CVG",
                 gerencia="SEGURIDAD", tipo="INTERNO", estatus="ACTIVO"),
        Personal(cedula="V-10.000.002", nombres="MARIA CENTRALISTA", empresa="CVG",
                 gerencia="OPERACIONES", tipo="INTERNO", estatus="ACTIVO"),
        Personal(cedula="V-10.000.003", nombres="LUIS TRABAJADOR", empresa="CVG",
                 gerencia="MANTENIMIENTO", tipo="INTERNO", estatus="ACTIVO"),
    ])

    # Un usuario por rol
    db.add_all([
        Usuario(usuario="admin_test", password=get_password_hash("admin123"),
                nombre_completo="Administrador Test", rol="ADMIN", estatus="ACTIVO"),
        Usuario(usuario="operador_test", password=get_password_hash("oper123"),
                nombre_completo="Operador Test", rol="OPERADOR", estatus="ACTIVO"),
        Usuario(usuario="sala_test", password=get_password_hash("sala123"),
                nombre_completo="Observador Sala", rol="OBSERVADOR_SALA", estatus="ACTIVO"),
    ])
    db.commit()
    yield


# ============================================================
# Helpers de autenticación
# ============================================================
CREDS = {
    "ADMIN": ("admin_test", "admin123"),
    "OPERADOR": ("operador_test", "oper123"),
    "OBSERVADOR_SALA": ("sala_test", "sala123"),
}


def token_for(client: TestClient, rol: str) -> dict:
    """Obtiene cabecera Authorization Bearer para el rol dado (vía login real)."""
    usuario, password = CREDS[rol]
    r = client.post("/api/auth/login", data={"username": usuario, "password": password})
    assert r.status_code == 200, f"Login falló para {rol}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def auth_admin(client):
    return token_for(client, "ADMIN")


@pytest.fixture()
def auth_operador(client):
    return token_for(client, "OPERADOR")


@pytest.fixture()
def auth_sala(client):
    return token_for(client, "OBSERVADOR_SALA")


# ============================================================
# Payload canónico de apertura de sesión
# ============================================================
@pytest.fixture()
def apertura_payload():
    return {
        "zona": "Macagua",
        "punto_control": "PRINCIPAL",
        "grupo_trabajo": "A",
        "turno_codigo": "D",
        "supervisor_cedula": "V-10.000.001",
        "centralista_cedula": "V-10.000.002",
        "forzar_zona": False,
        "razon_forzado": None,
    }
