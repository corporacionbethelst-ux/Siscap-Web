from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.db.init_db import init_db
from app.api import auth, personal, sesion, movimiento, visitante, dashboard, historial, admin, importacion, zona, consulta

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Inicializar BD y datos por defecto
    init_db()
    yield
    # Shutdown
    print("🛑 Apagando aplicación SISCAP...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema de Control de Pases y Materiales - API Web",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar los routers de la API
app.include_router(auth.router)
app.include_router(personal.router)
app.include_router(sesion.router)
app.include_router(movimiento.router)
app.include_router(visitante.router)
app.include_router(dashboard.router)
app.include_router(historial.router)
app.include_router(admin.router)
app.include_router(importacion.router)
app.include_router(zona.router)
app.include_router(consulta.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}