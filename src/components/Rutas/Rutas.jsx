import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rutas.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

const FILAS_POR_PAGINA = 10;

const formatearFecha = (f) => {
  if (!f) return '';
  const [y, m, d] = String(f).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const estadoClase = (estado) => String(estado || '').toLowerCase().replace(/\s+/g, '-');

function Rutas() {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const fetchRutas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rutas`);
      if (response.ok) {
        const data = await response.json();
        setRutas(Array.isArray(data) ? data : []);
      } else {
        console.error('Error al obtener las rutas');
      }
    } catch (error) {
      console.error('Error al obtener rutas:', error);
    }
  };

  useEffect(() => {
    fetchRutas();
  }, []);

  const rutasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return rutas;
    return rutas.filter((r) =>
      [r.nombreCompleto, r.fecha, r.estado].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [rutas, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(rutasFiltradas.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const rutasPaginadas = rutasFiltradas.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  const verEnMapa = (ruta_id) => navigate(`/map?ruta=${ruta_id}`);

  return (
    <div className="rutas-container">
      <div className="rutas-content">
        <div className="rutas-header">
          <input
            type="text"
            className="rutas-buscador"
            placeholder="Buscar por técnico, fecha o estado..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
        </div>

        <div className="rutas-list">
          <h3>Rutas ({rutasFiltradas.length})</h3>
          <p className="rutas-aviso">
            Las rutas se generan automáticamente a partir de los tickets asignados a cada técnico.
          </p>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Técnico</th>
                <th>Sedes</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rutasPaginadas.length === 0 && (
                <tr>
                  <td colSpan="5" className="rutas-vacio">
                    No se encontraron rutas.
                  </td>
                </tr>
              )}
              {rutasPaginadas.map((ruta) => (
                <tr key={ruta.ruta_id}>
                  <td>{formatearFecha(ruta.fecha)}</td>
                  <td>{ruta.nombreCompleto || `Técnico #${ruta.usuario_id}`}</td>
                  <td>{ruta.total_sedes}</td>
                  <td>
                    <span className={`rutas-estado rutas-estado--${estadoClase(ruta.estado)}`}>
                      {ruta.estado || 'Planificada'}
                    </span>
                  </td>
                  <td className="rutas-acciones">
                    <LoadingButton
                      className="btn-mini btn-mini--ver"
                      onClick={() => verEnMapa(ruta.ruta_id)}
                    >
                      Ver en mapa
                    </LoadingButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rutas-paginacion">
            <button
              className="btn-paginacion"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              Anterior
            </button>
            <span>
              Página {paginaActual} de {totalPaginas} ({rutasFiltradas.length} rutas)
            </span>
            <button
              className="btn-paginacion"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rutas;