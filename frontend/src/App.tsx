import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Landing from './pages/Landing';
import Proximamente from './pages/Proximamente';
import Login from './pages/Login';
import AperturaTurno from './pages/AperturaTurno';
import Dashboard from './pages/Dashboard';
import PersonalPage from './pages/Personal';
import PersonalRegistro from './pages/PersonalRegistro';
import Materiales from './pages/Materiales';
import Visitantes from './pages/Visitantes';
import Historial from './pages/Historial';
import Admin from './pages/Admin';
import Importacion from './pages/Importacion';
import ConsultaDatos from './pages/ConsultaDatos';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isChecking, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal público: selección de departamento (Unidad de Seguridad Integral) */}
        <Route path="/" element={<Landing />} />
        <Route path="/dept/:deptoId" element={<Proximamente />} />

        {/* Módulo: Departamento de Protección y Prevención */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/dept/proteccion-prevencion"
          element={
            <ProtectedRoute>
              <AperturaTurno />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apertura-turno"
          element={
            <ProtectedRoute>
              <AperturaTurno />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personal"
          element={
            <ProtectedRoute>
              <PersonalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personal/registro"
          element={
            <ProtectedRoute>
              <PersonalRegistro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materiales"
          element={
            <ProtectedRoute>
              <Materiales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visitantes"
          element={
            <ProtectedRoute>
              <Visitantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historial"
          element={
            <ProtectedRoute>
              <Historial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/importacion"
          element={
            <ProtectedRoute>
              <Importacion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consulta"
          element={
            <ProtectedRoute>
              <ConsultaDatos />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;