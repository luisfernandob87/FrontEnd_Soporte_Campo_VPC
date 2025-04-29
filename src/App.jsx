import { useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './components/Login/Login';
import Navigation from './components/Navigation/Navigation';
import Sede from './components/Store/Store';
import Map from './components/Map/Map';
import './App.css';

function App() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const getFormName = (path) => {
    switch (path) {
      case '/sede':
        return 'Agregar Sede';
      case '/map':
        return 'Ver Mapa';
      default:
        return 'Panel de Administración';
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{getFormName(location.pathname)}</h1>
        <button onClick={logout} className="logout-button">
          Cerrar Sesión
        </button>
      </header>
      <main className="app-content">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/sede" replace />} />
          <Route path="/sede" element={<Sede />} />
          <Route path="/map" element={<Map />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
