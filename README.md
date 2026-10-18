# 🛡️ SISCAP Web — Sistema de Control de Acceso y Personal

**Versión:** 6.0 · **Unidad:** Seguridad Integral · **Departamento activo:** Protección y Prevención

Aplicación web para el control de acceso, materiales y visitantes en puntos de control, con apertura/cierre de turno validado, auditoría de eventos e importación masiva de datos maestros.

## 🏗️ Arquitectura

| Capa | Tecnología | Ubicación |
|------|------------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind (glassmorphism oscuro) | `frontend/` |
| Backend | FastAPI + SQLAlchemy 2 + Pydantic v2 | `backend/app/` |
| Base de datos | PostgreSQL 15 | docker compose |
| Producción | Gunicorn (4 workers UvicornWorker) + Nginx SSL + rate limiting | `Dockerfile.prod`, `nginx/`, `docker-compose.production.yml` |

**Organización del backend:** `api/` (rutas por módulo), `crud/` (acceso a datos), `models/` (tablas), `schemas/` (validación), `core/` (config, seguridad, motor UPSERT de importación).

**Modularidad por departamento:** el frontend registra departamentos en `frontend/src/config/departamentos.ts`. Cada departamento nuevo (p. ej. **Sala Situacional**) se monta como rutas/hijos propios sin tocar los módulos de Protección y Prevención. En backend, los routers FastAPI se registran independientemente en `app/main.py`.

## 🔐 Reglas de negocio críticas

1. **Aislamiento por punto de control:** cada movimiento (personal/materiales/visitantes) pertenece a la sesión ACTIVA del punto; las consultas filtran por `sesion_id`.
2. **Bloqueo exclusivo:** un punto solo admite UNA sesión `ACTIVA` (validado en `crud/sesion.crear_sesion`).
3. **Override ADMIN:** la apertura forzada cierra la sesión anterior como `CERRADA_FORZADA` y la liberación manual como `LIBERADA_ADMIN`; ambas escriben en la tabla `eventos` (auditoría). La liberación exige razón.
   - Endpoint canónico: `POST /api/sesion/liberar-punto` (solo ADMIN).
   - `POST /api/zonas/puntos-control/{id}/liberar` está **DEPRECADO**: delega en el canónico (compatibilidad hacia atrás).
4. **Zonas como clasificadores:** cascada Zona → Punto (la zona filtra puntos disponibles; no bloquea).
5. **Importación masiva:** motor UPSERT (`INSERT … ON CONFLICT DO UPDATE`) para 9 tipos de datos maestros, con reporte de errores por fila.

## 🚀 Ejecución en desarrollo

```bash
# 1. Base de datos + servicios
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env          # complete SECRET_KEY: python -c "import secrets; print(secrets.token_urlsafe(64))"
pip install -r requirements.txt
uvicorn app.main:app --reload # http://localhost:8000/docs

# 3. Frontend
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## 📦 Despliegue en producción

```bash
cp .env.production .env.production.local   # Y rellene secretos (nunca versionar)
docker compose -f docker-compose.production.yml --env-file .env.production.local up -d --build
./scripts/healthcheck.sh                   # verificación db/backend/frontend
./scripts/backup.sh ./backups              # pg_dump + uploads + checksums (retención 30 días)
./scripts/restore.sh backups/siscap_db_<TS>.dump
```

Coloque sus certificados en `nginx/ssl/fullchain.pem` y `nginx/ssl/privkey.pem` (ignorados por git). El proxy aplica HSTS, rate limiting (login 5 r/m) y redirige HTTP→HTTPS.

## 🧪 Estado de verificación

- Backend: 67 rutas; autenticación JWT obligatoria en todos los módulos operativos (incluido `/api/personal` desde v6.0.1).
- Frontend: compila con `tsc --noEmit` sin errores.
- Pendiente: suite de pruebas automatizadas (pytest/vitest) y migraciones Alembic versionadas.

## 🗂️ Estructura

```
backend/    app/{api,crud,models,schemas,core,db,utils}  Dockerfile[.prod]  .env.example
frontend/   src/{pages,components,services,config,types} Dockerfile[.prod]  nginx.conf
nginx/      nginx.conf + ssl/                            scripts/ backup|restore|healthcheck
docker-compose.yml (dev) · docker-compose.production.yml (prod) · .env.production (plantilla)
```
# Siscap-Web
Sistema para en control de acceso de personal
