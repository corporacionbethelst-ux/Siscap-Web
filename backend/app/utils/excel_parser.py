"""
Parser de archivos Excel/CSV para importación masiva.
Soporta formatos .xlsx, .xls y .csv con detección automática.
"""
import csv
from pathlib import Path

from openpyxl import load_workbook


def parse_excel_file(file_path: str, max_preview: int = 10) -> tuple[list[str], list[dict], int]:
    """
    Lee un archivo Excel/CSV y retorna:
    - Lista de nombres de columnas detectadas
    - Lista de filas (como diccionarios)
    - Total de filas en el archivo

    Args:
        file_path: Ruta al archivo
        max_preview: Máximo de filas a retornar (0 = todas)

    Returns:
        (columnas, filas, total_filas)
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".csv":
        return _parse_csv(file_path, max_preview)
    elif ext in [".xlsx", ".xls"]:
        return _parse_excel(file_path, max_preview)
    else:
        raise ValueError(f"Formato no soportado: {ext}")


def _parse_csv(file_path: str, max_preview: int) -> tuple[list[str], list[dict], int]:
    """Parser específico para archivos CSV."""
    columnas = []
    filas = []
    total = 0

    # Detectar delimitador automáticamente
    with open(file_path, encoding="utf-8-sig") as f:
        sample = f.read(2048)
        sniffer = csv.Sniffer()
        try:
            delimiter = sniffer.sniff(sample).delimiter
        except csv.Error:
            delimiter = ";"  # Por defecto usa punto y coma

    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        columnas = [col.strip() for col in reader.fieldnames] if reader.fieldnames else []

        for row in reader:
            total += 1
            # Limpiar valores y convertir a string
            fila_limpia = {k.strip(): (str(v).strip() if v else "") for k, v in row.items()}

            # Saltar filas completamente vacías
            if any(v for v in fila_limpia.values()):
                if max_preview == 0 or len(filas) < max_preview:
                    filas.append(fila_limpia)

    return columnas, filas, total


def _parse_excel(file_path: str, max_preview: int) -> tuple[list[str], list[dict], int]:
    """Parser específico para archivos Excel (.xlsx, .xls)."""
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active

    filas_iter = ws.iter_rows(values_only=True)

    # Primera fila = encabezados
    try:
        encabezados_raw = next(filas_iter)
    except StopIteration:
        wb.close()
        raise ValueError("El archivo está vacío") from None

    columnas = [str(h).strip() if h else f"columna_{i}" for i, h in enumerate(encabezados_raw)]

    filas = []
    total = 0

    for row in filas_iter:
        total += 1

        # Convertir a diccionario
        fila_dict = {}
        for i, valor in enumerate(row):
            if i < len(columnas):
                # Convertir valores a string limpio
                if valor is None:
                    fila_dict[columnas[i]] = ""
                else:
                    fila_dict[columnas[i]] = str(valor).strip()

        # Saltar filas completamente vacías
        if any(v for v in fila_dict.values()):
            if max_preview == 0 or len(filas) < max_preview:
                filas.append(fila_dict)

    wb.close()
    return columnas, filas, total


def detectar_tipo_por_columnas(columnas: list[str]) -> str:
    """
    Intenta detectar el tipo de importación basándose en los nombres de columnas.
    Retorna el código del tipo o None si no puede detectar.
    """
    columnas_lower = [c.lower() for c in columnas]
    columnas_texto = " ".join(columnas_lower)

    # PERSONAL: tiene cédula + nombres + (empresa o gerencia)
    if ("cedula" in columnas_texto or "cédula" in columnas_texto) and \
       ("nombres" in columnas_texto or "nombre" in columnas_texto):
        if "empresa" in columnas_texto or "gerencia" in columnas_texto:
            return "PERSONAL"
        elif "telefono" in columnas_texto or "teléfono" in columnas_texto:
            return "VISITANTES"

    # VEHICULOS: tiene placa
    if "placa" in columnas_texto:
        return "VEHICULOS"

    # Catálogos simples (una sola columna principal)
    if len(columnas) == 1:
        col = columnas[0].lower()
        if "punto" in col or "control" in col:
            return "PUNTOS_CONTROL"
        elif "gerencia" in col:
            return "GERENCIAS"
        elif "empresa" in col:
            return "EMPRESAS_FORANEAS"
        elif "condicion" in col or "condición" in col:
            return "CONDICIONES"
        elif "direccion" in col or "dirección" in col:
            return "DIRECCIONES"

    return None


def normalizar_placa(placa: str) -> str:
    """Normaliza una placa de vehículo: mayúsculas, sin espacios."""
    if not placa:
        return ""
    return placa.upper().replace(" ", "").replace("-", "").strip()


def normalizar_cedula(cedula: str) -> str:
    """Normaliza una cédula: quita prefijos V/E y espacios."""
    if not cedula:
        return ""
    cedula = cedula.strip().upper()
    # Quitar prefijos comunes
    for prefijo in ["V-", "E-", "V ", "E ", "V:", "E:"]:
        cedula = cedula.removeprefix(prefijo)
    return cedula.strip()
