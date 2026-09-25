import { useState, useEffect, useMemo } from 'react';
import './Georreferenciacion.css';
import { API_BASE_URL } from '../../config';

const ETIQUETA_TIPO = { ticket: 'Ticket', workOrder: 'Orden', workorder: 'Orden' };
const ETIQUETA_FUENTE = {
  automatica: 'Automática',
  manual: 'Manual',
  'sin georreferenciar': 'Sin georreferenciar',
};

function Georreferenciacion() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tickets, setTickets] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('todos');
  const [asignando, setAsignando] = useState(null);
  const [sedeSeleccionada, setSedeSeleccionada] = useState({});

  const clave = (t) => `${t.tipo}|${t.requestId}`;

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const [data, sedesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/georeferencia/tickets`).then((r) => {
          if (!r.ok) throw new Error('Error al cargar los tickets');
          return r.json();
        }),
        fetch(`${API_BASE_URL}/sedes`).then((r) => {
          if (!r.ok) throw new Error('Error al cargar las sedes');
          return r.json();
        }),
      ]);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setGrupos(Array.isArray(data.grupos) ? data.grupos : []);
      setSedes(
        (Array.isArray(sedesRes) ? sedesRes : []).filter(
          (s) =>
            String(s.status).toLowerCase() === 'activo' &&
            String(s.tipo).toLowerCase() !== 'Super 24'
        )
      );
    } catch (e) {
      setError(e.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tickets.filter((t) => {
      if (grupoFiltro !== 'todos' && t.grupo !== grupoFiltro) return false;
      if (!q) return true;
      return [t.requestId, t.dwpSrid, t.cliente, t.tecnico].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [tickets, busqueda, grupoFiltro]);

  const sinGeoref = useMemo(
    () => filtrados.filter((t) => t.fuente === 'sin georreferenciar'),
    [filtrados]
  );
  const conGeoref = useMemo(
    () =>
      filtrados.filter(
        (t) =>
          t.fuente !== 'sin georreferenciar' &&
          !(t.sede && String(t.sede.tipo).toLowerCase() === 'super 24')
      ),
    [filtrados]
  );

  const asignar = async (t) => {
    const k = clave(t);
    const sedeId = sedeSeleccionada[k];
    if (!sedeId) {
      setError('Selecciona una sede antes de asignar');
      return;
    }
    setAsignando(k);
    setError('');
    setMensaje('');
    try {
      const res = await fetch(`${API_BASE_URL}/georeferencia/ticket`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: t.tipo,
          request_id: t.requestId,
          sede_id: Number(sedeId),
          usuario: t.tecnico || '',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || 'Error al georreferenciar el ticket');
        setAsignando(null);
        return;
      }
      setMensaje('Ticket georreferenciado correctamente');
      setSedeSeleccionada((prev) => ({ ...prev, [k]: '' }));
      await cargar();
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setAsignando(null);
    }
  };

  const quitar = async (t) => {
    const k = clave(t);
    setAsignando(k);
    setError('');
    setMensaje('');
    try {
      const res = await fetch(
        `${API_BASE_URL}/georeferencia/ticket?tipo=${encodeURIComponent(t.tipo)}&request_id=${encodeURIComponent(t.requestId)}&usuario=${encodeURIComponent(t.tecnico || '')}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || 'Error al quitar la georreferenciación');
        setAsignando(null);
        return;
      }
      setMensaje('Georreferenciación manual eliminada');
      await cargar();
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setAsignando(null);
    }
  };

  const renderSelectSede = (t) => {
    const k = clave(t);
    const value = sedeSeleccionada[k] ?? '';
    return (
      <div className="geo-acciones">
        <select
          className="geo-select"
          value={value}
          onChange={(e) => {
            setSedeSeleccionada((prev) => ({ ...prev, [k]: e.target.value }));
            setError('');
          }}
        >
          <option value="">Sede / agencia...</option>
          {sedes.map((s) => (
            <option key={s.sede_id} value={s.sede_id}>
              {s.nombre} ({s.tipo})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-mini btn-mini--asignar"
          onClick={() => asignar(t)}
          disabled={asignando === k || !sedeSeleccionada[k]}
        >
          {asignando === k ? 'Guardando...' : 'Asignar'}
        </button>
        {t.fuente === 'manual' && (
          <button
            type="button"
            className="btn-mini btn-mini--quitar"
            onClick={() => quitar(t)}
            disabled={asignando === k}
          >
            Quitar
          </button>
        )}
      </div>
    );
  };

  const renderFila = (t) => {
    const esManual = t.fuente === 'manual';
    return (
      <tr key={clave(t)}>
        <td>
          <span className={`geo-tipo geo-tipo--${t.tipo}`}>
            {ETIQUETA_TIPO[t.tipo] || t.tipo}
          </span>
        </td>
        <td>
          <div className="geo-request">{t.requestId}</div>
          <div className="geo-sub">{t.dwpSrid}</div>
        </td>
        <td>{t.cliente || 'Sin cliente'}</td>
        <td>{t.tecnico ? t.tecnico : <span className="geo-sin-tecnico">Sin técnico</span>}</td>
        <td>
          {t.sede ? (
            <>
              <span className={`geo-sede ${esManual ? 'geo-sede--manual' : 'geo-sede--auto'}`}>
                {t.sede.nombre}
              </span>
              <span
                className={`geo-fuente ${esManual ? 'geo-fuente--manual' : 'geo-fuente--auto'}`}
              >
                {ETIQUETA_FUENTE[t.fuente] || t.fuente}
              </span>
            </>
          ) : (
            <span className="geo-sin-tecnico">Sin sede asignada</span>
          )}
        </td>
        <td>{renderSelectSede(t)}</td>
      </tr>
    );
  };

  const renderTabla = (lista, vacio) => (
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Petición</th>
          <th>Cliente</th>
          <th>Técnico</th>
          <th>Sede</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {lista.length === 0 && (
          <tr>
            <td colSpan="6" className="geo-vacio">
              {vacio}
            </td>
          </tr>
        )}
        {lista.map(renderFila)}
      </tbody>
    </table>
  );

  return (
    <div className="geo-container">
      <div className="geo-content">
        {mensaje && <p className="geo-mensaje geo-mensaje--ok">{mensaje}</p>}
        {error && <p className="geo-mensaje geo-mensaje--error">{error}</p>}
        {cargando && <p className="geo-vacio">Cargando tickets de todos los grupos Ruta...</p>}

        {!cargando && (
          <>
            <div className="geo-header">
              <input
                type="text"
                className="geo-buscador"
                placeholder="Buscar por petición, cliente o técnico..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select
                className="geo-grupo-select"
                value={grupoFiltro}
                onChange={(e) => setGrupoFiltro(e.target.value)}
              >
                <option value="todos">Todos los grupos Ruta</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.nombre}>
                    {g.nombre}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-agregar" onClick={cargar} disabled={cargando}>
                Actualizar
              </button>
            </div>

            <p className="geo-total">
              {tickets.length} tickets/órdenes abiertos · {sinGeoref.length} sin georreferenciar
            </p>

            <div className="geo-seccion geo-seccion--pendiente">
              <h3>
                ⚠️ Sin georreferenciar ({sinGeoref.length})
              </h3>
              <p className="geo-seccion-desc">
                Tickets que no tienen sede asignada aún. Asígnales una sede o agencia para que
                aparezcan en el mapa y en la ruta del día del técnico.
              </p>
              {renderTabla(sinGeoref, 'No hay tickets sin georreferenciar.')}
            </div>

            <div className="geo-seccion">
              <h3>Georreferenciados ({conGeoref.length})</h3>
              {renderTabla(conGeoref, 'No hay tickets georreferenciados.')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Georreferenciacion;