import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { materialApi, vehiculoApi } from '../services/movimiento';
import { personalApi } from '../services/personal';
import { toast } from 'sonner';
import {
  Package, LogIn, LogOut, ArrowLeft, Truck, User, Search,
  ClipboardList, AlertCircle, Loader2, CheckCircle2, FileText
} from 'lucide-react';

export default function Materiales() {
  const navigate = useNavigate();
  const { sesionActiva } = useAuthStore();
  const queryClient = useQueryClient();

  // Estado del formulario
  const [cedulaConductor, setCedulaConductor] = useState('');
  const [nombresConductor, setNombresConductor] = useState('');
  const [conductorValido, setConductorValido] = useState<boolean | null>(null);
  const [buscandoConductor, setBuscandoConductor] = useState(false);

  const [placa, setPlaca] = useState('');
  const [vehiculoInfo, setVehiculoInfo] = useState<string>('');
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false);

  const [condicion, setCondicion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [quienAutoriza, setQuienAutoriza] = useState('');
  const [destino, setDestino] = useState('');
  const [observacion, setObservacion] = useState('');

  // Si no hay sesión activa, redirigir
  useEffect(() => {
    if (!sesionActiva) {
      toast.error('Debe abrir un turno primero');
      navigate('/dept/proteccion-prevencion');
    }
  }, [sesionActiva, navigate]);

  // Cargar movimientos del turno
  const { data: movimientos = [], isLoading: cargandoMovimientos } = useQuery({
    queryKey: ['materiales-turno', sesionActiva?.id],
    queryFn: () => sesionActiva ? materialApi.listarDelTurno(sesionActiva.id) : [],
    refetchInterval: 10000,
  });

  // Cargar estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['materiales-estadisticas', sesionActiva?.id],
    queryFn: () => sesionActiva ? materialApi.estadisticas(sesionActiva.id) : { entradas: 0, salidas: 0 },
    refetchInterval: 10000,
  });

  // Buscar conductor por cédula
  const buscarConductor = async () => {
    if (!cedulaConductor.trim()) {
      setNombresConductor('');
      setConductorValido(null);
      return;
    }
    setBuscandoConductor(true);
    try {
      const data = await personalApi.buscar(cedulaConductor.trim());
      setNombresConductor(data.nombres);
      setConductorValido(true);
    } catch {
      setNombresConductor('NO REGISTRADO');
      setConductorValido(false);
    } finally {
      setBuscandoConductor(false);
    }
  };

  // Buscar vehículo por placa
  const buscarVehiculo = async () => {
    if (!placa.trim()) {
      setVehiculoInfo('');
      return;
    }
    setBuscandoVehiculo(true);
    try {
      const data = await vehiculoApi.buscar(placa.trim().toUpperCase());
      setVehiculoInfo(`${data.marca || ''} ${data.modelo || ''} ${data.color || ''}`.trim() || 'Vehículo registrado');
      if (data.condicion) setCondicion(data.condicion);
    } catch {
      setVehiculoInfo('Vehículo no registrado en el sistema');
    } finally {
      setBuscandoVehiculo(false);
    }
  };

  // Mutación para registrar
  const mutation = useMutation({
    mutationFn: (tipo: 'ENTRADA' | 'SALIDA') =>
      materialApi.registrar(sesionActiva!.id, {
        cedula_conductor: cedulaConductor.trim() || undefined,
        descripcion: descripcion.trim(),
        placa_vehiculo: placa.trim().toUpperCase() || undefined,
        condicion_vehiculo: condicion.trim() || undefined,
        quien_autoriza: quienAutoriza.trim() || undefined,
        destino: destino.trim() || undefined,
        tipo_movimiento: tipo,
        observacion: observacion.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`✅ ${data.tipo_movimiento} de material registrada - ${data.hora}`);
      // Limpiar formulario
      setCedulaConductor('');
      setNombresConductor('');
      setConductorValido(null);
      setPlaca('');
      setVehiculoInfo('');
      setCondicion('');
      setDescripcion('');
      setQuienAutoriza('');
      setDestino('');
      setObservacion('');
      queryClient.invalidateQueries({ queryKey: ['materiales-turno'] });
      queryClient.invalidateQueries({ queryKey: ['materiales-estadisticas'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al registrar movimiento');
    }
  });

  const handleRegistrar = (tipo: 'ENTRADA' | 'SALIDA') => {
    if (!descripcion.trim()) {
      toast.error('La descripción del material es obligatoria');
      return;
    }
    mutation.mutate(tipo);
  };

  if (!sesionActiva) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/dept/proteccion-prevencion/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al Dashboard
      </button>

      {/* Header con info del turno */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Control de Materiales y Vehículos</h1>
              <p className="text-sm text-blue-100">
                Turno: {sesionActiva.turno_nombre} | Punto: {sesionActiva.punto_control} | Día Op: {sesionActiva.dia_operativo}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-green-500 px-4 py-2 rounded-lg text-center min-w-[80px]">
              <div className="text-2xl font-bold">{estadisticas?.entradas || 0}</div>
              <div className="text-xs">ENTRADAS</div>
            </div>
            <div className="bg-red-500 px-4 py-2 rounded-lg text-center min-w-[80px]">
              <div className="text-2xl font-bold">{estadisticas?.salidas || 0}</div>
              <div className="text-xs">SALIDAS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white">Registro de Material / Vehículo</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Fila 1: Conductor y Placa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conductor */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Cédula del Conductor
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cedulaConductor}
                  onChange={(e) => setCedulaConductor(e.target.value)}
                  onBlur={buscarConductor}
                  onKeyDown={(e) => e.key === 'Enter' && buscarConductor()}
                  placeholder="V-12345678 (opcional)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button
                  onClick={buscarConductor}
                  disabled={buscandoConductor}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {buscandoConductor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {nombresConductor && (
                <div className={`mt-2 p-2 rounded text-xs flex items-center gap-1 ${
                  conductorValido ? 'bg-green-50 text-green-700' : 
                  conductorValido === false ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-600'
                }`}>
                  {conductorValido ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {nombresConductor}
                </div>
              )}
            </div>

            {/* Placa */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-4 h-4" /> Placa del Vehículo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  onBlur={buscarVehiculo}
                  onKeyDown={(e) => e.key === 'Enter' && buscarVehiculo()}
                  placeholder="ABC123 (opcional)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                />
                <button
                  onClick={buscarVehiculo}
                  disabled={buscandoVehiculo}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {buscandoVehiculo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {vehiculoInfo && (
                <div className="mt-2 p-2 rounded text-xs bg-blue-50 text-blue-700 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {vehiculoInfo}
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Condición */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Condición del Vehículo
            </label>
            <input
              type="text"
              value={condicion}
              onChange={(e) => setCondicion(e.target.value)}
              placeholder="Ej: Bueno, Regular, Malo"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* Fila 3: Descripción (OBLIGATORIA) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              📝 Descripción del Material <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa detalladamente el material que ingresa o sale..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
            />
            {descripcion.trim() && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Descripción válida
              </p>
            )}
          </div>

          {/* Fila 4: Autoriza y Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ¿Quién Autoriza?
              </label>
              <input
                type="text"
                value={quienAutoriza}
                onChange={(e) => setQuienAutoriza(e.target.value)}
                placeholder="Nombre de quien autoriza"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Destino
              </label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Destino del material"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Fila 5: Observación */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Observación (opcional)
            </label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Botones de Acción - SEPARADOS */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">Acciones:</span>
            <button
              onClick={() => handleRegistrar('ENTRADA')}
              disabled={mutation.isPending || !descripcion.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              ENTRADA MATERIAL
            </button>
            <button
              onClick={() => handleRegistrar('SALIDA')}
              disabled={mutation.isPending || !descripcion.trim()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              SALIDA MATERIAL
            </button>
            {!descripcion.trim() && (
              <span className="text-xs text-orange-600 flex items-center gap-1 ml-2">
                <AlertCircle className="w-3 h-3" /> Complete la descripción para habilitar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Movimientos del Turno */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-slate-800">Historial de Materiales del Turno</h2>
          <span className="ml-auto text-sm text-slate-500">
            {movimientos.length} registros
          </span>
        </div>

        {cargandoMovimientos ? (
          <div className="p-8 text-center text-slate-500">Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay movimientos de materiales registrados en este turno</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">HORA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">TIPO</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">CONDUCTOR</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">DESCRIPCIÓN</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">PLACA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">CONDICIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{m.hora}</td>
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
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {m.nombres_conductor ? (
                        <div>
                          <div className="font-medium">{m.nombres_conductor}</div>
                          <div className="text-xs text-slate-500">{m.cedula_conductor}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-xs">
                      <div className="truncate" title={m.descripcion}>
                        {m.descripcion.length > 50 ? m.descripcion.substring(0, 50) + '...' : m.descripcion}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">
                      {m.placa_vehiculo || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {m.condicion_vehiculo || '-'}
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