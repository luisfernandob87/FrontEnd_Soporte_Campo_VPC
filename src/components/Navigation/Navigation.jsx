import { Link } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-buttons">
        <Link to="/sede" className="nav-button">
          Agregar Sede
        </Link>
        <Link to="/map" className="nav-button">
          Ver Mapa
        </Link>
      </div>
    </nav>
  );
}

export default Navigation;