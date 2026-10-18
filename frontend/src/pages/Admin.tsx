import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, Usuario } from '../services/admin';
import { zonaApi, Zona, PuntoControl, PuntoControlConEstado } from '../services/zona';
import { sesionApi } from '../services/sesion';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, Settings, Clock, FileText, Plus, Edit2,
  Shield, Loader2, Globe, MapPin, RefreshCw, CheckCircle2,
  Unlock, AlertTriangle
} from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'zonas' | 'puntos' | 'usuarios' | 'catalogos' | 'sesiones' | 'eventos'>('zonas');

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    toast.success('Datos actualizados correctamente');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al Dashboard
      </button>

      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Panel de Administración</h1>
              <p className="text-sm text-amber-100">Gestión de zonas, puntos de control, usuarios y auditoría</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar Datos
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <TabButton active={activeTab === 'zonas'} onClick={() => setActiveTab('zonas')} icon={<Globe className="w-4 h-4" />} label="Zonas" />
          <TabButton active={activeTab === 'puntos'} onClick={() => setActiveTab('puntos')} icon={<MapPin className="w-4 h-4" />} label="Puntos de Control" />
          <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon={<Users className="w-4 h-4" />} label="Usuarios" />
          <TabButton active={activeTab === 'catalogos'} onClick={() => setActiveTab('catalogos')} icon={<Settings className="w-4 h-4" />} label="Catálogos" />
          <TabButton active={activeTab === 'sesiones'} onClick={() => setActiveTab('sesiones')} icon={<Clock className="w-4 h-4" />} label="Sesiones" />
          <TabButton active={activeTab === 'eventos'} onClick={() => setActiveTab('eventos')} icon={<FileText className="w-4 h-4" />} label="Auditoría" />
        </div>

        <div className="p-6">
          {activeTab === 'zonas' && <GestionZonas />}
          {activeTab === 'puntos' && <GestionPuntosControl />}
          {activeTab === 'usuarios' && <GestionUsuarios />}
          {activeTab === 'catalogos' && <GestionCatalogos />}
          {activeTab === 'sesiones' && <HistorialSesiones />}
          {activeTab === 'eventos' && <AuditoriaEventos />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE REUTILIZABLE: BOTÓN DE TAB
// ============================================================
function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
        active
          ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-600'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ============================================================
// GESTIÓN DE ZONAS GEOGRÁFICAS (SIN BLOQUEOS)
// ============================================================
function GestionZonas() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editZona, setEditZona] = useState<Zona | null>(null);

  const { data: zonas = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-zonas'],
    queryFn: zonaApi.listarTodas,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const crearMutation = useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion?: string }) =>
      zonaApi.crear(nombre, descripcion),
    onSuccess: () => {
      toast.success('Zona creada correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-zonas'] });
      setShowModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al crear zona')
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => zonaApi.actualizar(id, data),
    onSuccess: () => {
      toast.success('Zona actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-zonas'] });
      setEditZona(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al actualizar zona')
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando zonas...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Zonas Geográficas</h2>
          <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 italic">(Datos clasificatorios, sin bloqueos)</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Zona
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">DESCRIPCIÓN</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">PUNTOS ASIGNADOS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zonas.map((z: any) => (
              <tr key={z.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{z.id}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">{z.nombre}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{z.descripcion || '-'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    <MapPin className="w-3 h-3" /> {z.total_puntos || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    z.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {z.estatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditZona(z)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showModal || editZona) && (
        <ModalZona
          zona={editZona}
          onClose={() => { setShowModal(false); setEditZona(null); }}
          onSubmit={(data) => {
            if (editZona) {
              actualizarMutation.mutate({ id: editZona.id, data });
            } else {
              crearMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}

function ModalZona({ zona, onClose, onSubmit }: {
  zona: Zona | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    nombre: zona?.nombre || '',
    descripcion: zona?.descripcion || '',
    estatus: zona?.estatus || 'ACTIVO'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {zona ? 'Editar Zona' : 'Nueva Zona'}
          </h2>
          <button onClick={onClose} className="text-amber-200 hover:text-white text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>
          {zona && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
              <select
                value={formData.estatus}
                onChange={(e) => setFormData({ ...formData, estatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
              {zona ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// GESTIÓN DE PUNTOS DE CONTROL (CON BLOQUEOS Y LIBERACIÓN)
// ============================================================
function GestionPuntosControl() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPunto, setEditPunto] = useState<PuntoControl | null>(null);
  const [filtroZona, setFiltroZona] = useState<number | undefined>(undefined);
  const [puntoALiberar, setPuntoALiberar] = useState<PuntoControlConEstado | null>(null);
  const [razonLiberacion, setRazonLiberacion] = useState('');

  const { data: zonas = [] } = useQuery({
    queryKey: ['admin-zonas'],
    queryFn: zonaApi.listarTodas
  });

  const { data: puntos = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-puntos-control', filtroZona],
    queryFn: async () => {
      const todosLosPuntos = await zonaApi.listarPuntosConEstado();
      if (filtroZona !== undefined) {
        return todosLosPuntos.filter(p => p.zona_id === filtroZona);
      }
      return todosLosPuntos;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const crearMutation = useMutation({
    mutationFn: ({ nombre, zona_id }: { nombre: string; zona_id?: number }) =>
      zonaApi.crearPuntoControl(nombre, zona_id),
    onSuccess: () => {
      toast.success('Punto de control creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-puntos-control'] });
      queryClient.invalidateQueries({ queryKey: ['admin-zonas'] });
      setShowModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al crear')
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => zonaApi.actualizarPuntoControl(id, data),
    onSuccess: () => {
      toast.success('Punto actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-puntos-control'] });
      queryClient.invalidateQueries({ queryKey: ['admin-zonas'] });
      setEditPunto(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al actualizar')
  });

  const liberarMutation = useMutation({
    // Migración a endpoint canónico (v6.1): POST /api/sesion/liberar-punto.
    // El antiguo zonaApi.liberarPuntoControl quedó deprecado en el backend;
    // este flujo resuelve primero la sesión ACTIVA del punto (garantizando
    // auditoría LIBERACION_PUNTO y estado LIBERADA_ADMIN).
    mutationFn: async ({ razon }: { puntoId: number; razon: string }) => {
      const activas = await sesionApi.listarActivasAdmin();
      const sesionActiva = activas.find((s) => s.punto_control === puntoALiberar?.nombre);
      if (!sesionActiva) {
        throw { response: { data: { detail: 'El punto de control no está ocupado' } } };
      }
      return sesionApi.liberarPunto(sesionActiva.id, razon);
    },
    onSuccess: (data) => {
      toast.success(`✅ Punto "${data.punto_control}" liberado correctamente`);
      queryClient.invalidateQueries({ queryKey: ['admin-puntos-control'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sesiones'] });
      setPuntoALiberar(null);
      setRazonLiberacion('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al liberar el punto');
    }
  });

  const handleConfirmarLiberacion = () => {
    if (!puntoALiberar) return;
    if (!razonLiberacion.trim()) {
      toast.error('Debe ingresar una razón para la liberación');
      return;
    }
    liberarMutation.mutate({ puntoId: puntoALiberar.id, razon: razonLiberacion.trim() });
  };

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando puntos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Puntos de Control</h2>
          <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 italic">(Los puntos sí pueden estar bloqueados)</span>
        </div>
        <div className="flex gap-2">
          <select
            value={filtroZona ?? ''}
            onChange={(e) => setFiltroZona(e.target.value ? parseInt(e.target.value) : undefined)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Punto
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ZONA ASIGNADA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTADO DEL PUNTO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {puntos.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay puntos de control</td></tr>
            ) : puntos.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{p.id}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">{p.nombre}</td>
                <td className="px-4 py-3">
                  {p.zona_nombre ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      <Globe className="w-3 h-3" /> {p.zona_nombre}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">General (Todas las zonas)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.en_uso ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                      🔒 En uso por {p.usuario_en_uso}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" /> Disponible
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    {p.estatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditPunto(p)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {p.en_uso && (
                      <button
                        onClick={() => {
                          setPuntoALiberar(p);
                          setRazonLiberacion('');
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        title="Liberar punto de control (solo ADMIN)"
                      >
                        <Unlock className="w-4 h-4" /> Liberar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Crear/Editar Punto */}
      {(showModal || editPunto) && (
        <ModalPuntoControl
          punto={editPunto}
          zonas={zonas}
          onClose={() => { setShowModal(false); setEditPunto(null); }}
          onSubmit={(data) => {
            if (editPunto) {
              actualizarMutation.mutate({ id: editPunto.id, data });
            } else {
              crearMutation.mutate(data);
            }
          }}
        />
      )}

      {/* Modal de Confirmación de Liberación */}
      {puntoALiberar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 text-white p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-bold">Liberar Punto de Control</h3>
                  <p className="text-sm text-red-100">Acción administrativa con registro en auditoría</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 mb-2">
                  Está a punto de liberar el punto de control:
                </p>
                <p className="font-bold text-amber-900 text-lg">📍 {puntoALiberar.nombre}</p>
                <p className="text-sm text-amber-800 mt-2">
                  Actualmente en uso por: <strong>{puntoALiberar.usuario_en_uso}</strong>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <p className="font-semibold mb-1">⚠️ Esta acción:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cerrará forzosamente la sesión activa</li>
                  <li>El usuario afectado deberá iniciar un nuevo turno</li>
                  <li>Quedará registrado en la auditoría del sistema</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Razón de la liberación *
                </label>
                <textarea
                  value={razonLiberacion}
                  onChange={(e) => setRazonLiberacion(e.target.value)}
                  placeholder="Ej: Apagón eléctrico, PC reiniciada, error de sistema..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setPuntoALiberar(null);
                    setRazonLiberacion('');
                  }}
                  disabled={liberarMutation.isPending}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarLiberacion}
                  disabled={liberarMutation.isPending || !razonLiberacion.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {liberarMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Liberando...</>
                  ) : (
                    <><Unlock className="w-4 h-4" /> Confirmar Liberación</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalPuntoControl({ punto, zonas, onClose, onSubmit }: {
  punto: PuntoControl | null;
  zonas: Zona[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    nombre: punto?.nombre || '',
    zona_id: punto?.zona_id ?? undefined as number | undefined,
    estatus: punto?.estatus || 'ACTIVO'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {punto ? 'Editar Punto de Control' : 'Nuevo Punto de Control'}
          </h2>
          <button onClick={onClose} className="text-amber-200 hover:text-white text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Zona Asignada</label>
            <select
              value={formData.zona_id ?? ''}
              onChange={(e) => setFormData({ ...formData, zona_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">-- Sin zona asignada (General) --</option>
              {zonas.filter(z => z.estatus === 'ACTIVO').map((z) => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              💡 Los puntos sin zona asignada aparecen en todas las zonas
            </p>
          </div>
          {punto && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
              <select
                value={formData.estatus}
                onChange={(e) => setFormData({ ...formData, estatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
              {punto ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// GESTIÓN DE USUARIOS
// ============================================================
function GestionUsuarios() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);

  const { data: usuarios = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: adminApi.listarUsuarios,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const crearMutation = useMutation({
    mutationFn: adminApi.crearUsuario,
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setShowModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al crear usuario')
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.actualizarUsuario(id, data),
    onSuccess: () => {
      toast.success('Usuario actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setEditUser(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al actualizar usuario')
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando usuarios...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Gestión de Usuarios</h2>
          <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">USUARIO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ROL</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{u.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.usuario}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{u.nombre_completo}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    u.rol === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    u.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {u.estatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditUser(u)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showModal || editUser) && (
        <ModalUsuario
          usuario={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSubmit={(data) => {
            if (editUser) {
              actualizarMutation.mutate({ id: editUser.id, data });
            } else {
              crearMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}

function ModalUsuario({ usuario, onClose, onSubmit }: {
  usuario: Usuario | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    usuario: usuario?.usuario || '',
    password: '',
    nombre_completo: usuario?.nombre_completo || '',
    rol: usuario?.rol || 'OPERADOR',
    estatus: usuario?.estatus || 'ACTIVO'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = usuario
      ? { nombre_completo: formData.nombre_completo, rol: formData.rol, estatus: formData.estatus, password: formData.password || undefined }
      : formData;
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} className="text-amber-200 hover:text-white text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!usuario && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario *</label>
              <input
                type="text"
                required
                value={formData.usuario}
                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {usuario ? 'Nueva Contraseña (vacío = no cambiar)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              required={!usuario}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={formData.nombre_completo}
              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="OPERADOR">OPERADOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            {usuario && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
                <select
                  value={formData.estatus}
                  onChange={(e) => setFormData({ ...formData, estatus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
            )}
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
              {usuario ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// GESTIÓN DE CATÁLOGOS
// ============================================================
function GestionCatalogos() {
  const [activeCatalog, setActiveCatalog] = useState<'gerencias' | 'empresas'>('gerencias');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveCatalog('gerencias')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${
            activeCatalog === 'gerencias' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Gerencias
        </button>
        <button
          onClick={() => setActiveCatalog('empresas')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${
            activeCatalog === 'empresas' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Empresas Foráneas
        </button>
      </div>

      {activeCatalog === 'gerencias' && <CatalogoListado tipo="gerencias" />}
      {activeCatalog === 'empresas' && <CatalogoListado tipo="empresas" />}
    </div>
  );
}

function CatalogoListado({ tipo }: { tipo: 'gerencias' | 'empresas' }) {
  const queryClient = useQueryClient();
  const [nuevoNombre, setNuevoNombre] = useState('');

  const queryKey = tipo === 'gerencias' ? ['admin-gerencias'] : ['admin-empresas'];
  const apiFn = tipo === 'gerencias' ? adminApi.listarGerencias : adminApi.listarEmpresasForaneas;
  const crearFn = tipo === 'gerencias' ? adminApi.crearGerencia : adminApi.crearEmpresaForanea;

  const { data: items = [], isLoading, refetch } = useQuery({ 
    queryKey, 
    queryFn: apiFn,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const crearMutation = useMutation({
    mutationFn: crearFn,
    onSuccess: () => {
      toast.success('Registro creado correctamente');
      queryClient.invalidateQueries({ queryKey });
      setNuevoNombre('');
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Error al crear')
  });

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      toast.error('Ingrese un nombre');
      return;
    }
    crearMutation.mutate(nuevoNombre.trim());
  };

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <form onSubmit={handleCrear} className="flex gap-2 flex-1">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo nombre..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {crearMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </form>
        <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600 p-2" title="Actualizar">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{item.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.nombre}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    {item.estatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// HISTORIAL DE SESIONES
// ============================================================
function HistorialSesiones() {
  const { data: sesiones = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-sesiones'],
    queryFn: () => adminApi.listarSesiones(100),
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando sesiones...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800">Historial de Sesiones</h2>
        <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600 flex items-center gap-1 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">FECHA/HORA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">USUARIO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ZONA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">PUNTO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">TURNO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTADO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sesiones.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{s.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{new Date(s.hora_inicio).toLocaleString('es-VE')}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.usuario_nombre}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{s.zona || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{s.punto_control || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{s.turno_nombre || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    s.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' :
                    s.estado === 'CERRADA_FORZADA' ? 'bg-red-100 text-red-800' :
                    s.estado === 'LIBERADA_ADMIN' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {s.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// AUDITORÍA DE EVENTOS
// ============================================================
function AuditoriaEventos() {
  const { data: eventos = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-eventos'],
    queryFn: () => adminApi.listarEventos(200),
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando eventos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800">Auditoría del Sistema</h2>
        <button onClick={() => refetch()} className="text-slate-500 hover:text-amber-600 flex items-center gap-1 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">FECHA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">HORA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">USUARIO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIÓN</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">DETALLE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {eventos.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{e.fecha}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-700">{e.hora}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{e.usuario || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{e.accion}</td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={e.detalle || ''}>
                  {e.detalle || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}