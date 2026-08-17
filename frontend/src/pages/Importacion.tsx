import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { importacionApi, TipoImportacion, PreviewResponse, ResultadoImportacion, ImportacionLog } from '../services/importacion';
import { toast } from 'sonner';
import {
  ArrowLeft, Upload, FileSpreadsheet, Eye, CheckCircle2, XCircle,
  AlertCircle, Loader2, Clock, Database, Download, Trash2,
  FileText, TrendingUp, TrendingDown, SkipForward, History
} from 'lucide-react';

type VistaActual = 'upload' | 'preview' | 'resultado' | 'historial' | 'detalle';

export default function Importacion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [vistaActual, setVistaActual] = useState<VistaActual>('upload');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [archivoId, setArchivoId] = useState('');
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);

  // Cargar tipos de importación
  const { data: tipos = [], isLoading: cargandoTipos } = useQuery({
    queryKey: ['tipos-importacion'],
    queryFn: importacionApi.listarTipos
  });

  // Cargar historial
  const { data: historial = [], isLoading: cargandoHistorial } = useQuery({
    queryKey: ['historial-importacion'],
    queryFn: () => importacionApi.historial(50)
  });

  // Mutación: Upload
  const uploadMutation = useMutation({
    mutationFn: ({ archivo, tipo }: { archivo: File; tipo: string }) =>
      importacionApi.upload(archivo, tipo),
    onSuccess: async (data) => {
      setArchivoId(data.archivo_id);
      toast.success('Archivo subido correctamente');
      
      // Obtener preview automáticamente
      try {
        const preview = await importacionApi.preview(data.archivo_id, tipoSeleccionado);
        setPreviewData(preview);
        setVistaActual('preview');
      } catch (error: any) {
        const msg = error.response?.data?.detail;
        if (typeof msg === 'object' && msg.errores) {
          toast.error(`Columnas requeridas no encontradas: ${msg.errores.join(', ')}`);
        } else {
          toast.error(msg || 'Error al procesar el archivo');
        }
        resetearEstado();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al subir archivo');
    }
  });

  // Mutación: Procesar
  const procesarMutation = useMutation({
    mutationFn: () => importacionApi.procesar(archivoId, tipoSeleccionado),
    onSuccess: (data) => {
      setResultado(data);
      setVistaActual('resultado');
      queryClient.invalidateQueries({ queryKey: ['historial-importacion'] });
      
      if (data.estado === 'COMPLETADO') {
        toast.success(`✅ Importación completada: ${data.insertados + data.actualizados} registros procesados`);
      } else if (data.estado === 'PARCIAL') {
        toast.warning(`⚠️ Importación parcial: ${data.errores} errores detectados`);
      } else {
        toast.error(`❌ Importación fallida: ${data.errores} errores`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al procesar importación');
    }
  });

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setArchivoSeleccionado(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Handlers
  const handleSubirYPrevisualizar = () => {
    if (!archivoSeleccionado) {
      toast.error('Selecciona un archivo primero');
      return;
    }
    if (!tipoSeleccionado) {
      toast.error('Selecciona el tipo de importación');
      return;
    }
    uploadMutation.mutate({ archivo: archivoSeleccionado, tipo: tipoSeleccionado });
  };

  const handleConfirmarImportacion = () => {
    procesarMutation.mutate();
  };

  const handleVerDetalle = async (logId: number) => {
    setDetalleSeleccionado(logId);
    setVistaActual('detalle');
  };

  const resetearEstado = () => {
    setArchivoSeleccionado(null);
    setArchivoId('');
    setPreviewData(null);
    setResultado(null);
    setTipoSeleccionado('');
    setVistaActual('upload');
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO': return 'bg-green-100 text-green-800';
      case 'PARCIAL': return 'bg-amber-100 text-amber-800';
      case 'FALLIDO': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO': return <CheckCircle2 className="w-4 h-4" />;
      case 'PARCIAL': return <AlertCircle className="w-4 h-4" />;
      case 'FALLIDO': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

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
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-lg">
            <Database className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Importación Masiva de Datos</h1>
            <p className="text-sm text-cyan-100">
              Sube archivos Excel/CSV para actualizar catálogos y registros masivamente
            </p>
          </div>
          {vistaActual !== 'upload' && (
            <button
              onClick={resetearEstado}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Nueva Importación
            </button>
          )}
        </div>
      </div>

      {/* Contenido según vista actual */}
      {vistaActual === 'upload' && (
        <VistaUpload
          tipos={tipos}
          cargandoTipos={cargandoTipos}
          tipoSeleccionado={tipoSeleccionado}
          setTipoSeleccionado={setTipoSeleccionado}
          archivoSeleccionado={archivoSeleccionado}
          setArchivoSeleccionado={setArchivoSeleccionado}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          onSubir={handleSubirYPrevisualizar}
          isUploading={uploadMutation.isPending}
          historial={historial}
          cargandoHistorial={cargandoHistorial}
          onVerDetalle={handleVerDetalle}
          getEstadoColor={getEstadoColor}
          getEstadoIcono={getEstadoIcono}
        />
      )}

      {vistaActual === 'preview' && previewData && (
        <VistaPreview
          preview={previewData}
          tipoSeleccionado={tipoSeleccionado}
          tipos={tipos}
          onConfirmar={handleConfirmarImportacion}
          onCancelar={resetearEstado}
          isProcessing={procesarMutation.isPending}
        />
      )}

      {vistaActual === 'resultado' && resultado && (
        <VistaResultado
          resultado={resultado}
          onNuevaImportacion={resetearEstado}
          onVerHistorial={() => setVistaActual('historial')}
        />
      )}

      {vistaActual === 'historial' && (
        <VistaHistorial
          historial={historial}
          cargando={cargandoHistorial}
          onVerDetalle={handleVerDetalle}
          onVolver={() => setVistaActual('upload')}
          getEstadoColor={getEstadoColor}
          getEstadoIcono={getEstadoIcono}
        />
      )}

      {vistaActual === 'detalle' && detalleSeleccionado && (
        <VistaDetalle
          logId={detalleSeleccionado}
          onVolver={() => setVistaActual('historial')}
        />
      )}
    </div>
  );
}

// ============================================================
// VISTA 1: UPLOAD (Subir archivo)
// ============================================================
function VistaUpload({
  tipos, cargandoTipos, tipoSeleccionado, setTipoSeleccionado,
  archivoSeleccionado, setArchivoSeleccionado,
  getRootProps, getInputProps, isDragActive,
  onSubir, isUploading,
  historial, cargandoHistorial, onVerDetalle, getEstadoColor, getEstadoIcono
}: any) {
  return (
    <div className="space-y-6">
      {/* Configuración */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-cyan-600" />
          Configuración de Importación
        </h2>

        {/* Tipo de importación */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Tipo de Datos a Importar *
          </label>
          {cargandoTipos ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando tipos...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {tipos.map((tipo: TipoImportacion) => (
                <button
                  key={tipo.codigo}
                  onClick={() => setTipoSeleccionado(tipo.codigo)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    tipoSeleccionado === tipo.codigo
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-800">{tipo.nombre}</div>
                  <div className="text-xs text-slate-500 mt-1">{tipo.descripcion}</div>
                  <div className="text-xs text-cyan-600 mt-2 font-mono">
                    Clave: {tipo.columna_clave}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zona de Drop */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Archivo a Importar *
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-cyan-500 bg-cyan-50'
                : archivoSeleccionado
                ? 'border-green-500 bg-green-50'
                : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            {archivoSeleccionado ? (
              <div>
                <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-bold text-slate-800">{archivoSeleccionado.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(archivoSeleccionado.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-xs text-green-600 mt-2">
                  ✅ Archivo listo para procesar
                </p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="font-bold text-slate-700">
                  {isDragActive ? '¡Suelta el archivo aquí!' : 'Arrastra tu archivo Excel/CSV aquí'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Formatos: .xlsx, .xls, .csv | Máximo: 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón de acción */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onSubir}
            disabled={!archivoSeleccionado || !tipoSeleccionado || isUploading}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Subiendo...</>
            ) : (
              <><Eye className="w-5 h-5" /> Subir y Previsualizar</>
            )}
          </button>
        </div>
      </div>

      {/* Historial rápido */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-600" />
            Historial Reciente
          </h2>
        </div>

        {cargandoHistorial ? (
          <div className="text-center py-6 text-slate-500">Cargando...</div>
        ) : historial.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay importaciones previas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">FECHA</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">ARCHIVO</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">TIPO</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">TOTAL</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">ESTADO</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.slice(0, 5).map((log: ImportacionLog) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {new Date(log.fecha_importacion).toLocaleString('es-VE', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">{log.nombre_archivo}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{log.tipo_importacion}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{log.total_filas}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getEstadoColor(log.estado)}`}>
                        {getEstadoIcono(log.estado)}
                        {log.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onVerDetalle(log.id)}
                        className="text-cyan-600 hover:text-cyan-800 text-xs font-semibold"
                      >
                        Ver detalle
                      </button>
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

// ============================================================
// VISTA 2: PREVIEW (Previsualizar datos)
// ============================================================
function VistaPreview({
  preview, tipoSeleccionado, tipos, onConfirmar, onCancelar, isProcessing
}: {
  preview: PreviewResponse;
  tipoSeleccionado: string;
  tipos: TipoImportacion[];
  onConfirmar: () => void;
  onCancelar: () => void;
  isProcessing: boolean;
}) {
  const tipoInfo = tipos.find((t: TipoImportacion) => t.codigo === tipoSeleccionado);
  const filasValidas = preview.filas_preview.filter((f: any) => f.es_valida).length;
  const filasInvalidas = preview.filas_preview.length - filasValidas;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header del preview */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Eye className="w-5 h-5" /> Previsualización del Archivo
            </h2>
            <p className="text-sm text-cyan-100 mt-1">
              {preview.nombre_archivo} • {preview.total_filas} filas detectadas
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Tipo: {tipoInfo?.nombre}</p>
            <p className="text-xs text-cyan-100">Clave: {tipoInfo?.columna_clave}</p>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-slate-200 bg-slate-50">
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500">Total de filas</div>
          <div className="text-2xl font-bold text-slate-800">{preview.total_filas}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-green-200">
          <div className="text-xs text-green-600">Filas válidas (preview)</div>
          <div className="text-2xl font-bold text-green-700">{filasValidas}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-red-200">
          <div className="text-xs text-red-600">Con errores</div>
          <div className="text-2xl font-bold text-red-700">{filasInvalidas}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-cyan-200">
          <div className="text-xs text-cyan-600">Columnas detectadas</div>
          <div className="text-2xl font-bold text-cyan-700">{preview.columnas_detectadas.length}</div>
        </div>
      </div>

      {/* Advertencias */}
      {preview.advertencias.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Advertencias</p>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                {preview.advertencias.map((adv: string, idx: number) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de preview */}
      <div className="p-5">
        <h3 className="font-bold text-slate-800 mb-3">
          Primeras {preview.filas_preview.length} filas (de {preview.total_filas} totales)
        </h3>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-slate-600">#</th>
                {preview.columnas_detectadas.map((col: string) => (
                  <th key={col} className="px-3 py-2 text-xs font-semibold text-slate-600">
                    {col}
                  </th>
                ))}
                <th className="px-3 py-2 text-xs font-semibold text-slate-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.filas_preview.map((fila: any) => (
                <tr
                  key={fila.numero_fila}
                  className={fila.es_valida ? 'hover:bg-slate-50' : 'bg-red-50'}
                >
                  <td className="px-3 py-2 text-xs font-mono text-slate-500">{fila.numero_fila}</td>
                  {preview.columnas_detectadas.map((col: string) => (
                    <td key={col} className="px-3 py-2 text-xs text-slate-700 max-w-xs truncate">
                      {fila.datos[col] || '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {fila.es_valida ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-xs">{fila.error}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="bg-slate-50 border-t border-slate-200 p-5 flex justify-between items-center">
        <button
          onClick={onCancelar}
          disabled={isProcessing}
          className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={isProcessing}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Confirmar Importación</>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VISTA 3: RESULTADO (Reporte final)
// ============================================================
function VistaResultado({
  resultado, onNuevaImportacion, onVerHistorial
}: {
  resultado: ResultadoImportacion;
  onNuevaImportacion: () => void;
  onVerHistorial: () => void;
}) {
  const totalProcesados = resultado.insertados + resultado.actualizados;
  const porcentajeExito = resultado.total_filas > 0
    ? Math.round((totalProcesados / resultado.total_filas) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header del resultado */}
      <div className={`rounded-xl p-6 shadow-lg text-white ${
        resultado.estado === 'COMPLETADO' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
        resultado.estado === 'PARCIAL' ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
        'bg-gradient-to-r from-red-600 to-rose-600'
      }`}>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-full">
            {resultado.estado === 'COMPLETADO' ? <CheckCircle2 className="w-10 h-10" /> :
             resultado.estado === 'PARCIAL' ? <AlertCircle className="w-10 h-10" /> :
             <XCircle className="w-10 h-10" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {resultado.estado === 'COMPLETADO' ? '✅ Importación Completada' :
               resultado.estado === 'PARCIAL' ? '⚠️ Importación Parcial' :
               '❌ Importación Fallida'}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {resultado.nombre_archivo} • {resultado.tiempo_procesamiento_seg}s de procesamiento
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas detalladas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-cyan-500">
          <div className="text-sm text-slate-500">Total Filas</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">{resultado.total_filas}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-600" /> Insertados
          </div>
          <div className="text-3xl font-bold text-green-700 mt-1">{resultado.insertados}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-blue-600" /> Actualizados
          </div>
          <div className="text-3xl font-bold text-blue-700 mt-1">{resultado.actualizados}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-slate-400">
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <SkipForward className="w-4 h-4 text-slate-500" /> Omitidos
          </div>
          <div className="text-3xl font-bold text-slate-700 mt-1">{resultado.omitidos}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <XCircle className="w-4 h-4 text-red-600" /> Errores
          </div>
          <div className="text-3xl font-bold text-red-700 mt-1">{resultado.errores}</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-slate-700">Tasa de Éxito</span>
          <span className="text-sm font-bold text-slate-800">{porcentajeExito}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              porcentajeExito === 100 ? 'bg-green-500' :
              porcentajeExito >= 80 ? 'bg-blue-500' :
              porcentajeExito >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${porcentajeExito}%` }}
          ></div>
        </div>
      </div>

      {/* Lista de errores */}
      {resultado.detalles_error.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Errores Detectados ({resultado.detalles_error.length})
            </h3>
          </div>
          <div className="p-5 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {resultado.detalles_error.map((err, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      Fila {err.fila}
                    </span>
                    <p className="text-sm text-red-800 flex-1">{err.error}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onVerHistorial}
          className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2"
        >
          <History className="w-4 h-4" /> Ver Historial
        </button>
        <button
          onClick={onNuevaImportacion}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Nueva Importación
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VISTA 4: HISTORIAL
// ============================================================
function VistaHistorial({
  historial, cargando, onVerDetalle, onVolver, getEstadoColor, getEstadoIcono
}: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5" /> Historial Completo de Importaciones
        </h2>
        <p className="text-sm text-cyan-100 mt-1">
          {historial.length} importaciones registradas
        </p>
      </div>

      {cargando ? (
        <div className="p-8 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Cargando historial...
        </div>
      ) : historial.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p>No hay importaciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">FECHA</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">ARCHIVO</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">TIPO</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">USUARIO</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">TOTAL</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">INSERTADOS</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACTUALIZADOS</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">ERRORES</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">ESTADO</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((log: ImportacionLog) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {new Date(log.fecha_importacion).toLocaleString('es-VE')}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900">{log.nombre_archivo}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.tipo_importacion}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.usuario_nombre || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-semibold">{log.total_filas}</td>
                  <td className="px-4 py-3 text-xs text-green-700 font-semibold">{log.insertados}</td>
                  <td className="px-4 py-3 text-xs text-blue-700 font-semibold">{log.actualizados}</td>
                  <td className="px-4 py-3 text-xs text-red-700 font-semibold">{log.errores}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getEstadoColor(log.estado)}`}>
                      {getEstadoIcono(log.estado)}
                      {log.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerDetalle(log.id)}
                      className="text-cyan-600 hover:text-cyan-800 text-xs font-semibold"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-slate-200 flex justify-end">
        <button
          onClick={onVolver}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VISTA 5: DETALLE DE IMPORTACIÓN
// ============================================================
function VistaDetalle({ logId, onVolver }: { logId: number; onVolver: () => void }) {
  const { data: detalle, isLoading } = useQuery({
    queryKey: ['detalle-importacion', logId],
    queryFn: () => importacionApi.detalle(logId)
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-cyan-600" />
        <p className="text-slate-500">Cargando detalle...</p>
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <XCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
        <p className="text-slate-500">No se encontró el detalle</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalle de Importación #{detalle.id}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {detalle.nombre_archivo} • {new Date(detalle.fecha_importacion).toLocaleString('es-VE')}
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            detalle.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
            detalle.estado === 'PARCIAL' ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'
          }`}>
            {detalle.estado}
          </span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-2xl font-bold text-slate-800">{detalle.total_filas}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-green-500">
          <div className="text-xs text-green-600">Insertados</div>
          <div className="text-2xl font-bold text-green-700">{detalle.insertados}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-blue-500">
          <div className="text-xs text-blue-600">Actualizados</div>
          <div className="text-2xl font-bold text-blue-700">{detalle.actualizados}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-slate-400">
          <div className="text-xs text-slate-500">Omitidos</div>
          <div className="text-2xl font-bold text-slate-700">{detalle.omitidos}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-red-500">
          <div className="text-xs text-red-600">Errores</div>
          <div className="text-2xl font-bold text-red-700">{detalle.errores}</div>
        </div>
      </div>

      {/* Errores detallados */}
      {detalle.detalles_error && detalle.detalles_error.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <h3 className="font-bold text-red-800">
              Errores Detectados ({detalle.detalles_error.length})
            </h3>
          </div>
          <div className="p-5 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">FILA</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">ERROR</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600">DATOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalle.detalles_error.map((err: any, idx: number) => (
                  <tr key={idx} className="hover:bg-red-50">
                    <td className="px-3 py-2 text-xs font-mono text-red-600">{err.fila}</td>
                    <td className="px-3 py-2 text-xs text-slate-800">{err.error}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 font-mono">
                      {JSON.stringify(err.datos).substring(0, 100)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón volver */}
      <div className="flex justify-end">
        <button
          onClick={onVolver}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium"
        >
          Volver al Historial
        </button>
      </div>
    </div>
  );
}