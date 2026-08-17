import { api } from './api';

export interface PersonalData {
  id: number;
  cedula: string;
  nombres: string;
  empresa: string | null;
  gerencia: string | null;
  tipo: string | null;
  estatus: string;
  fecha_registro: string | null;
}

export interface VehiculoData {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  anio: string | null;
  condicion: string | null;
  serial: string | null;
  observacion: string | null;
}

export interface VisitanteData {
  id: number;
  cedula: string;
  nombres: string;
  empresa: string | null;
  telefono: string | null;
  tipo_visitante: string | null;
  estatus: string;
  fecha_registro: string | null;
}

export const consultaApi = {
  listarPersonal: async () => {
    const response = await api.get<PersonalData[]>('/api/consulta/personal');
    return response.data;
  },

  listarVehiculos: async () => {
    const response = await api.get<VehiculoData[]>('/api/consulta/vehiculos');
    return response.data;
  },

  listarVisitantes: async () => {
    const response = await api.get<VisitanteData[]>('/api/consulta/visitantes');
    return response.data;
  }
};