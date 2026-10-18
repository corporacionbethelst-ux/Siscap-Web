import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { historialApi, HistorialItem, HistorialFiltros } from '../services/historial';
import { zonaApi } from '../services/zona';
import { toast } from 'sonner';
import {
  ArrowLeft, Search, Download, Trash2, FileText, LogIn, LogOut,
  Calendar, Filter, Users, Package, DoorOpen, Globe, MapPin, Loader2, ClipboardList
} from 'lucide-react';

export default function Historial() {
  const navigate = useNavigate();
  const hoy = new Date().toISOString().split('T')[0];

  const [filtros, setFiltros] = useState<HistorialFiltros>({
    fecha_desde: hoy,
    fecha_hasta: hoy,
    tipo: 'TODOS',
    movimiento: 'TODOS',
    zona: '',
    punto_control: '',
    gerencia: 'TODAS',
    empresa: 'TODAS',
    busqueda: '',
    grupo_trabajo: 'TODOS',
    numero_semana: undefined
  });

  const [resultados, setResultados] = useState<HistorialItem[]>([]);
  const [buscado, setBuscado] = useState(false);

  // Cargar zonas
  const { data: zonas = [] } = useQuery({
    queryKey: ['zonas-historial'],
    queryFn: zonaApi.listarTodas
  });

  // Cargar puntos de control
  const { data: todosLosPuntos = [] } = useQuery({
    queryKey: ['puntos-historial'],
    queryFn: () => zonaApi.listarPuntosControl()
  });

  // Puntos filtrados por zona (cascada)
  const puntosFiltrados = useMemo(() => {
    if (!filtros.zona) return todosLosPuntos;
    const zonaActual = zonas.find(z => z.nombre === filtros.zona);
    if (!zonaActual) return todosLosPuntos;
    return todosLosPuntos.filter(p => p.zona_id === zonaActual.id || p.zona_id === null);
  }, [filtros.zona, zonas, todosLosPuntos]);

  const buscarMutation = useMutation({
    mutationFn: historialApi.buscar,
    onSuccess: (data) => {
      setResultados(data);
      setBuscado(true);
      if (data.length === 0) {
        toast.info('No se encontraron resultados');
      } else {
        toast.success(`${data.length} registros encontrados`);
      }
    },
    onError: () => {
      toast.error('Error al buscar');
    }
  });

  const exportarMutation = useMutation({
    mutationFn: historialApi.exportarCSV,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_${filtros.fecha_desde}_a_${filtros.fecha_hasta}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportados ${resultados.length} registros`);
    },
    onError: () => {
      toast.error('Error al exportar');
    }
  });

  const handleBuscar = () => {
    const filtrosLimpios: any = { ...filtros };
    if (!filtrosLimpios.zona) delete filtrosLimpios.zona;
    if (!filtrosLimpios.punto_control) delete filtrosLimpios.punto_control;
    buscarMutation.mutate(filtrosLimpios);
  };

  const handleLimpiar = () => {
    setFiltros({
      fecha_desde: hoy,
      fecha_hasta: hoy,
      tipo: 'TODOS',
      movimiento: 'TODOS',
      zona: '',
      punto_control: '',
      gerencia: 'TODAS',
      empresa: 'TODAS',
      busqueda: '',
      grupo_trabajo: 'TODOS',
      numero_semana: undefined
    });
    setResultados([]);
    setBuscado(false);
    toast.info('Filtros limpiados');
  };

  const handleExportar = () => {
    if (resultados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const filtrosLimpios: any = { ...filtros };
    if (!filtrosLimpios.zona) delete filtrosLimpios.zona;
    if (!filtrosLimpios.punto_control) delete filtrosLimpios.punto_control;
    exportarMutation.mutate(filtrosLimpios);
  };

  const updateFiltro = (key: keyof HistorialFiltros, value: any) => {
    setFiltros(prev => {
      const nuevos = { ...prev, [key]: value };
      if (key === 'zona') {
        nuevos.punto_control = '';
      }
      return nuevos;
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'PERSONAL': return <Users className="w-3 h-3" />;
      case 'MATERIAL': return <Package className="w-3 h-3" />;
      case 'VISITANTE': return <DoorOpen className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'PERSONAL': return 'bg-blue-100 text-blue-800';
      case 'MATERIAL': return 'bg-indigo-100 text-indigo-800';
      case 'VISITANTE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/dept/proteccion-prevencion/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al Dashboard
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-lg">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Historial y Reportes</h1>
            <p className="text-sm text-emerald-100">Búsqueda avanzada con filtros por zona y punto de control</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" /> Filtros de Búsqueda
        </h2>

        {/* Fila 1: Fechas, Tipo, Movimiento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => updateFiltro('fecha_desde', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => updateFiltro('fecha_hasta', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => updateFiltro('tipo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option value="TODOS">TODOS</option>
              <option value="PERSONAL">PERSONAL</option>
              <option value="MATERIAL">MATERIAL</option>
              <option value="VISITANTE">VISITANTE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Movimiento</label>
            <select
              value={filtros.movimiento}
              onChange={(e) => updateFiltro('movimiento', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option value="TODOS">TODOS</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA">SALIDA</option>
            </select>
          </div>
        </div>

        {/* Fila 2: ZONA Y PUNTO DE CONTROL (CASCADA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div>
            <label className="block text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Zona Geográfica
            </label>
            <select
              value={filtros.zona || ''}
              onChange={(e) => updateFiltro('zona', e.target.value)}
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
            >
              <option value="">-- Todas las zonas --</option>
              {zonas.filter((z: any) => z.estatus === 'ACTIVO').map((z: any) => (
                <option key={z.id} value={z.nombre}>{z.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-emerald-600 mt-1">
              💡 Al seleccionar zona, se filtran los puntos
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Punto de Control
            </label>
            <select
              value={filtros.punto_control || ''}
              onChange={(e) => updateFiltro('punto_control', e.target.value)}
              disabled={!filtros.zona}
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {filtros.zona ? '-- Todos los puntos de esta zona --' : '-- Primero seleccione una zona --'}
              </option>
              {puntosFiltrados.map((p: any) => (
                <option key={p.id} value={p.nombre}>
                  {p.nombre}{p.zona_id === null ? ' (General)' : ''}
                </option>
              ))}
            </select>
            {filtros.zona && (
              <p className="text-xs text-emerald-600 mt-1">
                ✅ {puntosFiltrados.length} puntos disponibles en {filtros.zona}
              </p>
            )}
          </div>
        </div>

        {/* Fila 3: Gerencia, Empresa, Búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Gerencia</label>
            <input
              type="text"
              value={filtros.gerencia || ''}
              onChange={(e) => updateFiltro('gerencia', e.target.value || 'TODAS')}
              placeholder="TODAS"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa</label>
            <input
              type="text"
              value={filtros.empresa || ''}
              onChange={(e) => updateFiltro('empresa', e.target.value || 'TODAS')}
              placeholder="TODAS"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" /> Cédula / Nombre
            </label>
            <input
              type="text"
              value={filtros.busqueda || ''}
              onChange={(e) => updateFiltro('busqueda', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              placeholder="Buscar por cédula o nombre..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Fila 4: Grupo, Semana */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Grupo</label>
            <select
              value={filtros.grupo_trabajo || 'TODOS'}
              onChange={(e) => updateFiltro('grupo_trabajo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option value="TODOS">TODOS</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Semana</label>
            <input
              type="number"
              min="1"
              max="53"
              value={filtros.numero_semana || ''}
              onChange={(e) => updateFiltro('numero_semana', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ej: 32"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200">
          <button
            onClick={handleBuscar}
            disabled={buscarMutation.isPending}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {buscarMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</> : <><Search className="w-4 h-4" /> CONSULTAR</>}
          </button>
          <button
            onClick={handleLimpiar}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> LIMPIAR
          </button>
          <button
            onClick={handleExportar}
            disabled={exportarMutation.isPending || resultados.length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {exportarMutation.isPending ? 'Exportando...' : <><Download className="w-4 h-4" /> EXPORTAR CSV</>}
          </button>
          {buscado && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className={`font-bold ${resultados.length > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                📊 Resultados: {resultados.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-slate-800">Resultados de la Búsqueda</h2>
        </div>

        {!buscado ? (
          <div className="p-12 text-center text-slate-400">
            <Search className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Configure los filtros y presione CONSULTAR</p>
            <p className="text-sm mt-1">Los resultados aparecerán aquí</p>
          </div>
        ) : resultados.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>No se encontraron registros con los filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">FECHA</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">HORA</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">TIPO</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">CÉDULA</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">NOMBRE</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">EMPRESA/DETALLE</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">PUNTO</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">GRUPO</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600">MOV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultados.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-xs text-slate-700">{r.fecha}</td>
                    <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.hora}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTipoColor(r.tipo)}`}>
                        {getTipoIcon(r.tipo)}
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">{r.cedula || '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{r.nombre || '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 max-w-xs truncate" title={r.empresa_gerencia || ''}>
                      {r.empresa_gerencia || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        <MapPin className="w-3 h-3" />
                        {r.punto_control || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{r.grupo || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        r.movimiento === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.movimiento === 'ENTRADA' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        {r.movimiento}
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