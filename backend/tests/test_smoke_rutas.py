"""
Smoke test de inventario de rutas (marca: smoke).

Garantiza que la aplicación FastAPI carga y expone el contrato HTTP canónico
de SISCAP: ~70 operaciones bajo /api/* + /health, incluidas las 7 rutas de
Sala Situacional, el endpoint de liberación forzada y los flujos de sesión.

Si una ruta se renombra o elimina por accidente, estos tests fallan antes de
que lo haga producción. Los asserts usan subconjunto (>=), no igualdad exacta,
para permitir añadir rutas sin romper la suite.
"""
import pytest

from app.main import app as fastapi_app


METODOS_HTTP = {"get", "post", "put", "patch", "delete"}


def _operaciones() -> set:
    """Conjunto de tuplas (METODO, ruta) expuestas en el esquema OpenAPI."""
    schema = fastapi_app.openapi()
    ops = set()
    for path, item in schema["paths"].items():
        for method in item:
            if method in METODOS_HTTP:
                ops.add((method.upper(), path))
    return ops


@pytest.mark.smoke
class TestCargaApp:
    def test_app_carga_y_genera_openapi(self):
        schema = fastapi_app.openapi()
        assert schema["info"]["title"], "La app debe tener título en OpenAPI"
        assert len(schema["paths"]) >= 60, (
            f"Se esperaban >=60 rutas (inventario canónico ~63); hay {len(schema['paths'])}"
        )

    def test_total_operaciones_minimo(self):
        ops = _operaciones()
        # Inventario verificado: 70 operaciones (GET/POST/PUT/PATCH/DELETE)
        assert len(ops) >= 70, f"Inventario de rutas regresó ({len(ops)} < 70)"

    def test_health_sin_auth(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") in ("ok", "OK", "healthy"), body


# Rutas críticas del contrato: (METODO, path). Cualquier ausencia = ruptura.
CRITICAS = [
    # Autenticación
    ("POST", "/api/auth/login"),
    ("GET", "/api/auth/me"),
    # Sesión (bloqueo exclusivo + override ADMIN)
    ("POST", "/api/sesion/apertura"),
    ("POST", "/api/sesion/cerrar/{sesion_id}"),
    ("POST", "/api/sesion/liberar-punto"),          # canónico, razón obligatoria
    ("GET", "/api/sesion/turnos"),
    ("GET", "/api/sesion/rango/{turno_codigo}"),
    ("GET", "/api/sesion/activas-admin"),
    ("GET", "/api/sesion/validar-persona/{cedula}"),
    # RBAC Sala Situacional: 7 endpoints de lectura
    ("GET", "/api/sala-situacional/panorama"),
    ("GET", "/api/sala-situacional/sesiones"),
    ("GET", "/api/sala-situacional/movimientos"),
    ("GET", "/api/sala-situacional/eventos"),
    ("GET", "/api/sala-situacional/personal"),
    ("GET", "/api/sala-situacional/visitantes"),
    ("GET", "/api/sala-situacional/turnos"),
    # Movimientos operativo
    ("POST", "/api/movimientos/personal"),
    ("POST", "/api/movimientos/materiales"),
    ("GET", "/api/movimientos/vehiculos"),
    # Visitantes
    ("POST", "/api/visitantes/movimientos"),
    ("POST", "/api/visitantes/catalogo"),
    # Consulta / historial
    ("GET", "/api/consulta/personal"),
    ("GET", "/api/consulta/vehiculos"),
    ("GET", "/api/consulta/visitantes"),
    ("POST", "/api/historial/buscar"),
    ("POST", "/api/historial/exportar-csv"),
    # Importación UPSERT (9 tipos)
    ("POST", "/api/importacion/upload"),
    ("POST", "/api/importacion/procesar/{archivo_id}"),
    ("GET", "/api/importacion/tipos"),
    ("GET", "/api/importacion/historial"),
    # Zonas como clasificadores en cascada
    ("GET", "/api/zonas/"),
    ("POST", "/api/zonas/"),
    ("GET", "/api/zonas/puntos-control"),
    ("POST", "/api/zonas/puntos-control"),
    ("GET", "/api/zonas/ocupadas"),
    ("POST", "/api/zonas/puntos-control/{punto_id}/liberar"),
    # Admin
    ("GET", "/api/admin/usuarios"),
    ("POST", "/api/admin/usuarios"),
    ("GET", "/api/admin/sesiones"),
    ("GET", "/api/admin/eventos"),
    # Personal / dashboard
    ("GET", "/api/personal/"),
    ("POST", "/api/personal/"),
    ("GET", "/api/dashboard/estadisticas/{sesion_id}"),
]


@pytest.mark.smoke
class TestInventarioRutas:
    @pytest.mark.parametrize("metodo,ruta", CRITICAS, ids=[f"{m} {p}" for m, p in CRITICAS])
    def test_ruta_critica_existe(self, metodo, ruta):
        assert (metodo, ruta) in _operaciones(), (
            f"Ruta crítica ausente del contrato OpenAPI: {metodo} {ruta}"
        )

    def test_no_hay_rutas_sala_con_escritura(self):
        """Regla RBAC: /api/sala-situacional/* solo puede exponer GET."""
        ops = _operaciones()
        escrituras = [
            (m, p) for m, p in ops
            if p.startswith("/api/sala-situacional") and m != "GET"
        ]
        assert escrituras == [], f"Sala Situacional no debe exponer escrituras: {escrituras}"

    def test_404_en_ruta_inexistente(self, client, auth_admin):
        r = client.get("/api/no-existe", headers=auth_admin)
        assert r.status_code == 404


@pytest.mark.smoke
class TestRutasFuncionalesBasicas:
    """Humo funcional: rutas clave responden con auth válida (sin 500)."""

    def test_get_me(self, client, auth_admin):
        r = client.get("/api/auth/me", headers=auth_admin)
        assert r.status_code == 200
        assert r.json()["usuario"] == "admin_test"

    def test_turnos(self, client, auth_operador):
        r = client.get("/api/sesion/turnos", headers=auth_operador)
        assert r.status_code == 200
        codigos = {t["codigo"] for t in r.json()}
        assert {"D", "V", "N", "24H"} <= codigos

    def test_panorama_sala(self, client, auth_sala):
        r = client.get("/api/sala-situacional/panorama", headers=auth_sala)
        assert r.status_code == 200

    def test_login_credenciales_invalidas(self, client):
        r = client.post("/api/auth/login",
                        data={"username": "admin_test", "password": "incorrecta"})
        assert r.status_code in (401, 403)

    def test_sin_token_rechaza(self, client):
        # Rutas protegidas: deben responder 401 sin token.
        for ruta in ("/api/auth/me", "/api/sala-situacional/panorama",
                     "/api/admin/usuarios", "/api/sesion/activas-admin"):
            r = client.get(ruta)
            assert r.status_code == 401, f"{ruta} debe exigir autenticación"

    def test_catalogo_turnos_publico_por_diseno(self, client):
        # Nota de contrato: /api/sesion/turnos y /rango/* NO exigen auth en el
        # diseño actual (catálogo estático de turnos usado antes del login).
        # Si algún día se protegen, este test documenta el cambio intencional.
        r = client.get("/api/sesion/turnos")
        assert r.status_code == 200
