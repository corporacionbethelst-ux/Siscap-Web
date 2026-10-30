import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import Landing from './pages/Landing';
import Login from './pages/Login';

// OPTIMIZACIÓN (M-3): carga diferida de páginas pesadas por ruta.
// Landing/Login/AperturaTurno quedan eager para el primer render;
// el resto del bundle operativo se divide en chunks bajo demanda.
const Proximamente = lazy(() => import('./pages/Proximamente'));
const AperturaTurno = lazy(() => import('./pages/AperturaTurno'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PersonalPage = lazy(() => import('./pages/Personal'));
const PersonalRegistro = lazy(() => import('./pages/PersonalRegistro'));
const Materiales = lazy(() => import('./pages/Materiales'));
const Visitantes = lazy(() => import('./pages/Visitantes'));
const Historial = lazy(() => import('./pages/Historial'));
const Admin = lazy(() => import('./pages/Admin'));
const Importacion = lazy(() => import('./pages/Importacion'));
const ConsultaDatos = lazy(() => import('./pages/ConsultaDatos'));
// Módulo SALA SITUACIONAL — proyección de solo lectura (roles ADMIN / OBSERVADOR_SALA)
const SalaSituacional = lazy(() => import('./pages/sala/SalaSituacional'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

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
    // Se preserva el destino original (incluye /dept/... si venía de la Landing)
    // por DOS vías: location.state y query param ?next= (más robusto ante
    // normalizaciones/remociones de state en React Router v6).
    const next = encodeURIComponent(window.location.pathname);
    return <Navigate to={`/login?next=${next}`} replace state={{ from: window.location.pathname }} />;
  }

  // Guard por DEPARTAMENTO: Sala Situacional es exclusiva de ADMIN/OBSERVADOR_SALA.
  // Sin esto, un OPERADOR autenticado que ingresa desde la Landing rebota entre
  // la página (que lo expulsa a '/') y el portal, dando la sensación de que
  // "el botón no entra" al módulo.
  const path = window.location.pathname;
  if (path.startsWith('/dept/sala-situacional') && user.rol !== 'ADMIN' && user.rol !== 'OBSERVADOR_SALA') {
    return (
      <Navigate to="/dept/proteccion-prevencion" replace state={{ denied: 'Sala Situacional requiere perfil OBSERVADOR_SALA o ADMIN.' }} />
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Portal público: selección de departamento (Unidad de Seguridad Integral) */}
        <Route path="/" element={<Landing />} />
        <Route path="/dept/:deptoId" element={<Proximamente />} />

        {/* ============================================================
            Módulo: SALA SITUACIONAL — Proyección global de SOLO LECTURA.
            Ruta canónica específica que tiene prioridad sobre el catch-all
            /dept/:deptoId (que muestra "En desarrollo"). El guard de rol
            (ADMIN / OBSERVADOR_SALA) se aplica dentro de la página y es
            respaldado por 403 en backend (/api/sala-situacional/*).
            ============================================================ */}
        <Route
          path="/dept/sala-situacional"
          element={
            <ProtectedRoute>
              <SalaSituacional />
            </ProtectedRoute>
          }
        />

        {/* ============================================================
            Módulo: Departamento de Protección y Prevención (DPP)
            Rutas canónicas bajo /dept/proteccion-prevencion/*.
            Las rutas cortas (/login, /dashboard...) se conservan como
            alias de compatibilidad mediante el redirect en solitario.
            ============================================================ */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/dept/proteccion-prevencion/login"
          element={<Navigate to="/login" replace />}
        />

        {/* Alias de compatibilidad → ruta canónica del módulo DPP */}
        <Route path="/apertura-turno" element={<Navigate to="/dept/proteccion-prevencion" replace />} />
        <Route path="/dashboard" element={<Navigate to="/dept/proteccion-prevencion/dashboard" replace />} />
        <Route path="/personal" element={<Navigate to="/dept/proteccion-prevencion/personal" replace />} />
        <Route path="/materiales" element={<Navigate to="/dept/proteccion-prevencion/materiales" replace />} />
        <Route path="/visitantes" element={<Navigate to="/dept/proteccion-prevencion/visitantes" replace />} />
        <Route path="/historial" element={<Navigate to="/dept/proteccion-prevencion/historial" replace />} />
        <Route path="/admin" element={<Navigate to="/dept/proteccion-prevencion/admin" replace />} />
        <Route path="/importacion" element={<Navigate to="/dept/proteccion-prevencion/importacion" replace />} />
        <Route path="/consulta" element={<Navigate to="/dept/proteccion-prevencion/consulta" replace />} />

        {/* Rutas canónicas del módulo DPP */}
        <Route
          path="/dept/proteccion-prevencion"
          element={
            <ProtectedRoute>
              <AperturaTurno />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/personal/registro"
          element={
            <ProtectedRoute>
              <PersonalRegistro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/personal"
          element={
            <ProtectedRoute>
              <PersonalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/materiales"
          element={
            <ProtectedRoute>
              <Materiales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/visitantes"
          element={
            <ProtectedRoute>
              <Visitantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/historial"
          element={
            <ProtectedRoute>
              <Historial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/importacion"
          element={
            <ProtectedRoute>
              <Importacion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/proteccion-prevencion/consulta"
          element={
            <ProtectedRoute>
              <ConsultaDatos />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;