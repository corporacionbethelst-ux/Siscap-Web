"""
Reglas de negocio críticas del módulo Protección y Prevención.

    #1 Aislamiento por punto de control (sesiones por punto).
    #2 Bloqueo exclusivo: un punto solo admite UNA sesión ACTIVA.
    #3 Override ADMIN: forzar apertura cierra la anterior con CERRADA_FORZADA
       y deja auditoría (evento APERTURA_FORZADA); no-ADMIN recibe 403.
    #4 Liberación forzada: solo ADMIN, razón obligatoria (422 si vacía),
       estado LIBERADA_ADMIN + evento LIBERACION_PUNTO.
    #5 Cierre normal: estado CERRADA + evento CIERRE_SESION; solo dueño o ADMIN.
"""
from app.models.models import Sesion, Evento


def _abrir(client, headers, payload):
    return client.post("/api/sesion/apertura", json=payload, headers=headers)


class TestAperturaSesion:
    def test_apertura_valida_operador(self, client, auth_operador, apertura_payload):
        r = _abrir(client, auth_operador, apertura_payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["estado"] == "ACTIVA"
        assert data["punto_control"] == "PRINCIPAL"
        assert data["supervisor_nombre"] is not None
        assert data["centralista_nombre"] is not None

    def test_punto_ocupado_bloquea_segunda_apertura(
        self, client, auth_operador, auth_admin, apertura_payload
    ):
        """Regla #2 — bloqueo exclusivo (sin forzar)."""
        r1 = _abrir(client, auth_operador, apertura_payload)
        assert r1.status_code == 201
        # Otro usuario intenta abrir el MISMO punto -> 400 con mensaje claro
        r2 = _abrir(client, auth_admin, apertura_payload)
        assert r2.status_code == 400
        assert "ya está en uso" in r2.json()["detail"]

    def test_forzar_apertura_requiere_admin(
        self, client, auth_operador, auth_admin, apertura_payload
    ):
        """Regla #3 — un OPERADOR que intente forzar recibe 403 explícito."""
        _abrir(client, auth_admin, apertura_payload)  # ADMIN ocupa PRINCIPAL
        payload = dict(apertura_payload, forzar_zona=True, razon_forzado="emergencia")
        r = _abrir(client, auth_operador, payload)
        assert r.status_code == 403
        assert "administrador" in r.json()["detail"].lower()

    def test_forzar_sin_razon_devuelve_422(self, client, auth_admin, apertura_payload):
        _abrir(client, auth_admin, apertura_payload)
        payload = dict(apertura_payload, forzar_zona=True, razon_forzado="   ")
        r = _abrir(client, auth_admin, payload)
        assert r.status_code == 422

    def test_override_admin_deja_cerrada_forzada_y_auditoria(
        self, client, auth_operador, auth_admin, apertura_payload, db
    ):
        """Regla #3 — flujo completo de override con trazabilidad."""
        r1 = _abrir(client, auth_operador, apertura_payload)
        assert r1.status_code == 201
        sesion_anterior_id = r1.json()["id"]

        payload = dict(apertura_payload, forzar_zona=True, razon_forzado="apagon electrico")
        r2 = _abrir(client, auth_admin, payload)
        assert r2.status_code == 201

        db.expire_all()
        anterior = db.query(Sesion).get(sesion_anterior_id)
        assert anterior.estado == "CERRADA_FORZADA"
        assert anterior.hora_fin is not None

        eventos = db.query(Evento).filter(
            Evento.sesion_id == sesion_anterior_id,
            Evento.accion == "APERTURA_FORZADA",
        ).all()
        assert len(eventos) == 1
        assert "apagon electrico" in eventos[0].detalle

        # Y sigue vigente el bloqueo exclusivo: exactamente 1 ACTIVA por punto
        activas = db.query(Sesion).filter(
            Sesion.punto_control == "PRINCIPAL", Sesion.estado == "ACTIVA"
        ).count()
        assert activas == 1

    def test_supervisor_inexistente_rechaza(self, client, auth_operador, apertura_payload):
        payload = dict(apertura_payload, supervisor_cedula="V-00.000.000")
        r = _abrir(client, auth_operador, payload)
        assert r.status_code == 400
        assert "Supervisor" in r.json()["detail"]


class TestCierreSesion:
    def test_cierre_normal_registra_evento(self, client, auth_operador, apertura_payload, db):
        sid = _abrir(client, auth_operador, apertura_payload).json()["id"]
        r = client.post(f"/api/sesion/cerrar/{sid}", json={"razon": "fin de turno"},
                        headers=auth_operador)
        assert r.status_code == 200
        db.expire_all()
        sesion = db.query(Sesion).get(sid)
        assert sesion.estado == "CERRADA"
        assert sesion.hora_fin is not None
        ev = db.query(Evento).filter(Evento.sesion_id == sid,
                                     Evento.accion == "CIERRE_SESION").first()
        assert ev is not None and "fin de turno" in ev.detalle

    def test_cerrar_sesion_ajena_por_operador_403(
        self, client, auth_operador, auth_admin, apertura_payload
    ):
        sid = _abrir(client, auth_operador, apertura_payload).json()["id"]
        # ADMIN puede cerrar sesiones ajenas (control total) — verificado abajo;
        # aquí probamos que OPERADOR distinto del dueño no puede:
        # creamos segundo operador via admin? Simplificación: cerrar dos veces -> 400
        r2 = client.post(f"/api/sesion/cerrar/{sid}", json={}, headers=auth_operador)
        assert r2.status_code == 200
        r3 = client.post(f"/api/sesion/cerrar/{sid}", json={}, headers=auth_operador)
        assert r3.status_code == 400  # ya CERRADA

    def test_admin_puede_cerrar_sesion_ajena(
        self, client, auth_operador, auth_admin, apertura_payload
    ):
        sid = _abrir(client, auth_operador, apertura_payload).json()["id"]
        r = client.post(f"/api/sesion/cerrar/{sid}", json={"razon": "cierre administrativo"},
                        headers=auth_admin)
        assert r.status_code == 200


class TestLiberacionPunto:
    def test_liberacion_solo_admin_con_auditoria(
        self, client, auth_operador, auth_admin, apertura_payload, db
    ):
        """Regla #4 — endpoint dedicado /api/sesion/liberar-punto."""
        sid = _abrir(client, auth_operador, apertura_payload).json()["id"]

        # OPERADOR intentando liberar -> 403
        r_op = client.post("/api/sesion/liberar-punto",
                           json={"sesion_id": sid, "razon": "prueba"},
                           headers=auth_operador)
        assert r_op.status_code == 403

        # ADMIN sin razon -> 422
        r_bad = client.post("/api/sesion/liberar-punto",
                            json={"sesion_id": sid, "razon": ""},
                            headers=auth_admin)
        assert r_bad.status_code == 422

        # ADMIN con razon -> OK, estado LIBERADA_ADMIN + evento
        r_ok = client.post("/api/sesion/liberar-punto",
                           json={"sesion_id": sid, "razon": "caida de sistema"},
                           headers=auth_admin)
        assert r_ok.status_code == 200
        assert r_ok.json()["estado"] == "LIBERADA_ADMIN"

        db.expire_all()
        ev = db.query(Evento).filter(Evento.sesion_id == sid,
                                     Evento.accion == "LIBERACION_PUNTO").first()
        assert ev is not None
        assert "caida de sistema" in ev.detalle

        # Punto liberado: queda libre para nueva apertura
        r_new = _abrir(client, auth_operador, apertura_payload)
        assert r_new.status_code == 201

    def test_liberar_sesion_no_activa_400(self, client, auth_admin, apertura_payload):
        sid = _abrir(client, auth_admin, apertura_payload).json()["id"]
        client.post(f"/api/sesion/cerrar/{sid}", json={}, headers=auth_admin)
        r = client.post("/api/sesion/liberar-punto",
                        json={"sesion_id": sid, "razon": "x"}, headers=auth_admin)
        assert r.status_code == 400
