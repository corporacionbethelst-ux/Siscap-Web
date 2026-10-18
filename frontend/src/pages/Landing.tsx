import { useNavigate } from 'react-router-dom';
import { Shield, MonitorPlay, ArrowRight, Lock, CheckCircle2, Building2 } from 'lucide-react';
import { DEPARTAMENTOS, UNIDAD, Departamento } from '../config/departamentos';

function DeptIcon({ tipo }: { tipo: Departamento['icono'] }) {
  return tipo === 'shield' ? (
    <Shield className="w-8 h-8 text-white" />
  ) : (
    <MonitorPlay className="w-8 h-8 text-white" />
  );
}

export default function Landing() {
  const navigate = useNavigate();

  const handleSelect = (depto: Departamento) => {
    if (depto.status === 'activo') {
      navigate(depto.ruta);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[28rem] h-[28rem] bg-indigo-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl" />
      </div>

      {/* Header institucional */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{UNIDAD.nombre}</h1>
              <p className="text-xs text-slate-400">
                {UNIDAD.sistema} {UNIDAD.version} · {UNIDAD.lema}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-4 h-4" />
            <span>Dirección Principal · {DEPARTAMENTOS.length} departamentos</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 py-14 w-full">
        <section className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 mb-6">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            Plataforma interna de seguridad — acceso restringido
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Portal de Seguridad Integral
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Seleccione el departamento al que desea ingresar. Cada módulo opera de forma
            independiente con sus propios procesos, permisos y datos.
          </p>
        </section>

        {/* Tarjetas de departamentos */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {DEPARTAMENTOS.map((depto) => {
            const activo = depto.status === 'activo';
            return (
              <article
                key={depto.id}
                onClick={() => handleSelect(depto)}
                aria-disabled={!activo}
                className={`group relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                  activo
                    ? 'bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-blue-950/50 hover:-translate-y-1 cursor-pointer'
                    : 'bg-white/[0.02] border-white/5 opacity-70 cursor-not-allowed'
                }`}
              >
                {/* Badge de estado */}
                <div className="absolute top-6 right-6">
                  {activo ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Operativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" /> En desarrollo
                    </span>
                  )}
                </div>

                {/* Ícono */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${depto.color} flex items-center justify-center shadow-lg mb-6 ${
                    activo ? 'group-hover:scale-105 transition-transform' : 'grayscale'
                  }`}
                >
                  <DeptIcon tipo={depto.icono} />
                </div>

                <h3 className="text-xl font-bold text-white pr-28">{depto.nombre}</h3>
                <p className={`text-xs font-semibold uppercase tracking-widest mt-1 mb-4 ${depto.acentoColor}`}>
                  {depto.sigla}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">{depto.descripcion}</p>

                {/* Lista de funciones */}
                <ul className="space-y-2 mb-8 flex-1">
                  {depto.funciones.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Acción */}
                {activo ? (
                  <button className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-950/50 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all">
                    Ingresar al módulo
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/15 text-slate-500 font-semibold text-sm">
                    <MonitorPlay className="w-4 h-4" />
                    Próximamente
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} {UNIDAD.nombre}. Todos los derechos reservados.</span>
          <span>{UNIDAD.sistema} {UNIDAD.version} · Uso exclusivo interno</span>
        </div>
      </footer>
    </div>
  );
}
