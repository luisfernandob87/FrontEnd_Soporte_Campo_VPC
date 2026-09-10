import { Link } from 'react-router-dom';
import { MODULOS } from '../../config/modulos.jsx';
import './Menu.css';

function Menu() {
  return (
    <div className="menu">
      <h2 className="menu-title">Módulos</h2>
      <p className="menu-subtitle">Selecciona un módulo para continuar</p>
      <div className="menu-grid">
        {MODULOS.map((modulo) => (
          <Link key={modulo.id} to={modulo.path} className="menu-card">
            <span className="menu-card-icon">{modulo.icono}</span>
            <span className="menu-card-name">{modulo.nombre}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Menu;