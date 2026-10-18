import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { personalApi } from '../services/personal';
import { toast } from 'sonner';
import { User, Building, Briefcase, ArrowLeft } from 'lucide-react';

export default function PersonalRegistro() {
  const navigate = useNavigate();
  const location = useLocation();
  const cedulaInicial = (location.state as any)?.cedula || '';

  const [formData, setFormData] = useState({
    cedula: cedulaInicial,
    nombres: '',
    empresa: '',
    gerencia: '',
    tipo: 'INTERNO',
    estatus: 'ACTIVO'
  });

  const mutation = useMutation({
    mutationFn: personalApi.crear,
    onSuccess: (data) => {
      toast.success(`✅ ${data.nombres} registrado correctamente`);
      navigate('/dept/proteccion-prevencion/personal');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al registrar');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cedula || !formData.nombres) {
      toast.error('Cédula y Nombres son obligatorios');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/dept/proteccion-prevencion/personal')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Control de Personal
      </button>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5" /> Registrar Nuevo Personal
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula *</label>
              <input
                type="text"
                required
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="INTERNO">INTERNO</option>
                <option value="CONTRATISTA">CONTRATISTA</option>
                <option value="VISITANTE">VISITANTE</option>
                <option value="MILITAR">MILITAR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombres y Apellidos *</label>
            <input
              type="text"
              required
              value={formData.nombres}
              onChange={(e) => setFormData({ ...formData, nombres: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-4 h-4" /> Empresa
              </label>
              <input
                type="text"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> Gerencia
              </label>
              <input
                type="text"
                value={formData.gerencia}
                onChange={(e) => setFormData({ ...formData, gerencia: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dept/proteccion-prevencion/personal')}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {mutation.isPending ? 'Guardando...' : '💾 Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}