import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction, MonitorPlay } from 'lucide-react';
import { getDepartamento, UNIDAD } from '../config/departamentos';

export default function Proximamente() {
  const { deptoId } = useParams<{ deptoId: string }>();
  const depto = deptoId ? getDepartamento(deptoId) : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 w-96 h-96 bg-emerald-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-96 h-96 bg-teal-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl shadow-black/40">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center mb-6 shadow-lg">
          <MonitorPlay className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {depto ? depto.nombre : 'Departamento no encontrado'}
        </h1>
        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
          <Construction className="w-3.5 h-3.5" /> Módulo en desarrollo
        </p>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          Este departamento de la <strong className="text-slate-200">{UNIDAD.nombre}</strong>{' '}
          formará parte de SISCAP Web próximamente con sus propios procesos operativos.
          Mientras tanto, puede continuar trabajando en el módulo de Protección y Prevención.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-950/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal
        </Link>
      </div>
    </div>
  );
}
