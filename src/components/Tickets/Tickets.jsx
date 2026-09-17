import { useState, useEffect } from 'react';
import './Tickets.css';
import { API_BASE_URL } from '../../config';

function Tickets() {
  const [tecnicos, setTecnicos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tickets/tecnicos`);
        const data = response.ok ? await response.json() : [];
        setTecnicos(Array.isArray(data) ? data : []);
      } catch {
        setError('No se pudieron cargar los técnicos.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const seleccionarTecnico = async (tecnico) => {
    setSeleccionado(tecnico);
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/usuario/${tecnico.usuario_id}`);
      if (!response.ok) {
        setDetalle({ tecnico, tickets: [], workOrders: [], error: 'No se pudieron obtener los tickets.' });
        return;
      }
      const data = await response.json();
      setDetalle(data);
    } catch {
      setDetalle({ tecnico, tickets: [], workOrders: [], error: 'No se pudieron obtener los tickets.' });
    } finally {
      setCargandoDetalle(false);
    }
  };

  const volver = () => {
    setSeleccionado(null);
    setDetalle(null);
  };

  const renderFila = (item, tipo) => (
    <tr key={`${item.type}-${item.id}`}>
      <td>{item.dwpSrid}</td>
      <td>{tipo === 'ticket' ? item.incidentNumber : item.workOrderId}</td>
      <td>{item.urgency}</td>
      <td>{item.priority}</td>
      <td><span className={`tickets-estado tickets-estado--${String(item.status).toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span></td>
    </tr>
  );

  return (
    <div className="tickets-container">
      <div className="tickets-content">
        {!seleccionado && (
          <>
            <div className="tickets-header">
              <h3>Técnicos ({tecnicos.length})</h3>
            </div>
            {cargando && <p className="tickets-msg">Cargando técnicos...</p>}
            {error && <p className="tickets-error">{error}</p>}
            {!cargando && !error && (
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.length === 0 && (
                    <tr>
                      <td colSpan="3" className="tickets-vacio">
                        No hay técnicos registrados.
                      </td>
                    </tr>
                  )}
                  {tecnicos.map((t) => (
                    <tr key={t.usuario_id}>
                      <td>
                        <button
                          type="button"
                          className="tickets-nombre"
                          onClick={() => seleccionarTecnico(t)}
                          title="Ver tickets asignados"
                        >
                          {t.nombreCompleto || `Usuario ${t.usuario_id}`}
                        </button>
                      </td>
                      <td>{t.usuario}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-tickets"
                          onClick={() => seleccionarTecnico(t)}
                        >
                          Ver tickets
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {seleccionado && (
          <>
            <div className="tickets-header">
              <button type="button" className="btn-tickets btn-tickets--volver" onClick={volver}>
                ← Volver
              </button>
              <h3>Tickets de {seleccionado.nombreCompleto}</h3>
            </div>

            {cargandoDetalle && <p className="tickets-msg">Cargando tickets...</p>}

            {!cargandoDetalle && detalle && (
              <>
                {detalle.error && <p className="tickets-error">{detalle.error}</p>}

                <section className="tickets-seccion">
                  <h4>Incidentes ({detalle.tickets.length})</h4>
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>ID de petición</th>
                        <th>N° incidente</th>
                        <th>Urgencia</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.tickets.length === 0 && (
                        <tr>
                          <td colSpan="5" className="tickets-vacio">
                            Sin incidentes asignados.
                          </td>
                        </tr>
                      )}
                      {detalle.tickets.map((item) => renderFila(item, 'ticket'))}
                    </tbody>
                  </table>
                </section>

                <section className="tickets-seccion">
                  <h4>Órdenes de Trabajo ({detalle.workOrders.length})</h4>
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>ID de petición</th>
                        <th>N° orden</th>
                        <th>Urgencia</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.workOrders.length === 0 && (
                        <tr>
                          <td colSpan="5" className="tickets-vacio">
                            Sin órdenes de trabajo asignadas.
                          </td>
                        </tr>
                      )}
                      {detalle.workOrders.map((item) => renderFila(item, 'workOrder'))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Tickets;