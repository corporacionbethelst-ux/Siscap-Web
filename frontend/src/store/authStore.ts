import { create } from 'zustand';
import { login as apiLogin, getMe, logout as apiLogout } from '../services/api';
import { Sesion } from '../services/sesion';
import { toast } from 'sonner';

interface User {
  id: number;
  usuario: string;
  nombre_completo: string;
  rol: string;
  estatus: string;
}

interface AuthState {
  user: User | null;
  sesionActiva: Sesion | null;
  isLoading: boolean;
  isChecking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setSesionActiva: (sesion: Sesion) => void;
  cerrarSesion: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sesionActiva: null,
  isLoading: false,
  isChecking: true,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      await apiLogin(username, password);
      const user = await getMe();
      set({ user, isLoading: false, isChecking: false });
      toast.success(`Bienvenido, ${user.nombre_completo}`);
    } catch (error: any) {
      set({ isLoading: false, isChecking: false });
      const msg = error.response?.data?.detail || 'Error al iniciar sesión';
      toast.error(msg);
      throw error;
    }
  },

  logout: () => {
    apiLogout();
    set({ user: null, sesionActiva: null, isChecking: false });
    toast.info('Sesión cerrada correctamente');
  },

  checkAuth: async () => {
    const token = localStorage.getItem('siscap_token');
    if (!token) {
      set({ user: null, isChecking: false });
      return;
    }
    try {
      const user = await getMe();
      set({ user, isChecking: false });
    } catch (error) {
      localStorage.removeItem('siscap_token');
      set({ user: null, isChecking: false });
    }
  },

  setSesionActiva: (sesion) => {
    set({ sesionActiva: sesion });
    toast.success(`Turno abierto: ${sesion.turno_nombre}`);
  },

  cerrarSesion: () => {
    set({ sesionActiva: null });
    toast.info('Turno cerrado');
  },
}));