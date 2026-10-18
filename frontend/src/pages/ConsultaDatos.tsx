import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { consultaApi, PersonalData, VehiculoData, VisitanteData } from '../services/consulta';
import {
  ArrowLeft, Search, Users, Car, UserCheck, Eye, X,
  Building, Phone, Calendar, Shield, Loader2
} from 'lucide-react';

type TabType = 'personal' | 'vehiculos' | 'visitantes';

export default function ConsultaDatos() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Cargar datos
  const { data: personal = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ['consulta-personal'],
    queryFn: consultaApi.listarPersonal
  });

  const { data: vehiculos = [], isLoading: loadingVehiculos } = useQuery({
    queryKey: ['consulta-vehiculos'],
    queryFn: consultaApi.listarVehiculos
  });

  const { data: visitantes = [], isLoading: loadingVisitantes } = useQuery({
    queryKey: ['consulta-visitantes'],
    queryFn: consultaApi.listarVisitantes
  });

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

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-lg">
            <Search className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Consulta de Datos Maestros</h1>
            <p className="text-sm text-blue-100">Búsqueda rápida con filtros avanzados</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <TabButton
            active={activeTab === 'personal'}
            onClick={() => setActiveTab('personal')}
            icon={<Users className="w-4 h-4" />}
            label="Personal"
            count={personal.length}
            color="blue"
          />
          <TabButton
            active={activeTab === 'vehiculos'}
            onClick={() => setActiveTab('vehiculos')}
            icon={<Car className="w-4 h-4" />}
            label="Vehículos"
            count={vehiculos.length}
            color="green"
          />
          <TabButton
            active={activeTab === 'visitantes'}
            onClick={() => setActiveTab('visitantes')}
            icon={<UserCheck className="w-4 h-4" />}
            label="Visitantes"
            count={visitantes.length}
            color="purple"
          />
        </div>

        <div className="p-6">
          {activeTab === 'personal' && (
            <ConsultaPersonal data={personal} isLoading={loadingPersonal} />
          )}
          {activeTab === 'vehiculos' && (
            <ConsultaVehiculos data={vehiculos} isLoading={loadingVehiculos} />
          )}
          {activeTab === 'visitantes' && (
            <ConsultaVisitantes data={visitantes} isLoading={loadingVisitantes} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: TAB BUTTON
// ============================================================
function TabButton({ active, onClick, icon, label, count, color }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; count: number; color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: active ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50',
    green: active ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-slate-600 hover:bg-slate-50',
    purple: active ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-600 hover:bg-slate-50'
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${colorClasses[color]}`}
    >
      {icon} {label}
      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
        {count}
      </span>
    </button>
  );
}

// ============================================================
// COMPONENTE: CONSULTA PERSONAL
// ============================================================
function ConsultaPersonal({ data, isLoading }: { data: PersonalData[]; isLoading: boolean }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('TODAS');
  const [filtroGerencia, setFiltroGerencia] = useState('TODAS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');
  const [personalSeleccionado, setPersonalSeleccionado] = useState<PersonalData | null>(null);

  const empresas = useMemo(() => {
    const unique = [...new Set(data.map(p => p.empresa).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const gerencias = useMemo(() => {
    const unique = [...new Set(data.map(p => p.gerencia).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const tipos = useMemo(() => {
    const unique = [...new Set(data.map(p => p.tipo).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const datosFiltrados = useMemo(() => {
    return data.filter(item => {
      const matchBusqueda = busqueda === '' ||
        item.cedula.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombres.toLowerCase().includes(busqueda.toLowerCase());
      
      const matchEmpresa = filtroEmpresa === 'TODAS' || item.empresa === filtroEmpresa;
      const matchGerencia = filtroGerencia === 'TODAS' || item.gerencia === filtroGerencia;
      const matchTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
      const matchEstatus = filtroEstatus === 'TODOS' || item.estatus === filtroEstatus;

      return matchBusqueda && matchEmpresa && matchGerencia && matchTipo && matchEstatus;
    });
  }, [data, busqueda, filtroEmpresa, filtroGerencia, filtroTipo, filtroEstatus]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-slate-500">Cargando personal...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cédula o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">Empresa</label>
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
          >
            <option value="TODAS">Todas</option>
            {empresas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">Gerencia</label>
          <select
            value={filtroGerencia}
            onChange={(e) => setFiltroGerencia(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
          >
            <option value="TODAS">Todas</option>
            {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">Tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
          >
            <option value="TODOS">Todos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">Estatus</label>
          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-slate-600 mb-3">
        Mostrando <strong>{datosFiltrados.length}</strong> de <strong>{data.length}</strong> registros
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">CÉDULA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRES</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">EMPRESA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">GERENCIA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">TIPO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              datosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono text-slate-900">{p.cedula}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{p.nombres}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.empresa || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.gerencia || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {p.tipo || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      p.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {p.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPersonalSeleccionado(p)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle */}
      {personalSeleccionado && (
        <ModalPersonal data={personalSeleccionado} onClose={() => setPersonalSeleccionado(null)} />
      )}
    </div>
  );
}

// ============================================================
// MODAL: DETALLE PERSONAL
// ============================================================
function ModalPersonal({ data, onClose }: { data: PersonalData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold">Datos Completos del Personal</h3>
              <p className="text-sm text-blue-100">Información detallada del registro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> INFORMACIÓN BÁSICA
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Cédula:</strong> <span className="font-mono">{data.cedula}</span></p>
              <p className="text-sm"><strong>Nombres:</strong> {data.nombres}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" /> INFORMACIÓN LABORAL
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Empresa:</strong> {data.empresa || 'N/A'}</p>
              <p className="text-sm"><strong>Gerencia:</strong> {data.gerencia || 'N/A'}</p>
              <p className="text-sm"><strong>Tipo:</strong> {data.tipo || 'N/A'}</p>
              <p className="text-sm">
                <strong>Estatus:</strong>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                  data.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.estatus}
                </span>
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> REGISTRO
            </h4>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm">
                <strong>Fecha de Registro:</strong>{' '}
                {data.fecha_registro ? new Date(data.fecha_registro).toLocaleString('es-VE') : 'N/A'}
              </p>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: CONSULTA VEHÍCULOS
// ============================================================
function ConsultaVehiculos({ data, isLoading }: { data: VehiculoData[]; isLoading: boolean }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroColor, setFiltroColor] = useState('TODOS');
  const [filtroCondicion, setFiltroCondicion] = useState('TODAS');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoData | null>(null);

  const colores = useMemo(() => {
    const unique = [...new Set(data.map(v => v.color).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const condiciones = useMemo(() => {
    const unique = [...new Set(data.map(v => v.condicion).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const datosFiltrados = useMemo(() => {
    return data.filter(item => {
      const matchBusqueda = busqueda === '' ||
        item.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.marca || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.modelo || '').toLowerCase().includes(busqueda.toLowerCase());
      
      const matchColor = filtroColor === 'TODOS' || item.color === filtroColor;
      const matchCondicion = filtroCondicion === 'TODAS' || item.condicion === filtroCondicion;

      return matchBusqueda && matchColor && matchCondicion;
    });
  }, [data, busqueda, filtroColor, filtroCondicion]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-green-600" />
        <p className="text-slate-500">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-green-800 mb-1">Color</label>
          <select
            value={filtroColor}
            onChange={(e) => setFiltroColor(e.target.value)}
            className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
          >
            <option value="TODOS">Todos</option>
            {colores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-green-800 mb-1">Condición</label>
          <select
            value={filtroCondicion}
            onChange={(e) => setFiltroCondicion(e.target.value)}
            className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
          >
            <option value="TODAS">Todas</option>
            {condiciones.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-slate-600 mb-3">
        Mostrando <strong>{datosFiltrados.length}</strong> de <strong>{data.length}</strong> registros
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">PLACA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">MARCA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">MODELO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">COLOR</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">AÑO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">CONDICIÓN</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              datosFiltrados.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-bold text-slate-900">{v.placa}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{v.marca || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{v.modelo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{v.color || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{v.anio || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      {v.condicion || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setVehiculoSeleccionado(v)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle */}
      {vehiculoSeleccionado && (
        <ModalVehiculo data={vehiculoSeleccionado} onClose={() => setVehiculoSeleccionado(null)} />
      )}
    </div>
  );
}

// ============================================================
// MODAL: DETALLE VEHÍCULO
// ============================================================
function ModalVehiculo({ data, onClose }: { data: VehiculoData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-green-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold">Datos Completos del Vehículo</h3>
              <p className="text-sm text-green-100">Información detallada del registro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" /> IDENTIFICACIÓN
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Placa:</strong> <span className="font-mono font-bold">{data.placa}</span></p>
              <p className="text-sm"><strong>Serial/Chasis:</strong> {data.serial || 'N/A'}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Car className="w-4 h-4 text-green-600" /> CARACTERÍSTICAS
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Marca:</strong> {data.marca || 'N/A'}</p>
              <p className="text-sm"><strong>Modelo:</strong> {data.modelo || 'N/A'}</p>
              <p className="text-sm"><strong>Color:</strong> {data.color || 'N/A'}</p>
              <p className="text-sm"><strong>Año:</strong> {data.anio || 'N/A'}</p>
              <p className="text-sm">
                <strong>Condición:</strong>
                <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  {data.condicion || 'N/A'}
                </span>
              </p>
            </div>
          </div>
          {data.observacion && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">OBSERVACIONES</h4>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm">{data.observacion}</p>
              </div>
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: CONSULTA VISITANTES
// ============================================================
function ConsultaVisitantes({ data, isLoading }: { data: VisitanteData[]; isLoading: boolean }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('TODAS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [visitanteSeleccionado, setVisitanteSeleccionado] = useState<VisitanteData | null>(null);

  const empresas = useMemo(() => {
    const unique = [...new Set(data.map(v => v.empresa).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const tipos = useMemo(() => {
    const unique = [...new Set(data.map(v => v.tipo_visitante).filter(Boolean))];
    return unique.sort() as string[];
  }, [data]);

  const datosFiltrados = useMemo(() => {
    return data.filter(item => {
      const matchBusqueda = busqueda === '' ||
        item.cedula.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombres.toLowerCase().includes(busqueda.toLowerCase());
      
      const matchEmpresa = filtroEmpresa === 'TODAS' || item.empresa === filtroEmpresa;
      const matchTipo = filtroTipo === 'TODOS' || item.tipo_visitante === filtroTipo;

      return matchBusqueda && matchEmpresa && matchTipo;
    });
  }, [data, busqueda, filtroEmpresa, filtroTipo]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
        <p className="text-slate-500">Cargando visitantes...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cédula o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-purple-800 mb-1">Empresa</label>
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white"
          >
            <option value="TODAS">Todas</option>
            {empresas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-purple-800 mb-1">Tipo de Visitante</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white"
          >
            <option value="TODOS">Todos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-slate-600 mb-3">
        Mostrando <strong>{datosFiltrados.length}</strong> de <strong>{data.length}</strong> registros
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">CÉDULA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">NOMBRES</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">EMPRESA</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">TELÉFONO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">TIPO</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              datosFiltrados.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono text-slate-900">{v.cedula}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{v.nombres}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{v.empresa || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{v.telefono || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                      {v.tipo_visitante || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      v.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {v.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setVisitanteSeleccionado(v)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle */}
      {visitanteSeleccionado && (
        <ModalVisitante data={visitanteSeleccionado} onClose={() => setVisitanteSeleccionado(null)} />
      )}
    </div>
  );
}

// ============================================================
// MODAL: DETALLE VISITANTE
// ============================================================
function ModalVisitante({ data, onClose }: { data: VisitanteData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-purple-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold">Datos Completos del Visitante</h3>
              <p className="text-sm text-purple-100">Información detallada del registro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" /> INFORMACIÓN BÁSICA
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Cédula:</strong> <span className="font-mono">{data.cedula}</span></p>
              <p className="text-sm"><strong>Nombres:</strong> {data.nombres}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" /> INFORMACIÓN DE CONTACTO
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Empresa:</strong> {data.empresa || 'N/A'}</p>
              <p className="text-sm flex items-center gap-2">
                <strong><Phone className="w-4 h-4 inline" /> Teléfono:</strong> {data.telefono || 'N/A'}
              </p>
              <p className="text-sm">
                <strong>Tipo de Visitante:</strong>
                <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {data.tipo_visitante || 'N/A'}
                </span>
              </p>
              <p className="text-sm">
                <strong>Estatus:</strong>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                  data.estatus === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.estatus}
                </span>
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" /> REGISTRO
            </h4>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm">
                <strong>Fecha de Registro:</strong>{' '}
                {data.fecha_registro ? new Date(data.fecha_registro).toLocaleString('es-VE') : 'N/A'}
              </p>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}