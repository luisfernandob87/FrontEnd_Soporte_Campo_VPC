import { useState, useEffect, useMemo } from 'react';
import './Store.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

const FORM_VACIO = {
  tipo: '',
  nombre: '',
  direccion: '',
  latitud: '',
  longitud: ''
};

function Store() {
  const [formData, setFormData] = useState(FORM_VACIO);
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const FILAS_POR_PAGINA = 10;

  const fetchStores = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sedes`);
      if (response.ok) {
        const data = await response.json();
        setStores(data); // Asume que el array de sedes es la respuesta directa
      } else {
        console.error('Error al obtener las sedes');
      }
    } catch (error) {
      console.error('Error al obtener tiendas:', error);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const storesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      [s.tipo, s.nombre, s.direccion].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [stores, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(storesFiltradas.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const storesPaginados = storesFiltradas.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const abrirModalNueva = () => {
    setFormData(FORM_VACIO);
    setIsEditing(false);
    setEditingId(null);
    setMessage('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (store) => {
    setFormData({
      tipo: store.tipo,
      nombre: store.nombre,
      direccion: store.direccion,
      latitud: store.latitud,
      longitud: store.longitud
    });
    setIsEditing(true);
    setEditingId(store.sede_id);
    setMessage('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Datos enviados:', formData); // Verifica los datos enviados
    try {
      const url = isEditing
        ? `${API_BASE_URL}/sede/${editingId}`
        : `${API_BASE_URL}/sede`;

      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage(isEditing ? 'Sede actualizada exitosamente' : 'Sede agregada exitosamente');
        setFormData(FORM_VACIO);
        cerrarModal();
        fetchStores();
      } else {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
        setMessage(isEditing ? 'Error al actualizar la sede' : 'Error al agregar la sede');
      }
    } catch (error) {
      setMessage('Error de conexión');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sede_id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta sede?')) {
      setIsDeletingId(sede_id);
      try {
        const response = await fetch(`${API_BASE_URL}/sede/${sede_id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setMessage('Sede eliminada exitosamente');
          fetchStores();
        } else {
          setMessage('Error al eliminar la sede');
        }
      } catch (error) {
        setMessage('Error de conexión');
        console.error('Error:', error);
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  return (
    <div className="store-container">
      <div className="store-content">
        {!modalAbierto && message && <p className="message">{message}</p>}

        <div className="store-header">
          <input
            type="text"
            className="store-buscador"
            placeholder="Buscar por tipo, nombre o dirección..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
          <button type="button" className="btn-agregar" onClick={abrirModalNueva}>
            + Agregar Sede
          </button>
        </div>

        <div className="stores-list">
          <h3>Sedes Existentes ({storesFiltradas.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {storesPaginados.length === 0 && (
                <tr>
                  <td colSpan="6" className="store-vacio">
                    No se encontraron sedes.
                  </td>
                </tr>
              )}
              {storesPaginados.map((store) => (
                <tr key={store.sede_id}>
                  <td>{store.tipo}</td>
                  <td>{store.nombre}</td>
                  <td>{store.direccion}</td>
                  <td>{store.latitud}</td>
                  <td>{store.longitud}</td>
                  <td className="acciones-cell">
                    <LoadingButton
                      onClick={() => abrirModalEditar(store)}
                      isLoading={false}
                      className="btn-mini btn-mini--editar"
                    >
                      Editar
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => handleDelete(store.sede_id)}
                      isLoading={isDeletingId === store.sede_id}
                      className="btn-mini btn-mini--eliminar"
                    >
                      Eliminar
                    </LoadingButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="store-paginacion">
            <button
              className="btn-paginacion"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              Anterior
            </button>
            <span>
              Página {paginaActual} de {totalPaginas} ({storesFiltradas.length} sedes)
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar Sede' : 'Agregar Sede'}</h3>
              <button type="button" className="modal-cerrar" onClick={cerrarModal}>
                ×
              </button>
            </div>
            {message && <p className="message">{message}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="tipo">Tipo:</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="">- Seleccione -</option>
                  <option value="Super 24">Super 24</option>
                  <option value="Agencia">Agencia</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="nombre">Nombre:</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="direccion">Dirección:</label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="latitud">Latitud:</label>
                <input
                  type="text"
                  id="latitud"
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="longitud">Longitud:</label>
                <input
                  type="text"
                  id="longitud"
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="modal-acciones">
                <LoadingButton type="submit" isLoading={isSubmitting} className="btn-header">
                  {isEditing ? 'Actualizar Sede' : 'Agregar Sede'}
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

export default Store;