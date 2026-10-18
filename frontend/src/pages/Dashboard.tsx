import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { dashboardApi } from '../services/dashboard';
import { sesionApi } from '../services/sesion';
import { toast } from 'sonner';
import {
  LogOut, Shield, Users, Package, DoorOpen, ClipboardList,
  Clock, MapPin, TrendingUp, Building2, Car, UserCheck, UserX,
  Database, Globe, Search, AlertTriangle, Loader2, CheckCircle2
} from 'lucide-react';

// ============================================================
// COMPONENTE REUTILIZABLE: TARJETA DE ESTADÍSTICA
// ============================================================
function StatCard({ titulo, valor, icono, color, subtitulo }: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
  subtitulo?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-5 border-l-4 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{titulo}</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>{valor}</p>
          {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          {icono}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: DASHBOARD
// ============================================================
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, sesionActiva, logout, cerrarSesion: limpiarSesionLocal } = useAuthStore();
  const [mostrarModalCerrar, setMostrarModalCerrar] = useState(false);

  // Cargar estadísticas del turno activo (auto-refresh cada 10s)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', sesionActiva?.id],
    queryFn: () => sesionActiva ? dashboardApi.estadisticas(sesionActiva.id) : null,
    refetchInterval: 10000,
    enabled: !!sesionActiva
  });

  // Mutación para cerrar sesión en backend
  const cerrarSesionMutation = useMutation({
    mutationFn: () => sesionApi.cerrarSesion(sesionActiva!.id),
    onSuccess: () => {
      toast.success('✅ Turno cerrado correctamente');
      limpiarSesionLocal();
      setMostrarModalCerrar(false);
      navigate('/apertura-turno');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al cerrar turno');
      setMostrarModalCerrar(false);
    }
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleConfirmarCierre = () => {
    cerrarSesionMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ============================================================ */}
      {/* HEADER PRINCIPAL */}
      {/* ============================================================ */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">SISCAP Web</h1>
              <p className="text-xs text-slate-400">Panel Principal</p>
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
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* BARRA DE INFO DEL TURNO ACTIVO */}
      {/* ============================================================ */}
      {sesionActiva && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" /> {sesionActiva.zona || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {sesionActiva.punto_control}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {sesionActiva.turno_nombre}
              </span>
              <span className="flex items-center gap-1">
                👥 Grupo {sesionActiva.grupo_trabajo}
              </span>
              <span className="flex items-center gap-1">
                📅 {sesionActiva.dia_operativo}
              </span>
            </div>
            <button
              onClick={() => setMostrarModalCerrar(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> Cerrar Turno
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ============================================================ */}
        {/* SECCIÓN 1: MÓDULOS DEL SISTEMA (ARRIBA) */}
        {/* ============================================================ */}
        <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Módulos del Sistema
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Módulo: Control de Personal */}
          <button
            onClick={() => navigate('/personal')}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-blue-300 border-2 border-transparent transition-all"
          >
            <Users className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Control de Personal</h3>
            <p className="text-slate-500 text-sm mt-1">
              Registrar entrada/salida de empleados
            </p>
          </button>

          {/* Módulo: Control de Materiales */}
          <button
            onClick={() => navigate('/materiales')}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-indigo-300 border-2 border-transparent transition-all"
          >
            <Package className="w-10 h-10 text-indigo-600 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Control de Materiales</h3>
            <p className="text-slate-500 text-sm mt-1">
              Registrar entrada/salida de materiales
            </p>
          </button>

          {/* Módulo: Control de Visitantes */}
          <button
            onClick={() => navigate('/visitantes')}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-purple-300 border-2 border-transparent transition-all"
          >
            <DoorOpen className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Control de Visitantes</h3>
            <p className="text-slate-500 text-sm mt-1">
              Registrar entrada/salida de visitantes
            </p>
          </button>

          {/* Módulo: Historial y Reportes */}
          <button
            onClick={() => navigate('/historial')}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-emerald-300 border-2 border-transparent transition-all"
          >
            <ClipboardList className="w-10 h-10 text-emerald-600 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Historial y Reportes</h3>
            <p className="text-slate-500 text-sm mt-1">
              Búsqueda avanzada y exportación CSV
            </p>
          </button>

          {/* Módulo: Consulta de Datos (NUEVO) */}
          <button
            onClick={() => navigate('/consulta')}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-sky-300 border-2 border-transparent transition-all"
          >
            <Search className="w-10 h-10 text-sky-600 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Consulta de Datos</h3>
            <p className="text-slate-500 text-sm mt-1">
              Buscar personal, vehículos y visitantes
            </p>
          </button>

          {/* Módulo: Importación Masiva (solo ADMIN) */}
          {user.rol === 'ADMIN' && (
            <button
              onClick={() => navigate('/importacion')}
              className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-cyan-300 border-2 border-transparent transition-all"
            >
              <Database className="w-10 h-10 text-cyan-600 mb-3" />
              <h3 className="font-bold text-slate-800 text-lg">Importación Masiva</h3>
              <p className="text-slate-500 text-sm mt-1">
                Cargar datos desde Excel/CSV
              </p>
            </button>
          )}

          {/* Módulo: Panel de Administración (solo ADMIN) */}
          {user.rol === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-amber-300 border-2 border-transparent transition-all"
            >
              <Shield className="w-10 h-10 text-amber-600 mb-3" />
              <h3 className="font-bold text-slate-800 text-lg">Panel de Administración</h3>
              <p className="text-slate-500 text-sm mt-1">
                Gestión de usuarios, zonas y auditoría
              </p>
            </button>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECCIÓN 2: ESTADÍSTICAS DEL TURNO (ABAJO) */}
        {/* ============================================================ */}
        <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Estadísticas del Turno
        </h2>

        {/* Primera fila: 5 tarjetas principales */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <StatCard
            titulo="Personal Total"
            valor={stats?.total_personal || 0}
            icono={<Users className="w-6 h-6" style={{ color: '#3b82f6' }} />}
            color="#3b82f6"
            subtitulo="Registrados"
          />
          <StatCard
            titulo="Dentro"
            valor={stats?.personal_dentro || 0}
            icono={<UserCheck className="w-6 h-6" style={{ color: '#10b981' }} />}
            color="#10b981"
            subtitulo="Actualmente"
          />
          <StatCard
            titulo="Entradas"
            valor={stats?.entradas_personal || 0}
            icono={<TrendingUp className="w-6 h-6" style={{ color: '#10b981' }} />}
            color="#10b981"
            subtitulo="Personal"
          />
          <StatCard
            titulo="Salidas"
            valor={stats?.salidas_personal || 0}
            icono={<UserX className="w-6 h-6" style={{ color: '#ef4444' }} />}
            color="#ef4444"
            subtitulo="Personal"
          />
          <StatCard
            titulo="Visitantes"
            valor={stats?.total_visitantes || 0}
            icono={<DoorOpen className="w-6 h-6" style={{ color: '#8b5cf6' }} />}
            color="#8b5cf6"
            subtitulo="Registrados"
          />
        </div>

        {/* Segunda fila: 3 tarjetas secundarias */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            titulo="Entradas Materiales"
            valor={stats?.entradas_materiales || 0}
            icono={<Package className="w-6 h-6" style={{ color: '#10b981' }} />}
            color="#10b981"
          />
          <StatCard
            titulo="Salidas Materiales"
            valor={stats?.salidas_materiales || 0}
            icono={<Package className="w-6 h-6" style={{ color: '#ef4444' }} />}
            color="#ef4444"
          />
          <StatCard
            titulo="Vehículos"
            valor={stats?.total_vehiculos || 0}
            icono={<Car className="w-6 h-6" style={{ color: '#f59e0b' }} />}
            color="#f59e0b"
          />
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMACIÓN PARA CERRAR TURNO */}
      {/* ============================================================ */}
      {mostrarModalCerrar && sesionActiva && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-600 text-white p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-bold">Confirmar Cierre de Turno</h3>
                  <p className="text-sm text-amber-100">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Está a punto de cerrar el turno activo:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-sm">
                  <span className="font-semibold text-slate-600">🌍 Zona:</span>{' '}
                  <span className="font-bold text-slate-800">{sesionActiva.zona}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-slate-600">📍 Punto:</span>{' '}
                  <span className="font-bold text-slate-800">{sesionActiva.punto_control}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-slate-600">🕐 Turno:</span>{' '}
                  <span className="font-bold text-slate-800">{sesionActiva.turno_nombre}</span>
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Al confirmar, el punto de control quedará disponible para que otro usuario pueda abrir un nuevo turno.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalCerrar(false)}
                  disabled={cerrarSesionMutation.isPending}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarCierre}
                  disabled={cerrarSesionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {cerrarSesionMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Confirmar Cierre</>
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