"""
RBAC del módulo SALA SITUACIONAL (Capa de Proyección de Solo Lectura).

Cubre las reglas de negocio de modularidad:
    1. OBSERVADOR_SALA y ADMIN pueden leer la proyección global (200).
    2. OPERADOR queda excluido de Sala (403).
    3. Sin autenticación -> 401.
    4. OBSERVADOR_SALA NO puede mutar datos operativos (403 con mensaje
       "SOLO LECTURA") — ni siquiera por endpoints que heredan get_current_user.
    5. El router de Sala solo expone métodos GET (no existen POST/PUT/DELETE).
"""

SALA_ENDPOINTS = [
    "/api/sala-situacional/panorama",
    "/api/sala-situacional/sesiones",
    "/api/sala-situacional/movimientos",
    "/api/sala-situacional/personal",
    "/api/sala-situacional/visitantes",
    "/api/sala-situacional/eventos",
    "/api/sala-situacional/turnos",
]


# ------------------------------------------------------------
# 1. Lectura permitida para roles de Sala
# ------------------------------------------------------------
def test_observador_sala_puede_leer_todos_los_endpoints(client, auth_sala):
    for url in SALA_ENDPOINTS:
        r = client.get(url, headers=auth_sala)
        assert r.status_code == 200, f"{url} -> {r.status_code}: {r.text[:120]}"


def test_admin_puede_leer_panorama(client, auth_admin):
    r = client.get("/api/sala-situacional/panorama", headers=auth_admin)
    assert r.status_code == 200
    data = r.json()
    # Estructura KPI esperada (dict con contadores globales)
    assert isinstance(data, dict)


# ------------------------------------------------------------
# 2. OPERADOR excluido de la proyección global
# ------------------------------------------------------------
def test_operador_no_puede_acceder_a_sala(client, auth_operador):
    for url in SALA_ENDPOINTS:
        r = client.get(url, headers=auth_operador)
        assert r.status_code == 403, f"{url} debería rechazar a OPERADOR"
        assert "solo lectura" in r.json()["detail"].lower() or "Sala" in r.json()["detail"]


# ------------------------------------------------------------
# 3. Anónimo sin token -> 401
# ------------------------------------------------------------
def test_sin_token_devuelve_401(client):
    r = client.get("/api/sala-situacional/panorama")
    assert r.status_code == 401


def test_token_invalido_devuelve_401(client):
    r = client.get(
        "/api/sala-situacional/panorama",
        headers={"Authorization": "Bearer no.es.un.jwt.valido"},
    )
    assert r.status_code == 401


# ------------------------------------------------------------
# 4. OBSERVADOR_SALA bloqueado en TODAS las rutas de escritura
# ------------------------------------------------------------
class TestEscrituraBloqueadaParaSala:
    """require_operativo debe devolver 403 'SOLO LECTURA' al rol sala."""

    def test_apertura_sesion_bloqueada(self, client, auth_sala, apertura_payload):
        r = client.post("/api/sesion/apertura", json=apertura_payload, headers=auth_sala)
        assert r.status_code == 403
        assert "SOLO LECTURA" in r.json()["detail"]

    def test_cierre_sesion_bloqueado(self, client, auth_sala):
        r = client.post("/api/sesion/cerrar/1", json={}, headers=auth_sala)
        assert r.status_code == 403
        assert "SOLO LECTURA" in r.json()["detail"]

    def test_liberar_punto_bloqueado(self, client, auth_sala):
        # Antes el check de rol era interno; ahora require_operativo lo corta
        # ANTES con 403 de solo lectura (o el 403 propio de ADMIN — ambos válidos).
        r = client.post(
            "/api/sesion/liberar-punto",
            json={"sesion_id": 1, "razon": "prueba RBAC"},
            headers=auth_sala,
        )
        assert r.status_code == 403

    def test_movimiento_personal_bloqueado(self, client, auth_sala):
        r = client.post(
            "/api/movimientos/personal?sesion_id=1",
            json={"cedula": "V-10.000.003", "tipo_movimiento": "ENTRADA", "observacion": ""},
            headers=auth_sala,
        )
        assert r.status_code == 403
        assert "SOLO LECTURA" in r.json()["detail"]

    def test_alta_personal_bloqueada(self, client, auth_sala):
        r = client.post(
            "/api/personal/",
            json={"cedula": "V-99.999.999", "nombres": "NO DEBE CREARSE",
                  "empresa": "X", "gerencia": "Y", "tipo": "INTERNO", "estatus": "ACTIVO"},
            headers=auth_sala,
        )
        assert r.status_code == 403
        # Confirmar que NO se escribió nada (regla de no-mutación)
        found = client.get("/api/personal/buscar/V-99.999.999", headers=auth_sala)
        assert found.status_code == 404

    def test_alta_visitante_bloqueada(self, client, auth_sala):
        r = client.post(
            "/api/visitantes/catalogo",
            json={"cedula": "V-88.888.888", "nombres": "VISITANTE FANTASMA",
                  "empresa": None, "telefono": None,
                  "tipo_visitante": "VISITANTE", "estatus": "ACTIVO"},
            headers=auth_sala,
        )
        assert r.status_code == 403

    def test_admin_no_puede_registrar_movimientos(self, client, auth_admin):
        """El ADMIN tiene control administrativo, pero el flujo operativo es
        de OPERADORES: registrar movimientos con una sesión ajena/no activa falla."""
        r = client.post(
            "/api/movimientos/personal?sesion_id=999",
            json={"cedula": "V-10.000.003", "tipo_movimiento": "ENTRADA", "observacion": ""},
            headers=auth_admin,
        )
        assert r.status_code == 400  # "No hay sesión activa"


# ------------------------------------------------------------
# 5. Inventario HTTP del router Sala: solo GET existe
# ------------------------------------------------------------
def test_router_sala_sin_metodos_de_escritura(client, auth_sala):
    for url in SALA_ENDPOINTS:
        for method in (client.post, client.put, client.patch, client.delete):
            r = method(url, headers=auth_sala)
            assert r.status_code == 405, f"{method.__name__.upper()} {url} no debería existir"


# ------------------------------------------------------------
# 6. Login y emisión de tokens por rol
# ------------------------------------------------------------
def test_login_correcto_por_rol(client):
    for rol, (usuario, password) in {
        "ADMIN": ("admin_test", "admin123"),
        "OPERADOR": ("operador_test", "oper123"),
        "OBSERVADOR_SALA": ("sala_test", "sala123"),
    }.items():
        r = client.post("/api/auth/login", data={"username": usuario, "password": password})
        assert r.status_code == 200, f"login {rol}"
        assert r.json()["token_type"] == "bearer"


def test_login_password_incorrecto_401(client):
    r = client.post("/api/auth/login", data={"username": "admin_test", "password": "MAL"})
    assert r.status_code == 401


def test_me_refleja_rol_observador(client, auth_sala):
    r = client.get("/api/auth/me", headers=auth_sala)
    assert r.status_code == 200
    assert r.json()["rol"] == "OBSERVADOR_SALA"
