import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { visitanteApi, MovimientoVisitante, Visitante } from '../services/visitante';
import { toast } from 'sonner';
import {
  DoorOpen, LogIn, LogOut, ArrowLeft, Search, UserPlus,
  Users, Phone, Building, Briefcase, AlertCircle, Loader2,
  CheckCircle2, FileText, Car, MapPin
} from 'lucide-react';

export default function Visitantes() {
  const navigate = useNavigate();
  const { sesionActiva } = useAuthStore();
  const queryClient = useQueryClient();

  // Estados del formulario
  const [cedula, setCedula] = useState('');
  const [visitanteEncontrado, setVisitanteEncontrado] = useState<Visitante | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [tipoVisitante, setTipoVisitante] = useState('VISITANTE');
  const [motivo, setMotivo] = useState('');
  const [aQuienVisita, setAQuienVisita] = useState('');
  const [gerenciaDestino, setGerenciaDestino] = useState('');
  const [placa, setPlaca] = useState('');
  const [acompanantes, setAcompanantes] = useState(0);
  const [observacion, setObservacion] = useState('');

  const [showRegistro, setShowRegistro] = useState(false);
  const [nuevoVisitante, setNuevoVisitante] = useState({
    cedula: '', nombres: '', empresa: '', telefono: '', tipo_visitante: 'VISITANTE'
  });

  // Redirigir si no hay sesión
  useEffect(() => {
    if (!sesionActiva) {
      toast.error('Debe abrir un turno primero');
      navigate('/apertura-turno');
    }
  }, [sesionActiva, navigate]);

  // Cargar catálogos
  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-visitante'],
    queryFn: visitanteApi.listarTipos
  });

  const { data: gerencias = [] } = useQuery({
    queryKey: ['gerencias'],
    queryFn: visitanteApi.listarGerencias
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-foraneas'],
    queryFn: visitanteApi.listarEmpresas
  });

  // Cargar movimientos del turno
  const { data: movimientos = [], isLoading: cargandoMovimientos } = useQuery({
    queryKey: ['visitantes-turno', sesionActiva?.id],
    queryFn: () => sesionActiva ? visitanteApi.listarDelTurno(sesionActiva.id) : [],
    refetchInterval: 10000,
  });

  // Cargar estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['visitantes-estadisticas', sesionActiva?.id],
    queryFn: () => sesionActiva ? visitanteApi.estadisticas(sesionActiva.id) : { entradas: 0, salidas: 0 },
    refetchInterval: 10000,
  });

  // Buscar visitante
  const buscarVisitante = async () => {
    if (!cedula.trim()) {
      toast.error('Ingrese una cédula');
      return;
    }
    setBuscando(true);
    try {
      const data = await visitanteApi.buscar(cedula.trim());
      setVisitanteEncontrado(data);
      setTipoVisitante(data.tipo_visitante || 'VISITANTE');
      toast.success(`Visitante encontrado: ${data.nombres}`);
    } catch (error: any) {
      setVisitanteEncontrado(null);
      const msg = error.response?.data?.detail || 'Visitante no encontrado';
      toast.error(msg);
      if (confirm(`${msg}. ¿Desea registrar este visitante ahora?`)) {
        setNuevoVisitante({ ...nuevoVisitante, cedula: cedula.trim() });
        setShowRegistro(true);
      }
    } finally {
      setBuscando(false);
    }
  };

  // Mutación para registrar nuevo visitante en catálogo
  const mutationCrear = useMutation({
    mutationFn: visitanteApi.crear,
    onSuccess: (data) => {
      toast.success(`✅ Visitante ${data.nombres} registrado en catálogo`);
      setVisitanteEncontrado(data);
      setTipoVisitante(data.tipo_visitante);
      setCedula(data.cedula);
      setShowRegistro(false);
      setNuevoVisitante({ cedula: '', nombres: '', empresa: '', telefono: '', tipo_visitante: 'VISITANTE' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al registrar visitante');
    }
  });

  // Mutación para registrar movimiento
  const mutationMovimiento = useMutation({
    mutationFn: (tipo: 'ENTRADA' | 'SALIDA') =>
      visitanteApi.registrarMovimiento(sesionActiva!.id, {
        cedula: visitanteEncontrado!.cedula,
        tipo_visitante: tipoVisitante,
        placa_vehiculo: placa.trim().toUpperCase() || undefined,
        motivo: motivo.trim() || undefined,
        a_quien_visita: aQuienVisita.trim() || undefined,
        gerencia_destino: gerenciaDestino || undefined,
        acompanantes: acompanantes,
        tipo_movimiento: tipo,
        observacion: observacion.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`✅ ${data.tipo_movimiento} de visitante - ${data.nombres} - ${data.hora}`);
      // Limpiar formulario de detalles
      setMotivo('');
      setAQuienVisita('');
      setGerenciaDestino('');
      setPlaca('');
      setAcompanantes(0);
      setObservacion('');
      setCedula('');
      setVisitanteEncontrado(null);
      queryClient.invalidateQueries({ queryKey: ['visitantes-turno'] });
      queryClient.invalidateQueries({ queryKey: ['visitantes-estadisticas'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al registrar movimiento');
    }
  });

  const handleRegistrar = (tipo: 'ENTRADA' | 'SALIDA') => {
    if (!visitanteEncontrado) return;
    mutationMovimiento.mutate(tipo);
  };

  const handleCrearVisitante = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVisitante.cedula || !nuevoVisitante.nombres) {
      toast.error('Cédula y Nombres son obligatorios');
      return;
    }
    mutationCrear.mutate(nuevoVisitante);
  };

  if (!sesionActiva) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al Dashboard
      </button>

      {/* Header con info del turno */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <DoorOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Control de Visitantes</h1>
              <p className="text-sm text-purple-100">
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

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          🔍 Buscar Visitante por Cédula
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarVisitante()}
            placeholder="V-12345678"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg"
            autoFocus
          />
          <button
            onClick={buscarVisitante}
            disabled={buscando}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {buscando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> BUSCAR</>}
          </button>
          <button
            onClick={() => {
              setShowRegistro(true);
              setNuevoVisitante({ ...nuevoVisitante, cedula: cedula });
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" /> REGISTRAR NUEVO
          </button>
        </div>
      </div>

      {/* Panel de Información + Botones */}
      {visitanteEncontrado && (
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          {/* Info del visitante */}
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">
                  {visitanteEncontrado.nombres.toUpperCase()}
                </h3>
                <p className="text-sm text-slate-600 flex flex-wrap gap-3">
                  <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {visitanteEncontrado.empresa || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {visitanteEncontrado.tipo_visitante}</span>
                  {visitanteEncontrado.telefono && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {visitanteEncontrado.telefono}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles de la visita */}
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" /> Detalles de la Visita
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Visitante</label>
                <select
                  value={tipoVisitante}
                  onChange={(e) => setTipoVisitante(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                >
                  {tipos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Reunión de trabajo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">A quién visita</label>
                <input
                  type="text"
                  value={aQuienVisita}
                  onChange={(e) => setAQuienVisita(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Gerencia Destino
                </label>
                <select
                  value={gerenciaDestino}
                  onChange={(e) => setGerenciaDestino(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                >
                  <option value="">-- Seleccione --</option>
                  {gerencias.map((g) => (
                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3" /> Placa del Vehículo
                </label>
                <input
                  type="text"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Acompañantes</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={acompanantes}
                  onChange={(e) => setAcompanantes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observación</label>
                <input
                  type="text"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="bg-white p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">Acciones:</span>
            <button
              onClick={() => handleRegistrar('ENTRADA')}
              disabled={mutationMovimiento.isPending}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 transition-colors shadow-sm"
            >
              {mutationMovimiento.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              ENTRADA
            </button>
            <button
              onClick={() => handleRegistrar('SALIDA')}
              disabled={mutationMovimiento.isPending}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-40 transition-colors shadow-sm"
            >
              {mutationMovimiento.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              SALIDA
            </button>
          </div>
        </div>
      )}

      {/* Historial de Movimientos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-slate-800">Historial de Visitantes del Turno</h2>
          <span className="ml-auto text-sm text-slate-500">
            {movimientos.length} registros
          </span>
        </div>

        {cargandoMovimientos ? (
          <div className="p-8 text-center text-slate-500">Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay visitantes registrados en este turno</p>
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
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">TIPO</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">VISITA A</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">PLACA</th>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {m.tipo_visitante || 'VISITANTE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.a_quien_visita || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{m.placa_vehiculo || '-'}</td>
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

      {/* Modal de Registro Rápido */}
      {showRegistro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-purple-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Registrar Nuevo Visitante
              </h2>
              <button onClick={() => setShowRegistro(false)} className="text-purple-200 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCrearVisitante} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cédula *</label>
                  <input
                    type="text"
                    required
                    value={nuevoVisitante.cedula}
                    onChange={(e) => setNuevoVisitante({ ...nuevoVisitante, cedula: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={nuevoVisitante.tipo_visitante}
                    onChange={(e) => setNuevoVisitante({ ...nuevoVisitante, tipo_visitante: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {tipos.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombres y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={nuevoVisitante.nombres}
                  onChange={(e) => setNuevoVisitante({ ...nuevoVisitante, nombres: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                  <select
                    value={nuevoVisitante.empresa}
                    onChange={(e) => setNuevoVisitante({ ...nuevoVisitante, empresa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">-- Seleccione --</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.nombre}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoVisitante.telefono}
                    onChange={(e) => setNuevoVisitante({ ...nuevoVisitante, telefono: e.target.value })}
                    placeholder="0414-1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegistro(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutationCrear.isPending}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                >
                  {mutationCrear.isPending ? 'Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}