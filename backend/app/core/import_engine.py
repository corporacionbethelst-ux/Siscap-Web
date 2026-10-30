"""
Motor de importación UPSERT (Insert or Update) usando PostgreSQL nativo.
Procesa archivos fila por fila con lógica anti-duplicados robusta.
"""
import json
import re
import time

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.models import (
    Condicion,
    Direccion,
    EmpresaForanea,
    Gerencia,
    ImportacionLog,
    Personal,
    PuntoControl,
    Vehiculo,
    Visitante,
    Zona,
)


def limpiar_texto(valor) -> str:
    """Limpia el texto: elimina caracteres nulos, convierte a string y quita espacios."""
    if valor is None:
        return ""
    return str(valor).replace('\x00', '').replace('\r', '').strip()


def normalizar_placa(placa: str) -> str:
    if not placa:
        return ""
    return placa.upper().replace(" ", "").replace("-", "").strip()


def normalizar_cedula(cedula: str) -> str:
    if not cedula:
        return ""
    cedula = cedula.strip().upper()
    for prefijo in ["V-", "E-", "V ", "E ", "V:", "E:"]:
        cedula = cedula.removeprefix(prefijo)
    return cedula.strip()


TIPOS_IMPORTACION = {
    "PERSONAL": {
        "nombre": "Personal Activo",
        "descripcion": "Empleados, contratistas y personal interno",
        "columna_clave": "cedula",
        "columnas_requeridas": ["cedula", "nombres"],
        "mapeo_columnas": {
            "cedula": ["cedula", "cédula", "ci", "cedula_rif", "identificacion"],
            "nombres": ["nombres", "nombre", "nombres y apellidos", "nombre completo", "nombre_completo"],
            "empresa": ["empresa", "compania", "compañia", "razon_social"],
            "gerencia": ["gerencia", "gerencias", "departamento", "area", "área"],
            "tipo": ["tipo", "tipo_personal", "categoria", "categoría"],
            "estatus": ["estatus", "estado", "status"],
        }
    },
    "VEHICULOS": {
        "nombre": "Vehículos",
        "descripcion": "Vehículos registrados con sus datos",
        "columna_clave": "placa",
        "columnas_requeridas": ["placa"],
        "mapeo_columnas": {
            "placa": ["placa", "placas", "matricula", "matrícula"],
            "modelo": ["modelo"],
            "marca": ["marca", "make"],
            "color": ["color"],
            "serial": ["serial", "chasis", "vin", "serial_carroceria"],
            "anio": ["anio", "año", "year", "modelo_anio"],
            "condicion": ["condicion", "condición", "estatus", "estado"],
            "observacion": ["observacion", "observación", "obs", "notas"],
        }
    },
    "VISITANTES": {
        "nombre": "Visitantes",
        "descripcion": "Visitantes frecuentes y contactos",
        "columna_clave": "cedula",
        "columnas_requeridas": ["cedula", "nombres"],
        "mapeo_columnas": {
            "cedula": ["cedula", "cédula", "ci", "identificacion"],
            "nombres": ["nombres", "nombre", "nombres y apellidos"],
            "empresa": ["empresa", "compania", "compañia"],
            "telefono": ["telefono", "teléfono", "tel", "celular", "movil"],
            "tipo_visitante": ["tipo", "tipo_visitante", "categoria"],
        }
    },
    "PUNTOS_CONTROL": {
        "nombre": "Puntos de Control",
        "descripcion": "Puntos o puestos de seguridad (con zona opcional)",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "punto", "punto de control", "punto_control"],
            "zona": ["zona", "zona_geografica", "zona geografica", "ubicacion"],
        }
    },
    "GERENCIAS": {
        "nombre": "Gerencias",
        "descripcion": "Gerencias o departamentos",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "gerencia", "gerencias", "departamento"],
        }
    },
    "EMPRESAS_FORANEAS": {
        "nombre": "Empresas Foráneas",
        "descripcion": "Empresas externas o contratistas",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "empresa", "empresas", "empresa_foranea", "razon_social"],
        }
    },
    "CONDICIONES": {
        "nombre": "Condiciones",
        "descripcion": "Condiciones de vehículos o equipos",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "condicion", "condición"],
        }
    },
    "DIRECCIONES": {
        "nombre": "Direcciones",
        "descripcion": "Direcciones o ubicaciones",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "direccion", "dirección", "ubicacion", "ubicación"],
        }
    },
    "ZONAS": {
        "nombre": "Zonas Geográficas",
        "descripcion": "Zonas o regiones donde opera el sistema",
        "columna_clave": "nombre",
        "columnas_requeridas": ["nombre"],
        "mapeo_columnas": {
            "nombre": ["nombre", "zona", "zona_geografica"],
            "descripcion": ["descripcion", "descripción", "detalle"],
        }
    },
}


