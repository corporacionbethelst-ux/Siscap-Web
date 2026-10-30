/**
 * Página SALA SITUACIONAL — Panel de Monitoreo de Solo Lectura
 * ------------------------------------------------------------------
 * Proyección global (sin aislamiento por punto_control) de todo lo que
 * ocurre en el módulo Protección y Prevención. Diseñada para los roles
 * OBSERVADOR_SALA y ADMIN.
 *
 * RESTRICCIONES DE DISEÑO (regla de negocio):
 *  - NO renderiza formularios de creación/edición/eliminación.
 *  - Solo consume GETs de /api/sala-situacional/*.
 *  - Exportación a CSV puramente client-side (no muta backend).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import {
  salaApi,
  descargarCsv,
  PanoramaGlobal,
  SesionReporte,
  MovimientoUnificado,
  EventoAuditoria,
} from '../../services/sala';

type TabId = 'panorama' | 'sesiones' | 'movimientos' | 'auditoria';

const TABS: { id: TabId; label: string }[] = [
  { id: 'panorama', label: 'Panorama' },
  { id: 'sesiones', label: 'Turnos / Sesiones' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'auditoria', label: 'Auditoría' },
];

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CERRADA: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CERRADA_FORZADA: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LIBERADA_ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const TIPO_MOV_COLORS: Record<string, string> = {
  PERSONAL: 'text-blue-400',
  MATERIALES: 'text-purple-400',
  VISITANTES: 'text-teal-400',
};

export default function SalaSituacional() {
  const navigate = useNavigate();
  const { user, logout, checkAuth } = useAuthStore();
  const [tab, setTab] = useState<TabId>('panorama');
  const [loading, setLoading] = useState(false);

  // ---- Datos por pestaña ----
  const [panorama, setPanorama] = useState<PanoramaGlobal | null>(null);
  const [sesiones, setSesiones] = useState<SesionReporte[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoUnificado[]>([]);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);

  // ---- Filtros ----
  const [diasSesiones, setDiasSesiones] = useState(7);
  const [estadoSesion, setEstadoSesion] = useState('');
  const [diasMov, setDiasMov] = useState(1);
  const [tipoMov, setTipoMov] = useState('');
  const [puntoMov, setPuntoMov] = useState('');
  const [diasEv, setDiasEv] = useState(7);
  const [tipoEv, setTipoEv] = useState('');

  // Guard de acceso: solo ADMIN / OBSERVADOR_SALA
  useEffect(() => {
    if (!user) {
      checkAuth();
      return;
    }
    if (user.rol !== 'ADMIN' && user.rol !== 'OBSERVADOR_SALA') {
      toast.error('Acceso restringido a Sala Situacional (perfil OBSERVADOR_SALA o ADMIN)');
      navigate('/', { replace: true });
    }
  }, [user, checkAuth, navigate]);

  // Carga según pestaña activa
  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      try {
        if (tab === 'panorama') {
          const p = await salaApi.panorama();
          if (!cancelado) setPanorama(p);
        } else if (tab === 'sesiones') {
          const s = await salaApi.sesiones({
            dias: diasSesiones,
            estado: estadoSesion || undefined,
            limite: 500,
          });
          if (!cancelado) setSesiones(s);
        } else if (tab === 'movimientos') {
          const m = await salaApi.movimientos({
            dias: diasMov,
            tipo: (tipoMov || '') as MovimientoUnificado['tipo'] | '',
            punto_control: puntoMov || undefined,
            limite: 500,
          });
          if (!cancelado) setMovimientos(m);
        } else if (tab === 'auditoria') {
          const e = await salaApi.eventos({
            dias: diasEv,
            tipo_evento: tipoEv || undefined,
            limite: 500,
          });
          if (!cancelado) setEventos(e);
        }
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Error al consultar la proyección de Sala Situacional';
        toast.error(detail);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [user, tab, diasSesiones, estadoSesion, diasMov, tipoMov, puntoMov, diasEv, tipoEv]);

  const stats = useMemo(() => {
    if (!panorama) return [];
    return [
      { label: 'Puntos totales', value: panorama.total_puntos, color: 'text-slate-200' },
      { label: 'Turnos abiertos hoy', value: panorama.turnos_abiertos_hoy, color: 'text-emerald-400' },
      { label: 'Puntos inactivos', value: panorama.puntos_inactivos, color: 'text-amber-400' },
      { label: 'Personal hoy', value: panorama.movimientos_hoy.personal, color: 'text-blue-400' },
      { label: 'Materiales hoy', value: panorama.movimientos_hoy.materiales, color: 'text-purple-400' },
      { label: 'Visitantes hoy', value: panorama.movimientos_hoy.visitantes, color: 'text-teal-400' },
    ];
  }, [panorama]);

  const exportarActual = () => {
    if (tab === 'sesiones') descargarCsv('sala_sesiones', sesiones as unknown as Record<string, unknown>[]);
    else if (tab === 'movimientos') descargarCsv('sala_movimientos', movimientos as unknown as Record<string, unknown>[]);
    else if (tab === 'auditoria') descargarCsv('sala_auditoria', eventos as unknown as Record<string, unknown>[]);
    else toast.info('La vista Panorama no requiere exportación');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            🛰️ Sala Situacional{' '}
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/40 rounded-full px-2 py-0.5 align-middle">
              Solo lectura
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Proyección global del módulo Protección y Prevención · {user?.nombre_completo ?? ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportarActual}
            className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
          >
            ⬇ Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            Portal
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-6 pt-4 flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition ${
              tab === t.id
                ? 'border-emerald-400 text-emerald-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        {loading && (
          <span className="ml-auto self-center text-xs text-slate-500 animate-pulse">Consultando…</span>
        )}
      </nav>

      <main className="px-6 pb-10 pt-4">
        {/* ================= PANORAMA ================= */}
        {tab === 'panorama' && panorama && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Turnos activos en este momento ({panorama.sesiones_activas.length})
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2">Punto de control</th>
                    <th className="px-4 py-2">Zona</th>
                    <th className="px-4 py-2">Turno</th>
                    <th className="px-4 py-2">Grupo</th>
                    <th className="px-4 py-2">Apertura</th>
                    <th className="px-4 py-2">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {panorama.sesiones_activas.map((s) => (
                    <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 font-medium">{s.punto_control}</td>
                      <td className="px-4 py-2">{s.zona ?? '—'}</td>
                      <td className="px-4 py-2">{s.turno ?? '—'}</td>
                      <td className="px-4 py-2">{s.grupo_trabajo ?? '—'}</td>
                      <td className="px-4 py-2">
                        {s.hora_inicio ? new Date(s.hora_inicio).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-2">{s.usuario ?? '—'}</td>
                    </tr>
                  ))}
                  {!panorama.sesiones_activas.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No hay turnos abiertos en este momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ================= SESIONES ================= */}
        {tab === 'sesiones' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={diasSesiones}
                onChange={(e) => setDiasSesiones(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                {[1, 3, 7, 15, 30, 90].map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    Últimos {d} día{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <select
                value={estadoSesion}
                onChange={(e) => setEstadoSesion(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="" className="bg-slate-900">Todos los estados</option>
                {['ACTIVA', 'CERRADA', 'CERRADA_FORZADA', 'LIBERADA_ADMIN'].map((est) => (
                  <option key={est} value={est} className="bg-slate-900">{est}</option>
                ))}
              </select>
              <span className="self-center text-xs text-slate-500">{sesiones.length} registros</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Punto</th>
                    <th className="px-4 py-2">Zona</th>
                    <th className="px-4 py-2">Turno</th>
                    <th className="px-4 py-2">Supervisor</th>
                    <th className="px-4 py-2">Inicio</th>
                    <th className="px-4 py-2">Fin</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((s) => (
                    <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2">{s.dia_operativo ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{s.punto_control}</td>
                      <td className="px-4 py-2">{s.zona ?? '—'}</td>
                      <td className="px-4 py-2">{s.turno ?? '—'}</td>
                      <td className="px-4 py-2">{s.supervisor ?? s.usuario ?? '—'}</td>
                      <td className="px-4 py-2">
                        {s.hora_inicio ? new Date(s.hora_inicio).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {s.hora_fin ? new Date(s.hora_fin).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs border ${
                            ESTADO_COLORS[s.estado] ?? ESTADO_COLORS.CERRADA
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!sesiones.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        Sin sesiones en el rango seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ================= MOVIMIENTOS ================= */}
        {tab === 'movimientos' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={diasMov}
                onChange={(e) => setDiasMov(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                {[1, 2, 3, 7, 15, 30].map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    Últimos {d} día{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <select
                value={tipoMov}
                onChange={(e) => setTipoMov(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="" className="bg-slate-900">Todos los tipos</option>
                <option value="PERSONAL" className="bg-slate-900">Personal</option>
                <option value="MATERIALES" className="bg-slate-900">Materiales</option>
                <option value="VISITANTES" className="bg-slate-900">Visitantes</option>
              </select>
              <input
                placeholder="Filtrar punto de control…"
                value={puntoMov}
                onChange={(e) => setPuntoMov(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm w-56"
              />
              <span className="self-center text-xs text-slate-500">{movimientos.length} registros</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Fecha/Hora</th>
                    <th className="px-4 py-2">Cédula</th>
                    <th className="px-4 py-2">Nombre</th>
                    <th className="px-4 py-2">Detalle</th>
                    <th className="px-4 py-2">Mov.</th>
                    <th className="px-4 py-2">Punto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m, i) => (
                    <tr key={`${m.tipo}-${m.fecha}-${i}`} className="border-t border-white/5 hover:bg-white/5">
                      <td className={`px-4 py-2 font-semibold ${TIPO_MOV_COLORS[m.tipo] ?? ''}`}>{m.tipo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {m.fecha} {m.hora ?? ''}
                      </td>
                      <td className="px-4 py-2">{m.cedula ?? '—'}</td>
                      <td className="px-4 py-2">{m.nombre ?? '—'}</td>
                      <td className="px-4 py-2 max-w-xs truncate" title={m.detalle ?? ''}>
                        {m.detalle ?? '—'}
                        {m.placa ? ` · ${m.placa}` : ''}
                      </td>
                      <td className="px-4 py-2">{m.movimiento ?? '—'}</td>
                      <td className="px-4 py-2">{m.punto_control ?? '—'}</td>
                    </tr>
                  ))}
                  {!movimientos.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                        Sin movimientos en el rango seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ================= AUDITORÍA ================= */}
        {tab === 'auditoria' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={diasEv}
                onChange={(e) => setDiasEv(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                {[1, 3, 7, 15, 30, 90].map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    Últimos {d} día{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <select
                value={tipoEv}
                onChange={(e) => setTipoEv(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="" className="bg-slate-900">Todos los eventos</option>
                {[
                  'APERTURA_SESION',
                  'CIERRE_SESION',
                  'LIBERACION_PUNTO',
                  'FORZADO_APERTURA',
                  'IMPORTACION',
                ].map((t) => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
              <span className="self-center text-xs text-slate-500">{eventos.length} eventos</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2">Fecha/Hora</th>
                    <th className="px-4 py-2">Usuario</th>
                    <th className="px-4 py-2">Evento</th>
                    <th className="px-4 py-2">Acción</th>
                    <th className="px-4 py-2">Detalle</th>
                    <th className="px-4 py-2">Sesión</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e) => (
                    <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {e.fecha} {e.hora ?? ''}
                      </td>
                      <td className="px-4 py-2">{e.usuario ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs border ${ESTADO_COLORS.CERRADA_FORZADA}`}
                        >
                          {e.tipo_evento}
                        </span>
                      </td>
                      <td className="px-4 py-2">{e.accion ?? '—'}</td>
                      <td className="px-4 py-2 max-w-md truncate" title={e.detalle ?? ''}>
                        {e.detalle ?? '—'}
                      </td>
                      <td className="px-4 py-2">{e.sesion_id ?? '—'}</td>
                    </tr>
                  ))}
                  {!eventos.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Sin eventos de auditoría en el rango seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Aviso permanente de solo lectura */}
        <p className="mt-6 text-xs text-slate-600 border-t border-white/5 pt-3">
          🔒 Módulo de SOLO LECTURA: la gestión operativa (apertura/cierre de turnos, registro de
          personal, materiales, visitantes e importaciones) se realiza exclusivamente desde el
          Departamento de Protección y Prevención con perfiles OPERADOR o ADMIN.
        </p>
      </main>
    </div>
  );
}
