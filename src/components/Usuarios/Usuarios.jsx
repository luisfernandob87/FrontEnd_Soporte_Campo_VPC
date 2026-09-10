import { useState, useEffect, useMemo } from 'react';
import './Usuarios.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

const FORM_VACIO = {
  usuario: '',
  nombreCompleto: '',
  rol: '',
  status: 'Activo',
};

function Usuarios() {
  const [formData, setFormData] = useState(FORM_VACIO);
  const [usuarios, setUsuarios] = useState([]);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);

  const FILAS_POR_PAGINA = 10;

  const fetchUsuarios = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios_admin`);
      if (response.ok) {
        const data = await response.json();
        setUsuarios(Array.isArray(data) ? data : []);
      } else {
        console.error('Error al obtener los usuarios');
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      [u.usuario, u.nombreCompleto, u.rol].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [usuarios, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / FILAS_POR_PAGINA)
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const abrirModalNueva = () => {
    setFormData(FORM_VACIO);
    setIsEditing(false);
    setEditingId(null);
    setMessage('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (u) => {
    setFormData({
      usuario: u.usuario,
      nombreCompleto: u.nombreCompleto,
      rol: u.rol || '',
      status: u.status || 'Activo',
    });
    setIsEditing(true);
    setEditingId(u.usuario_id);
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
    try {
      const url = isEditing
        ? `${API_BASE_URL}/usuario/${editingId}`
        : `${API_BASE_URL}/usuario`;
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? {
            nombreCompleto: formData.nombreCompleto,
            rol: formData.rol,
            status: formData.status,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage(
          isEditing ? 'Usuario actualizado exitosamente' : 'Usuario agregado exitosamente'
        );
        cerrarModal();
        fetchUsuarios();
      } else {
        setMessage(isEditing ? 'Error al actualizar el usuario' : 'Error al agregar el usuario');
      }
    } catch (error) {
      setMessage('Error de conexión');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="usuarios-container">
      <div className="usuarios-content">
        {!modalAbierto && message && <p className="usuarios-message">{message}</p>}

        <div className="usuarios-header">
          <input
            type="text"
            className="usuarios-buscador"
            placeholder="Buscar por usuario, nombre o rol..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
          <button type="button" className="btn-agregar" onClick={abrirModalNueva}>
            + Agregar Usuario
          </button>
        </div>

        <div className="usuarios-list">
          <h3>Usuarios ({usuariosFiltrados.length})</h3>
          {cargando ? (
            <p className="usuarios-vacio">Cargando datos...</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosPaginados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="usuarios-vacio">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                  {usuariosPaginados.map((u) => (
                    <tr key={u.usuario_id}>
                      <td>{u.usuario}</td>
                      <td>{u.nombreCompleto}</td>
                      <td>
                        <span className="usuarios-rol">{u.rol || 'Sin rol'}</span>
                      </td>
                      <td>
                        <span
                          className={`usuarios-status ${
                            u.status === 'Activo' ? 'activo' : 'inactivo'
                          }`}
                        >
                          {u.status || 'Inactivo'}
                        </span>
                      </td>
                      <td className="usuarios-acciones">
                        <LoadingButton
                          onClick={() => abrirModalEditar(u)}
                          isLoading={false}
                          className="btn-mini btn-mini--editar"
                        >
                          Editar
                        </LoadingButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="usuarios-paginacion">
                <button
                  className="btn-paginacion"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(paginaActual - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {paginaActual} de {totalPaginas} ({usuariosFiltrados.length} usuarios)
                </span>
                <button
                  className="btn-paginacion"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar Usuario' : 'Agregar Usuario'}</h3>
              <button type="button" className="modal-cerrar" onClick={cerrarModal}>
                ×
              </button>
            </div>
            {message && <p className="usuarios-message">{message}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="usuario">Usuario:</label>
                <input
                  type="text"
                  id="usuario"
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="nombreCompleto">Nombre:</label>
                <input
                  type="text"
                  id="nombreCompleto"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="rol">Rol:</label>
                <select id="rol" name="rol" value={formData.rol} onChange={handleChange}>
                  <option value="">Sin rol (no puede entrar)</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Coordinador">Coordinador</option>
                  {formData.rol &&
                    formData.rol !== 'Técnico' &&
                    formData.rol !== 'Coordinador' && (
                      <option value={formData.rol}>{formData.rol}</option>
                    )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Estado:</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="modal-acciones">
                <LoadingButton type="submit" isLoading={isSubmitting} className="btn-header">
                  {isEditing ? 'Actualizar Usuario' : 'Agregar Usuario'}
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

export default Usuarios;