def mapear_columnas(columnas_archivo: list[str], tipo: str) -> dict[str, str | None]:
    """Mapea las columnas del archivo, tolerante a sufijos numéricos (ej: Cédula__998)."""
    config = TIPOS_IMPORTACION.get(tipo)
    if not config:
        raise ValueError(f"Tipo de importación desconocido: {tipo}")

    mapeo = {}
    columnas_normalizadas = {}
    for c in columnas_archivo:
        if not c:
            continue
        c_lower = c.lower().strip()
        c_clean = re.sub(r'__\d+$', '', c_lower)
        c_clean = re.sub(r'_\d+$', '', c_clean)
        columnas_normalizadas[c_clean] = c

    for campo_sistema, posibles_nombres in config["mapeo_columnas"].items():
        mapeo[campo_sistema] = None
        for nombre_posible in posibles_nombres:
            if nombre_posible.lower().strip() in columnas_normalizadas:
                mapeo[campo_sistema] = columnas_normalizadas[nombre_posible.lower().strip()]
                break
    return mapeo


def validar_columnas_requeridas(mapeo: dict[str, str | None], tipo: str) -> tuple[bool, list[str]]:
    config = TIPOS_IMPORTACION[tipo]
    errores = [f"Columna requerida '{col_req}' no encontrada" for col_req in config["columnas_requeridas"] if not mapeo.get(col_req)]
    return len(errores) == 0, errores


def procesar_importacion(
    db: Session, tipo: str, filas: list[dict], mapeo: dict[str, str | None],
    usuario_id: int, usuario_nombre: str, nombre_archivo: str, ruta_archivo: str, tamano_kb: int
) -> ImportacionLog:
    inicio_tiempo = time.time()
    insertados = 0
    actualizados = 0
    omitidos = 0
    errores = 0
    detalles_error = []

    for idx, fila in enumerate(filas, start=2):
        try:
            resultado = _procesar_fila(db, tipo, fila, mapeo)
            if resultado == "INSERT":
                insertados += 1
            elif resultado == "UPDATE":
                actualizados += 1
            elif resultado == "SKIP":
                omitidos += 1

            # Commit cada 100 filas para liberar memoria y asegurar progreso
            if (insertados + actualizados + omitidos + errores) % 100 == 0:
                db.commit()

        except Exception as e:
            errores += 1
            print(f"❌ ERROR en fila {idx}: {e}")
            detalles_error.append({
                "fila": idx,
                "error": str(e),
                "datos": {k: fila.get(v, "") for k, v in mapeo.items() if v}
            })
            db.rollback()  # Revierte solo el estado sucio de esta fila fallida

    # Commit final de cualquier registro pendiente
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errores += 1
        detalles_error.append({"fila": "FINAL", "error": f"Error en commit final: {e!s}"})

    tiempo_total = int(time.time() - inicio_tiempo)
    estado = "COMPLETADO" if errores == 0 else ("PARCIAL" if (insertados + actualizados) > 0 else "FALLIDO")

    log = ImportacionLog(
        nombre_archivo=nombre_archivo,
        tipo_importacion=tipo,
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        total_filas=len(filas),
        insertados=insertados,
        actualizados=actualizados,
        omitidos=omitidos,
        errores=errores,
        detalles_error=json.dumps(detalles_error, ensure_ascii=False),
        estado=estado,
        ruta_archivo=ruta_archivo,
        tamano_archivo_kb=tamano_kb,
        tiempo_procesamiento_seg=tiempo_total
    )

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _procesar_fila(db: Session, tipo: str, fila: dict, mapeo: dict[str, str | None]) -> str:
    valores = {campo: limpiar_texto(fila.get(col)) for campo, col in mapeo.items() if col}

    config = TIPOS_IMPORTACION[tipo]
    for col_req in config["columnas_requeridas"]:
        if not valores.get(col_req):
            raise ValueError(f"Campo requerido '{col_req}' está vacío")

    if tipo == "PERSONAL":
        return _upsert_personal(db, valores)
    elif tipo == "VEHICULOS":
        return _upsert_vehiculos(db, valores)
    elif tipo == "VISITANTES":
        return _upsert_visitantes(db, valores)
    elif tipo == "ZONAS":
        return _upsert_zonas(db, valores)
    elif tipo == "PUNTOS_CONTROL":
        return _upsert_puntos_control(db, valores)
    elif tipo in ["GERENCIAS", "EMPRESAS_FORANEAS", "CONDICIONES", "DIRECCIONES"]:
        return _upsert_catalogo(db, tipo, valores)
    else:
        raise ValueError(f"Tipo no soportado: {tipo}")


