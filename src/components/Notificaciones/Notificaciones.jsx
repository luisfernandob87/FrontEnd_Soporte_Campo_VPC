import { useState, useEffect, useMemo } from 'react';
import './Notificaciones.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

const formatearFecha = (f) => {
  if (!f) return '';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

function Notificaciones() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageEsError, setMessageEsError] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const FILAS_POR_PAGINA = 10;

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios_admin`);
      if (response.ok) {
        const data = await response.json();
        const activos = (Array.isArray(data) ? data : []).filter(
          (u) =>
            String(u.status || 'Activo') === 'Activo' &&
            String(u.rol || '').trim() === 'Técnico'
        );
        setUsuarios(activos);
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const fetchHistorial = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notificaciones`);
      if (response.ok) {
        const data = await response.json();
        setHistorial(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al obtener el historial:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchHistorial();
  }, []);

  const historialFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return historial;
    return historial.filter((n) =>
      [n.usuario?.nombreCompleto, n.usuario?.usuario, n.mensaje, n.estado].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [historial, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(historialFiltrado.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const historialPaginado = historialFiltrado.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!usuarioId) {
      setMessage('Seleccione un usuario');
      setMessageEsError(true);
      return;
    }
    if (!mensaje.trim()) {
      setMessage('Escriba un mensaje');
      setMessageEsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notificacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: Number(usuarioId), mensaje: mensaje.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const entregada = data.entregada;
        setMessage(
          entregada
            ? 'Notificación enviada y entregada al dispositivo'
            : 'Notificación guardada. Se mostrará cuando el técnico vuelva a conectarse'
        );
        setMessageEsError(false);
        setMensaje('');
        setUsuarioId('');
        fetchHistorial();
      } else {
        setMessage(data.message || 'Error al enviar la notificación');
        setMessageEsError(true);
      }
    } catch (error) {
      setMessage('Error de conexión');
      setMessageEsError(true);
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="notif-container">
      <div className="notif-content">
        <div className="notif-form-card">
          <h3>Enviar notificación</h3>
          <p className="notif-ayuda">
            El mensaje se mostrará en la app del técnico con un aviso visual y sonido.
          </p>
          {message && (
            <p className={messageEsError ? 'notif-message notif-message--error' : 'notif-message'}>
              {message}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="usuarioId">Usuario:</label>
              <select
                id="usuarioId"
                name="usuarioId"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                required
              >
                <option value="">- Seleccione un usuario -</option>
                {usuarios.map((u) => (
                  <option key={u.usuario_id} value={u.usuario_id}>
                    {u.nombreCompleto} ({u.usuario})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mensaje">Mensaje:</label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows="4"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escriba el texto de la notificación..."
                required
              />
            </div>

            <div className="notif-acciones">
              <LoadingButton type="submit" isLoading={isSubmitting} className="btn-header">
                Enviar notificación
              </LoadingButton>
            </div>
          </form>
        </div>

        <div className="notif-historial">
          <div className="notif-historial-header">
            <h3>Historial ({historialFiltrado.length})</h3>
            <input
              type="text"
              className="notif-buscador"
              placeholder="Buscar por usuario, mensaje o estado..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Mensaje</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {historialPaginado.length === 0 && (
                <tr>
                  <td colSpan="4" className="notif-vacio">
                    No hay notificaciones registradas.
                  </td>
                </tr>
              )}
              {historialPaginado.map((n) => (
                <tr key={n.notificacion_id}>
                  <td>{formatearFecha(n.fecha)}</td>
                  <td>{n.usuario?.nombreCompleto || `Usuario #${n.usuario_id}`}</td>
                  <td className="notif-mensaje-celda">{n.mensaje}</td>
                  <td>
                    <span className={`notif-estado notif-estado--${String(n.estado || '').toLowerCase()}`}>
                      {n.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="notif-paginacion">
            <button
              className="btn-paginacion"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              Anterior
            </button>
            <span>
              Página {paginaActual} de {totalPaginas} ({historialFiltrado.length} notificaciones)
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

export default Notificaciones;