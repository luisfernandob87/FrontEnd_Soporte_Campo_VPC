import { useRef, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Login } from './components/Login/Login';
import Menu from './components/Menu/Menu';
import Sede from './components/Store/Store';
import Map from './components/Map/Map';
import Reportes from './components/Reportes/Reportes';
import Usuarios from './components/Usuarios/Usuarios';
import Rutas from './components/Rutas/Rutas';
import Tickets from './components/Tickets/Tickets';
import './App.css';

function App() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prevAuthenticated = useRef(isAuthenticated);

  // Al iniciar sesión, navegar siempre al menú principal sin importar dónde se cerró la sesión
  useEffect(() => {
    if (isAuthenticated && !prevAuthenticated.current) {
      navigate('/', { replace: true });
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, navigate]);

  const getFormName = (path) => {
    switch (path) {
      case '/sede':
        return 'Agregar Sede';
      case '/map':
        return 'Ver Mapa';
      case '/reportes':
        return 'Reportes';
      case '/usuarios':
        return 'Usuarios';
      case '/rutas':
        return 'Rutas';
      case '/tickets':
        return 'Tickets';
      default:
        return 'Menú Principal';
    }
  };

  const esMapa = location.pathname === '/map';

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className={`app-container${esMapa ? ' map-page' : ''}`}>
      <header className="app-header">
        <h1>{getFormName(location.pathname)}</h1>
        <button onClick={logout} className="logout-button">
          Cerrar Sesión
        </button>
      </header>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/sede" element={<Sede />} />
          <Route path="/map" element={<Map />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/rutas" element={<Rutas />} />
          <Route path="/tickets" element={<Tickets />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
