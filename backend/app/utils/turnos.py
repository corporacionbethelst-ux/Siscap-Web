from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.models import Turno


def calcular_rango_turno(db: Session, turno_codigo: str, fecha_actual: date = None, hora_actual: str = None):
    """
    Replica la lógica exacta de tu sistema original de escritorio:
    - Si el turno cruza medianoche y la hora actual es menor a la hora de inicio,
      el día operativo es el día anterior.
    - Devuelve rango_inicio, rango_fin y dia_operativo.
    """
    turno = db.query(Turno).filter(Turno.codigo == turno_codigo).first()
    if not turno:
        return None, None, None, None

    if fecha_actual is None:
        fecha_actual = date.today()
    if hora_actual is None:
        hora_actual = datetime.now().strftime("%H:%M")

    hora_inicio = turno.hora_inicio
    hora_fin = turno.hora_fin
    cruza_medianoche = turno.cruza_medianoche

    if cruza_medianoche:
        if hora_actual < hora_inicio:
            dia_operativo = fecha_actual - timedelta(days=1)
        else:
            dia_operativo = fecha_actual
    else:
        dia_operativo = fecha_actual

    rango_inicio = f"{dia_operativo.strftime('%Y-%m-%d')} {hora_inicio}:00"
    if hora_inicio == hora_fin:
        rango_fin = f"{(dia_operativo + timedelta(days=1)).strftime('%Y-%m-%d')} {hora_fin}:00"
    else:
        rango_fin = f"{dia_operativo.strftime('%Y-%m-%d')} {hora_fin}:00"

    return rango_inicio, rango_fin, dia_operativo.strftime('%Y-%m-%d'), turno.nombre
