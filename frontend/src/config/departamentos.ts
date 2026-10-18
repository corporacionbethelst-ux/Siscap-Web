/**
 * Configuración de Departamentos — Unidad de Seguridad Integral
 * ------------------------------------------------------------------
 * Arquitectura modular: cada departamento es un módulo independiente del
 * frontend con sus propias rutas y páginas. Para registrar un nuevo
 * departamento (ej: Sala Situacional) basta con agregar una entrada aquí.
 */

export type DeptoStatus = 'activo' | 'proximamente';

export interface Departamento {
  id: string;
  nombre: string;
  sigla: string;
  descripcion: string;
  funciones: string[];
  icono: 'shield' | 'monitor';
  color: string; // gradiente tailwind del ícono
  acentoColor: string; // texto/borde de acento
  status: DeptoStatus;
  ruta: string;
}

export const UNIDAD = {
  nombre: 'Unidad de Seguridad Integral',
  sistema: 'SISCAP Web',
  version: 'v6.0',
  lema: 'Control, prevención y respuesta coordinada',
};

export const DEPARTAMENTOS: Departamento[] = [
  {
    id: 'proteccion-prevencion',
    nombre: 'Departamento de Protección y Prevención',
    sigla: 'DPP',
    descripcion:
      'Gestión del control de acceso de personal, materiales y visitantes en múltiples zonas geográficas y puntos de control, con aislamiento de datos por punto, auditoría completa e importación masiva inteligente.',
    funciones: [
      'Apertura y cierre de turnos por punto de control',
      'Control de acceso: Personal, Materiales y Visitantes',
      'Consulta de datos maestros en tiempo real',
      'Historial, reportes y exportación a CSV',
      'Importación masiva robusta (UPSERT) con 9 tipos de datos',
      'Panel de administración, zonas, usuarios y auditoría',
    ],
    icono: 'shield',
    color: 'from-blue-600 to-indigo-700',
    acentoColor: 'text-blue-400',
    status: 'activo',
    ruta: '/dept/proteccion-prevencion',
  },
  {
    id: 'sala-situacional',
    nombre: 'Departamento de Sala Situacional',
    sigla: 'SS',
    descripcion:
      'Monitoreo operativo en tiempo real, consolidación de incidencias y apoyo a la toma de decisiones. Módulo en desarrollo dentro de la hoja de ruta de SISCAP Web.',
    funciones: [
      'Panel de monitoreo en tiempo real (planificado)',
      'Consolidación de incidencias por zona (planificado)',
      'Reportes situacionales (planificado)',
    ],
    icono: 'monitor',
    color: 'from-emerald-600 to-teal-700',
    acentoColor: 'text-emerald-400',
    status: 'proximamente',
    ruta: '/dept/sala-situacional',
  },
];

export function getDepartamento(id: string): Departamento | undefined {
  return DEPARTAMENTOS.find((d) => d.id === id);
}
