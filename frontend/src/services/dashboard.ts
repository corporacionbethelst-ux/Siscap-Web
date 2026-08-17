import { api } from './api';

export interface EstadisticasDashboard {
  total_personal: number;
  total_vehiculos: number;
  total_visitantes: number;
  entradas_personal: number;
  salidas_personal: number;
  entradas_materiales: number;
  salidas_materiales: number;
  entradas_visitantes: number;
  salidas_visitantes: number;
  personal_dentro: number;
}

export const dashboardApi = {
  estadisticas: async (sesionId: number) => {
    const response = await api.get<EstadisticasDashboard>(`/api/dashboard/estadisticas/${sesionId}`);
    return response.data;
  }
};