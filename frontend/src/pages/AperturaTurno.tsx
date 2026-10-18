import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { sesionApi } from '../services/sesion';
import { zonaApi, Zona, PuntoControl } from '../services/zona';
import { toast } from 'sonner';
import {
  Shield, UserCheck, Headphones, Clock, MapPin, Users,
  Loader2, CheckCircle, Globe, AlertTriangle, Info, LogOut
} from 'lucide-react';

// Interfaz extendida para puntos con estado
interface PuntoControlConEstado extends PuntoControl {
  en_uso: boolean;
  usuario_en_uso: string | null;
  sesion_id: number | null;
}

export default function AperturaTurno() {
  const { user, setSesionActiva, logout } = useAuthStore();
  const navigate = useNavigate();

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [puntosControl, setPuntosControl] = useState<PuntoControlConEstado[]>([]);
  const [turnos, setTurnos] = useState<any[]>([]);

  const [zonaSeleccionada, setZonaSeleccionada] = useState('');
  const [puntoControl, setPuntoControl] = useState('');
  const [grupoTrabajo, setGrupoTrabajo] = useState('1');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');

  const [supervisorCedula, setSupervisorCedula] = useState('');
  const [supervisorData, setSupervisorData] = useState<any>(null);
  const [buscandoSup, setBuscandoSup] = useState(false);

  const [centralistaCedula, setCentralistaCedula] = useState('');
  const [centralistaData, setCentralistaData] = useState<any>(null);
  const [buscandoCent, setBuscandoCent] = useState(false);

  const [rangoInfo, setRangoInfo] = useState<any>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [forzarZona, setForzarZona] = useState(false);
  const [mostrarConfirmForzar, setMostrarConfirmForzar] = useState(false);

  // ============================================================
  // HANDLER: Logout (cerrar sesión)
  // ============================================================
  const handleLogout = () => {
    logout();
    // Volver al portal público tras cerrar sesión (antes iba a /login,
    // que ahora es redundante: la Landing es la puerta de entrada).
    navigate('/');
  };

  // ============================================================
  // PUNTOS FILTRADOS POR ZONA (memoria optimizada)
  // ============================================================
  const puntosFiltrados = useMemo(() => {
    if (!zonaSeleccionada) return [];
    
    const zonaActual = zonas.find(z => z.nombre === zonaSeleccionada);
    if (!zonaActual) return [];
    
    // Filtrar: puntos de esta zona + puntos generales (sin zona)
    return puntosControl.filter(p => 
      (p.zona_id === zonaActual.id || p.zona_id === null) && 
      p.estatus === 'ACTIVO'
    );
  }, [zonaSeleccionada, zonas, puntosControl]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
    const interval = setInterval(cargarZonasYPuntos, 15000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [zonasData, puntosData, turnosData] = await Promise.all([
        zonaApi.listarTodas(),
        zonaApi.listarPuntosConEstado(),
        sesionApi.listarTurnos()
      ]);
      setZonas(zonasData);
      setPuntosControl(puntosData);
      setTurnos(turnosData);
    } catch (error) {
      toast.error('Error al cargar datos iniciales');
    }
  };

  const cargarZonasYPuntos = async () => {
    try {
      const [zonasData, puntosData] = await Promise.all([
        zonaApi.listarTodas(),
        zonaApi.listarPuntosConEstado()
      ]);
      setZonas(zonasData);
      setPuntosControl(puntosData);
    } catch (error) {
      // Silencioso
    }
  };

  useEffect(() => {
    if (turnoSeleccionado) {
      sesionApi.obtenerRango(turnoSeleccionado)
        .then(setRangoInfo)
        .catch(() => toast.error('Error calculando rango del turno'));
    }
  }, [turnoSeleccionado]);

  // ============================================================
  // HANDLER: Al cambiar la zona, resetear el punto seleccionado
  // ============================================================
  const handleZonaChange = (nuevaZona: string) => {
    setZonaSeleccionada(nuevaZona);
    setPuntoControl('');
    setForzarZona(false);
  };

  const validarSupervisor = async () => {
    if (!supervisorCedula.trim()) {
      toast.error('Ingrese una cédula');
      return;
    }
    setBuscandoSup(true);
    try {
      const data = await sesionApi.validarPersona(supervisorCedula.trim());
      setSupervisorData(data);
      if (data.encontrado) {
        toast.success(`Supervisor: ${data.nombres}`);
      } else {
        toast.error('Cédula no encontrada');
      }
    } catch {
      toast.error('Error al validar');
    } finally {
      setBuscandoSup(false);
    }
  };

  const validarCentralista = async () => {
    if (!centralistaCedula.trim()) {
      toast.error('Ingrese una cédula');
      return;
    }
    setBuscandoCent(true);
    try {
      const data = await sesionApi.validarPersona(centralistaCedula.trim());
      setCentralistaData(data);
      if (data.encontrado) {
        toast.success(`Centralista: ${data.nombres}`);
      } else {
        toast.error('Cédula no encontrada');
      }
    } catch {
      toast.error('Error al validar');
    } finally {
      setBuscandoCent(false);
    }
  };

  const handleAbrirSesion = async () => {
    // Validaciones básicas
    if (!zonaSeleccionada) {
      toast.error('Seleccione una zona geográfica');
      return;
    }
    if (!puntoControl) {
      toast.error('Seleccione un punto de control');
      return;
    }
    if (!turnoSeleccionado) {
      toast.error('Seleccione un turno');
      return;
    }
    if (!supervisorData?.encontrado) {
      toast.error('Debe validar al Supervisor');
      return;
    }
    if (!centralistaData?.encontrado) {
      toast.error('Debe validar al Centralista');
      return;
    }

    // VALIDACIÓN CRÍTICA: Verificar si el PUNTO DE CONTROL está ocupado
    const puntoOcupado = puntosControl.find(p => p.nombre === puntoControl && p.en_uso);
    if (puntoOcupado && !forzarZona) {
      if (user?.rol === 'ADMIN') {
        setMostrarConfirmForzar(true);
        return;
      } else {
        toast.error(`El punto de control "${puntoControl}" está ocupado por ${puntoOcupado.usuario_en_uso}`);
        return;
      }
    }

    await ejecutarApertura();
  };

  const ejecutarApertura = async () => {
    setAbriendo(true);
    try {
      const sesion = await sesionApi.abrirSesion({
        zona: zonaSeleccionada,
        punto_control: puntoControl,
        grupo_trabajo: grupoTrabajo,
        turno_codigo: turnoSeleccionado,
        supervisor_cedula: supervisorData!.cedula!,
        centralista_cedula: centralistaData!.cedula!,
        forzar_zona: forzarZona
      });
      setSesionActiva(sesion);
      toast.success(`✅ Turno abierto en ${zonaSeleccionada} - ${puntoControl}`);
      navigate('/dept/proteccion-prevencion/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Error al abrir sesión';
      toast.error(msg);
    } finally {
      setAbriendo(false);
      setMostrarConfirmForzar(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ============================================================ */}
      {/* HEADER CON BOTÓN DE LOGOUT */}
      {/* ============================================================ */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">SISCAP Web</h1>
              <p className="text-xs text-slate-400">Apertura de Turno</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user.nombre_completo}</p>
              <p className="text-xs text-slate-400 uppercase">{user.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-600 text-white rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6" />
          <div>
            <p className="font-bold">Registro de Datos del Turno</p>
            <p className="text-sm text-blue-100">
              Seleccione zona, punto de control y complete la información
            </p>
          </div>
        </div>

        {/* ZONA Y PUNTO DE CONTROL */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" /> Ubicación Geográfica
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ZONA (siempre disponible) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Globe className="w-4 h-4" /> Zona Geográfica *
              </label>
              <select
                value={zonaSeleccionada}
                onChange={(e) => handleZonaChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Seleccione una zona --</option>
                {zonas.filter(z => z.estatus === 'ACTIVO').map((zona) => (
                  <option key={zona.id} value={zona.nombre}>
                    {zona.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                💡 La zona determina qué puntos de control están disponibles
              </p>
            </div>

            {/* PUNTO DE CONTROL (depende de la zona seleccionada) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Punto de Control *
              </label>
              
              {/* CASO 1: No hay zona seleccionada */}
              {!zonaSeleccionada && (
                <>
                  <select
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed outline-none"
                  >
                    <option value="">-- Primero seleccione una zona --</option>
                  </select>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Seleccione una zona geográfica para ver los puntos de control disponibles</p>
                  </div>
                </>
              )}

              {/* CASO 2: Zona seleccionada pero sin puntos */}
              {zonaSeleccionada && puntosFiltrados.length === 0 && (
                <>
                  <select
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed outline-none"
                  >
                    <option value="">-- No hay puntos disponibles --</option>
                  </select>
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      No hay puntos de control asignados a la zona <strong>{zonaSeleccionada}</strong>.
                      Contacte al administrador.
                    </p>
                  </div>
                </>
              )}

              {/* CASO 3: Zona seleccionada con puntos disponibles */}
              {zonaSeleccionada && puntosFiltrados.length > 0 && (
                <>
                  <select
                    value={puntoControl}
                    onChange={(e) => {
                      setPuntoControl(e.target.value);
                      setForzarZona(false);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Seleccione un punto de control --</option>
                    {puntosFiltrados.map((p) => (
                      <option
                        key={p.id}
                        value={p.nombre}
                        disabled={p.en_uso && user?.rol !== 'ADMIN'}
                      >
                        {p.en_uso
                          ? `🔒 ${p.nombre} (Ocupado por ${p.usuario_en_uso})`
                          : `✅ ${p.nombre}${p.zona_id === null ? ' (General)' : ''}`
                        }
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>{puntosFiltrados.length}</strong> puntos disponibles en <strong>{zonaSeleccionada}</strong>
                      {puntosFiltrados.some(p => p.zona_id === null) && ' (incluye puntos generales)'}
                    </p>
                  </div>
                </>
              )}

              {/* Alerta de punto ocupado */}
              {puntoControl && puntosControl.find(p => p.nombre === puntoControl)?.en_uso && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Punto de control actualmente ocupado</p>
                    <p>En uso por: {puntosControl.find(p => p.nombre === puntoControl)?.usuario_en_uso}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONFIGURACIÓN DEL TURNO */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Configuración del Turno
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Users className="w-4 h-4" /> Grupo de Trabajo *
              </label>
              <select
                value={grupoTrabajo}
                onChange={(e) => setGrupoTrabajo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="1">GRUPO 1</option>
                <option value="2">GRUPO 2</option>
                <option value="3">GRUPO 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Turno Activo *
              </label>
              <select
                value={turnoSeleccionado}
                onChange={(e) => setTurnoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Seleccione --</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.codigo}>
                    {t.codigo} - {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rangoInfo && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              📅 <strong>Día Operativo:</strong> {rangoInfo.dia_operativo} |
              ⏰ <strong>Rango:</strong> {new Date(rangoInfo.rango_inicio).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} → {new Date(rangoInfo.rango_fin).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* SUPERVISOR */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Supervisor de Turno
          </h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input
                type="text"
                value={supervisorCedula}
                onChange={(e) => setSupervisorCedula(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validarSupervisor()}
                placeholder="V-12345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={validarSupervisor}
              disabled={buscandoSup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {buscandoSup ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍'} Buscar
            </button>
          </div>
          {supervisorData && (
            <div className={`mt-3 p-3 rounded-lg ${supervisorData.encontrado ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {supervisorData.encontrado ? (
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> <strong>{supervisorData.nombres}</strong> | {supervisorData.empresa || 'N/A'}</p>
              ) : (
                <p>⚠️ Cédula no encontrada en el sistema</p>
              )}
            </div>
          )}
        </div>

        {/* CENTRALISTA */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-600" /> Centralista
          </h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input
                type="text"
                value={centralistaCedula}
                onChange={(e) => setCentralistaCedula(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validarCentralista()}
                placeholder="V-12345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={validarCentralista}
              disabled={buscandoCent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {buscandoCent ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍'} Buscar
            </button>
          </div>
          {centralistaData && (
            <div className={`mt-3 p-3 rounded-lg ${centralistaData.encontrado ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {centralistaData.encontrado ? (
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> <strong>{centralistaData.nombres}</strong> | {centralistaData.empresa || 'N/A'}</p>
              ) : (
                <p>⚠️ Cédula no encontrada en el sistema</p>
              )}
            </div>
          )}
        </div>

        {/* BOTÓN DE APERTURA */}
        <div className="flex justify-end">
          <button
            onClick={handleAbrirSesion}
            disabled={abriendo}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {abriendo ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Abriendo turno...</>
            ) : (
              <>✅ INICIAR SISTEMA</>
            )}
          </button>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN PARA FORZAR APERTURA */}
      {mostrarConfirmForzar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 text-white p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-bold">Confirmar Apertura Forzada</h3>
                  <p className="text-sm text-red-100">Acción administrativa</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                El punto de control <strong>{puntoControl}</strong> está actualmente en uso por:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="font-semibold text-amber-900">
                  👤 {puntosControl.find(p => p.nombre === puntoControl)?.usuario_en_uso}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Si continúa, la sesión actual será cerrada automáticamente.
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                ¿Está seguro de que desea forzar la apertura en este punto de control?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarConfirmForzar(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setForzarZona(true);
                    setMostrarConfirmForzar(false);
                    ejecutarApertura();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  🔓 Forzar Apertura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}