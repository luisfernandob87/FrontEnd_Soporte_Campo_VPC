import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rutas.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

const ESTADOS = ['Planificada', 'En curso', 'Completada', 'Cancelada'];

const FORM_VACIO = {
  usuario_id: '',
  fecha: '',
  estado: 'Planificada',
  sedesIds: [],
};

const hoyISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatearFecha = (f) => {
  if (!f) return '';
  const [y, m, d] = String(f).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const estadoClase = (estado) => String(estado || '').toLowerCase().replace(/\s+/g, '-');

function Rutas() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(FORM_VACIO);
  const [rutas, setRutas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaSede, setBusquedaSede] = useState('');
  const [pagina, setPagina] = useState(1);

  const FILAS_POR_PAGINA = 10;

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

  const fetchDatos = async () => {
    try {
      const [sedesResponse, usuariosResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/sedes`),
        fetch(`${API_BASE_URL}/usuarios_admin`),
      ]);
      if (sedesResponse.ok) {
        const data = await sedesResponse.json();
        setSedes(Array.isArray(data) ? data : []);
      }
      if (usuariosResponse.ok) {
        const data = await usuariosResponse.json();
        setUsuarios(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al obtener catálogos:', error);
    }
  };

  useEffect(() => {
    fetchRutas();
    fetchDatos();
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

  const tecnicosActivos = useMemo(
    () =>
      usuarios
        .filter((u) => String(u.status || 'Activo') === 'Activo')
        .sort((a, b) => {
          const aTec = String(a.rol || '') === 'Técnico' ? 0 : 1;
          const bTec = String(b.rol || '') === 'Técnico' ? 0 : 1;
          if (aTec !== bTec) return aTec - bTec;
          return String(a.nombreCompleto).localeCompare(String(b.nombreCompleto));
        }),
    [usuarios]
  );

  const sedesDisponibles = useMemo(
    () => sedes.filter((s) => String(s.status || 'Activo') === 'Activo'),
    [sedes]
  );

  const sedesFiltradasBuscador = useMemo(() => {
    const q = busquedaSede.trim().toLowerCase();
    if (!q) return sedesDisponibles;
    return sedesDisponibles.filter((s) =>
      [s.tipo, s.nombre, s.direccion].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [sedesDisponibles, busquedaSede]);

  const sedesSeleccionadas = useMemo(
    () =>
      formData.sedesIds.map((id) => {
        const s = sedes.find((x) => String(x.sede_id) === String(id));
        return { sede_id: id, ...(s || {}) };
      }),
    [formData.sedesIds, sedes]
  );

  const abrirModalNueva = () => {
    setFormData({ ...FORM_VACIO, fecha: hoyISO() });
    setIsEditing(false);
    setEditingId(null);
    setMessage('');
    setBusquedaSede('');
    setModalAbierto(true);
  };

  const abrirModalEditar = async (ruta) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ruta/${ruta.ruta_id}`);
      if (!response.ok) {
        console.error('Error al cargar la ruta');
        return;
      }
      const detalle = await response.json();
      setFormData({
        usuario_id: String(detalle.usuario_id),
        fecha: String(detalle.fecha).slice(0, 10),
        estado: detalle.estado || 'Planificada',
        sedesIds: (detalle.sedes || []).map((s) => s.sede_id),
      });
      setIsEditing(true);
      setEditingId(ruta.ruta_id);
      setMessage('');
      setBusquedaSede('');
      setModalAbierto(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const agregarSede = (sede_id) => {
    setFormData((prev) =>
      prev.sedesIds.includes(sede_id)
        ? prev
        : { ...prev, sedesIds: [...prev.sedesIds, sede_id] }
    );
  };

  const moverSede = (i, delta) => {
    setFormData((prev) => {
      const ids = [...prev.sedesIds];
      const j = i + delta;
      if (j < 0 || j >= ids.length) return prev;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return { ...prev, sedesIds: ids };
    });
  };

  const quitarSede = (i) => {
    setFormData((prev) => ({
      ...prev,
      sedesIds: prev.sedesIds.filter((_, idx) => idx !== i),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.usuario_id) {
      setMessage('Seleccione un técnico');
      return;
    }
    if (!formData.fecha) {
      setMessage('Seleccione una fecha');
      return;
    }
    if (formData.sedesIds.length === 0) {
      setMessage('Agregue al menos una sede al orden de visita');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/ruta/${editingId}` : `${API_BASE_URL}/ruta`;
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: Number(formData.usuario_id),
          fecha: formData.fecha,
          estado: formData.estado,
          sedes: formData.sedesIds,
        }),
      });

      if (response.ok) {
        setMessage(isEditing ? 'Ruta actualizada exitosamente' : 'Ruta creada exitosamente');
        cerrarModal();
        fetchRutas();
      } else {
        let texto = 'Error al guardar la ruta';
        try {
          const err = await response.json();
          if (err && err.message) texto = err.message;
        } catch {
          // ignorar
        }
        setMessage(texto);
      }
    } catch (error) {
      setMessage('Error de conexión');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ruta_id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta ruta?')) {
      setIsDeletingId(ruta_id);
      try {
        const response = await fetch(`${API_BASE_URL}/ruta/${ruta_id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setMessage('Ruta eliminada exitosamente');
          fetchRutas();
        } else {
          setMessage('Error al eliminar la ruta');
        }
      } catch (error) {
        setMessage('Error de conexión');
        console.error('Error:', error);
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  const verEnMapa = (ruta_id) => navigate(`/map?ruta=${ruta_id}`);

  return (
    <div className="rutas-container">
      <div className="rutas-content">
        {!modalAbierto && message && <p className="rutas-message">{message}</p>}

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
          <button type="button" className="btn-agregar" onClick={abrirModalNueva}>
            + Agregar Ruta
          </button>
        </div>

        <div className="rutas-list">
          <h3>Rutas ({rutasFiltradas.length})</h3>
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
                    <LoadingButton
                      className="btn-mini btn-mini--editar"
                      onClick={() => abrirModalEditar(ruta)}
                    >
                      Editar
                    </LoadingButton>
                    <LoadingButton
                      className="btn-mini btn-mini--eliminar"
                      onClick={() => handleDelete(ruta.ruta_id)}
                      isLoading={isDeletingId === ruta.ruta_id}
                    >
                      Eliminar
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

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal rutas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar Ruta' : 'Agregar Ruta'}</h3>
              <button type="button" className="modal-cerrar" onClick={cerrarModal}>
                ×
              </button>
            </div>
            {message && <p className="rutas-message">{message}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="usuario_id">Técnico:</label>
                <select
                  id="usuario_id"
                  name="usuario_id"
                  value={formData.usuario_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">- Seleccione un técnico -</option>
                  {tecnicosActivos.map((u) => (
                    <option key={u.usuario_id} value={u.usuario_id}>
                      {u.nombreCompleto} ({u.usuario})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fecha">Fecha:</label>
                <input
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="estado">Estado:</label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rutas-paneles">
                <div className="rutas-panel">
                  <h4>Todas las sedes</h4>
                  <input
                    type="text"
                    className="rutas-buscador-sede"
                    placeholder="Buscar sede..."
                    value={busquedaSede}
                    onChange={(e) => setBusquedaSede(e.target.value)}
                  />
                  <ul className="rutas-sedes-lista">
                    {sedesFiltradasBuscador.length === 0 && (
                      <li className="rutas-vacio">No se encontraron sedes.</li>
                    )}
                    {sedesFiltradasBuscador.map((s) => {
                      const agregada = formData.sedesIds.includes(s.sede_id);
                      return (
                        <li key={s.sede_id}>
                          <div className="rutas-sede-info">
                            <strong>{s.nombre}</strong>
                            {/* <em>
                              {s.tipo} — {s.direccion}
                            </em> */}
                          </div>
                          <button
                            type="button"
                            className="rutas-agregar-btn"
                            disabled={agregada}
                            onClick={() => agregarSede(s.sede_id)}
                          >
                            {agregada ? '✓' : '+'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rutas-panel">
                  <h4>Orden de visita ({formData.sedesIds.length})</h4>
                  {sedesSeleccionadas.length === 0 && (
                    <p className="rutas-vacio">
                      Agregue sedes de la izquierda en el orden en que se visitarán.
                    </p>
                  )}
                  <ul className="rutas-orden-lista">
                    {sedesSeleccionadas.map((s, i) => (
                      <li key={String(s.sede_id)}>
                        <span className="rutas-orden-num">{i + 1}</span>
                        <div className="rutas-orden-info">
                          <strong>{s.nombre || `Sede #${s.sede_id}`}</strong>
                          {/* {s.direccion && <em>{s.tipo} — {s.direccion}</em>} */}
                        </div>
                        <div className="rutas-orden-acciones">
                          <button
                            type="button"
                            className="rutas-orden-btn"
                            disabled={i === 0}
                            onClick={() => moverSede(i, -1)}
                            title="Subir"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rutas-orden-btn"
                            disabled={i === formData.sedesIds.length - 1}
                            onClick={() => moverSede(i, 1)}
                            title="Bajar"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rutas-orden-btn rutas-orden-btn--quitar"
                            onClick={() => quitarSede(i)}
                            title="Quitar"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="modal-acciones">
                <LoadingButton type="submit" isLoading={isSubmitting} className="btn-header">
                  {isEditing ? 'Actualizar Ruta' : 'Crear Ruta'}
                </LoadingButton>
                <LoadingButton
                  type="button"
                  onClick={cerrarModal}
                  className="btn-secundario btn-header"
                >
                  Cancelar
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rutas;