def _upsert_personal(db: Session, valores: dict) -> str:
    cedula = normalizar_cedula(valores["cedula"])
    nombres = valores["nombres"].upper()
    empresa = valores.get("empresa", "").upper() or None
    gerencia = valores.get("gerencia", "").upper() or None
    tipo = valores.get("tipo", "INTERNO").upper()
    estatus = valores.get("estatus", "ACTIVO").upper()

    # Verificamos si existe para saber si contar como INSERT o UPDATE
    existente = db.query(Personal).filter(Personal.cedula == cedula).first()

    stmt = insert(Personal).values(
        cedula=cedula, nombres=nombres, empresa=empresa, gerencia=gerencia, tipo=tipo, estatus=estatus
    )

    if existente:
        do_update = stmt.on_conflict_do_update(
            index_elements=['cedula'],
            set_=dict(nombres=nombres, empresa=empresa, gerencia=gerencia, tipo=tipo, estatus=estatus)
        )
        db.execute(do_update)
        return "UPDATE"
    else:
        db.execute(stmt)
        return "INSERT"


def _upsert_vehiculos(db: Session, valores: dict) -> str:
    placa = normalizar_placa(valores["placa"])
    existente = db.query(Vehiculo).filter(Vehiculo.placa == placa).first()

    datos = {
        "placa": placa, "modelo": valores.get("modelo") or None, "marca": valores.get("marca") or None,
        "color": valores.get("color") or None, "serial": valores.get("serial") or None,
        "anio": valores.get("anio") or None, "condicion": valores.get("condicion") or None,
        "observacion": valores.get("observacion") or None
    }

    stmt = insert(Vehiculo).values(**datos)
    if existente:
        db.execute(stmt.on_conflict_do_update(index_elements=['placa'], set_=datos))
        return "UPDATE"
    else:
        db.execute(stmt)
        return "INSERT"


def _upsert_visitantes(db: Session, valores: dict) -> str:
    cedula = normalizar_cedula(valores["cedula"])
    nombres = valores["nombres"].upper()
    existente = db.query(Visitante).filter(Visitante.cedula == cedula).first()

    datos = {
        "cedula": cedula, "nombres": nombres,
        "empresa": valores.get("empresa", "").upper() or None,
        "telefono": valores.get("telefono") or None,
        "tipo_visitante": valores.get("tipo_visitante", "VISITANTE").upper()
    }

    stmt = insert(Visitante).values(**datos)
    if existente:
        db.execute(stmt.on_conflict_do_update(index_elements=['cedula'], set_=datos))
        return "UPDATE"
    else:
        db.execute(stmt)
        return "INSERT"


def _upsert_catalogo(db: Session, tipo: str, valores: dict) -> str:
    nombre = valores["nombre"].strip().upper()
    modelos = {
        "PUNTOS_CONTROL": PuntoControl, "GERENCIAS": Gerencia, "EMPRESAS_FORANEAS": EmpresaForanea,
        "CONDICIONES": Condicion, "DIRECCIONES": Direccion,
    }
    modelo = modelos[tipo]
    existente = db.query(modelo).filter(modelo.nombre == nombre).first()

    if existente:
        return "SKIP"
    else:
        db.execute(insert(modelo).values(nombre=nombre))
        return "INSERT"

def _upsert_zonas(db: Session, valores: dict) -> str:
    """UPSERT para Zonas Geográficas (clave: nombre)."""
    nombre = valores["nombre"].strip().upper()
    descripcion = valores.get("descripcion", "").strip() or None

    existente = db.query(Zona).filter(Zona.nombre == nombre).first()
    if existente:
        if descripcion:
            existente.descripcion = descripcion
            return "UPDATE"
        return "SKIP"
    else:
        db.add(Zona(nombre=nombre, descripcion=descripcion, estatus="ACTIVO"))
        return "INSERT"


def _upsert_puntos_control(db: Session, valores: dict) -> str:
    """UPSERT para Puntos de Control con lookup automático de zona."""
    nombre = valores["nombre"].strip().upper()
    zona_nombre = valores.get("zona", "").strip().upper()

    # Lookup de zona_id (si se especificó zona)
    zona_id = None
    if zona_nombre:
        zona = db.query(Zona).filter(Zona.nombre == zona_nombre).first()
        if zona:
            zona_id = zona.id
        else:
            raise ValueError(
                f"La zona '{zona_nombre}' no existe. "
                f"Importe primero el archivo de ZONAS."
            )

    existente = db.query(PuntoControl).filter(PuntoControl.nombre == nombre).first()
    if existente:
        existente.zona_id = zona_id
        return "UPDATE"
    else:
        db.add(PuntoControl(nombre=nombre, zona_id=zona_id, estatus="ACTIVO"))
        return "INSERT"

def obtener_tipos_disponibles() -> list[dict]:
    return [
        {"codigo": codigo, "nombre": config["nombre"], "descripcion": config["descripcion"],
         "columna_clave": config["columna_clave"], "columnas_requeridas": config["columnas_requeridas"]}
        for codigo, config in TIPOS_IMPORTACION.items()
    ]
