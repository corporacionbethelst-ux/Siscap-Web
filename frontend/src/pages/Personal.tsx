import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { personalApi } from '../services/personal';
import { movimientoApi } from '../services/movimiento';
import { toast } from 'sonner';
import {
  UserCheck, Search as SearchIcon, LogIn, LogOut,
  Clock, FileText, Plus, AlertCircle, ArrowLeft
} from 'lucide-react';

export default function PersonalPage() {
  const navigate = useNavigate();
  const { sesionActiva } = useAuthStore();
  const queryClient = useQueryClient();

  const [cedula, setCedula] = useState('');
  const [personaEncontrada, setPersonaEncontrada] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [observacion, setObservacion] = useState('');

  // Si no hay sesión activa, redirigir
  useEffect(() => {
    if (!sesionActiva) {
      toast.error('Debe abrir un turno primero');
      navigate('/apertura-turno');
    }
  }, [sesionActiva, navigate]);

  // Cargar movimientos del turno
  const { data: movimientos = [], isLoading: cargandoMovimientos } = useQuery({
    queryKey: ['movimientos-turno', sesionActiva?.id],
    queryFn: () => sesionActiva ? movimientoApi.listarDelTurno(sesionActiva.id) : [],
    refetchInterval: 10000, // Refresca cada 10 segundos
  });

  // Cargar estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['estadisticas-turno', sesionActiva?.id],
    queryFn: () => sesionActiva ? movimientoApi.estadisticas(sesionActiva.id) : { entradas: 0, salidas: 0 },
    refetchInterval: 10000,
  });

  const buscarPersona = async () => {
    if (!cedula.trim()) {
      toast.error('Ingrese una cédula');
      return;
    }
    setBuscando(true);
    try {
      const data = await personalApi.buscar(cedula.trim());
      setPersonaEncontrada(data);
      toast.success(`Persona encontrada: ${data.nombres}`);
    } catch (error: any) {
      setPersonaEncontrada(null);
      const msg = error.response?.data?.detail || 'Cédula no encontrada';
      toast.error(msg);
      // Preguntar si desea registrar
      if (confirm(`${msg}. ¿Desea registrar esta cédula ahora?`)) {
        navigate('/personal/registro', { state: { cedula: cedula.trim() } });
      }
    } finally {
      setBuscando(false);
    }
  };

  const mutation = useMutation({
    mutationFn: ({ tipo }: { tipo: 'ENTRADA' | 'SALIDA' }) =>
      movimientoApi.registrar(sesionActiva!.id, personaEncontrada.cedula, tipo, observacion),
    onSuccess: (data) => {
      toast.success(`✅ ${data.tipo_movimiento} registrada - ${data.nombres} - ${data.hora}`);
      setPersonaEncontrada(null);
      setCedula('');
      setObservacion('');
      queryClient.invalidateQueries({ queryKey: ['movimientos-turno'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-turno'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al registrar movimiento');
    }
  });

  const handleRegistrar = (tipo: 'ENTRADA' | 'SALIDA') => {
    if (!personaEncontrada) return;
    mutation.mutate({ tipo });
  };

  if (!sesionActiva) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Botón Volver al Dashboard */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al Dashboard
      </button>
      {/* Header con info del turno */}
      <div className="bg-blue-600 text-white rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6" /> Control de Acceso de Personal
          </h1>
          <p className="text-sm text-blue-100">
            Turno: {sesionActiva.turno_nombre} | Punto: {sesionActiva.punto_control} | Día Op: {sesionActiva.dia_operativo}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-green-500 px-4 py-2 rounded-lg text-center">
            <div className="text-2xl font-bold">{estadisticas?.entradas || 0}</div>
            <div className="text-xs">ENTRADAS</div>
          </div>
          <div className="bg-red-500 px-4 py-2 rounded-lg text-center">
            <div className="text-2xl font-bold">{estadisticas?.salidas || 0}</div>
            <div className="text-xs">SALIDAS</div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          🔍 Buscar por Cédula
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPersona()}
            placeholder="V-12345678"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            autoFocus
          />
          <button
            onClick={buscarPersona}
            disabled={buscando}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : <><SearchIcon className="w-5 h-5" /> BUSCAR</>}
          </button>
          <button
            onClick={() => navigate('/personal/registro')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> REGISTRAR NUEVO
          </button>
        </div>
      </div>

      {/* Panel de Información + Botones de Acción */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        {/* Info de la persona */}
        <div className="p-5 border-b border-slate-200">
          {personaEncontrada ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">
                  {personaEncontrada.nombres.toUpperCase()}
                </h3>
                <p className="text-sm text-slate-600">
                  🏢 {personaEncontrada.empresa || 'N/A'} | 📍 {personaEncontrada.gerencia || 'N/A'} | 
                  📋 {personaEncontrada.tipo} | 
                  <span className={personaEncontrada.estatus === 'ACTIVO' ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                    {' '}{personaEncontrada.estatus}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <AlertCircle className="w-6 h-6" />
              <p>⏳ Esperando búsqueda de personal...</p>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="bg-slate-50 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">Acciones:</span>
          <button
            onClick={() => handleRegistrar('ENTRADA')}
            disabled={!personaEncontrada || mutation.isPending}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <LogIn className="w-5 h-5" /> ENTRADA
          </button>
          <button
            onClick={() => handleRegistrar('SALIDA')}
            disabled={!personaEncontrada || mutation.isPending}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <LogOut className="w-5 h-5" /> SALIDA
          </button>
          <div className="flex-1"></div>
          <input
            type="text"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Observación (opcional)"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
          />
        </div>
      </div>

      {/* Historial de Movimientos del Turno */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">Últimos Movimientos del Turno</h2>
          <span className="ml-auto text-sm text-slate-500">
            {movimientos.length} registros
          </span>
        </div>

        {cargandoMovimientos ? (
          <div className="p-8 text-center text-slate-500">Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay movimientos registrados en este turno</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">HORA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">CÉDULA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">EMPRESA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">MOVIMIENTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{m.hora}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{m.cedula}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{m.nombres}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.empresa || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        m.tipo_movimiento === 'ENTRADA'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {m.tipo_movimiento === 'ENTRADA' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        {m.tipo_movimiento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}