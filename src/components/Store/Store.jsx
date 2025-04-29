import { useState, useEffect } from 'react';
import './Store.css';
import { API_BASE_URL } from '../../config';
import LoadingButton from '../common/LoadingButton';

function Store() {
  const [formData, setFormData] = useState({
    tipo: '',
    nombre: '',
    direccion: '',
    latitud: '',
    longitud: ''
  });
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
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
        setFormData({
          tipo: '',
          nombre: '',
          direccion: '',
          latitud: '',
          longitud: ''
        });
        setIsEditing(false);
        setEditingId(null);
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

  const handleEdit = (store) => {
    setFormData({
      tipo: store.tipo,
      nombre: store.nombre,
      direccion: store.direccion,
      latitud: store.latitud,
      longitud: store.longitud
    });
    setIsEditing(true);
    setEditingId(store.sede_id);
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

          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
          >
            {isEditing ? 'Actualizar Sede' : 'Agregar Sede'}
          </LoadingButton>
          {isEditing && (
            <LoadingButton
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setFormData({
                  tipo: '',
                  nombre: '',
                  direccion: '',
                  latitud: '',
                  longitud: ''
                });
              }}
            >
              Cancelar Edición
            </LoadingButton>
          )}
        </form>
        {message && <p className="message">{message}</p>}

        <div className="stores-list">
          <h3>Sedes Existentes</h3>
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
              {stores.map((store) => (
                <tr key={store.sede_id}>
                  <td>{store.tipo}</td>
                  <td>{store.nombre}</td>
                  <td>{store.direccion}</td>
                  <td>{store.latitud}</td>
                  <td>{store.longitud}</td>
                  <td>
                    <LoadingButton
                      onClick={() => handleEdit(store)}
                      isLoading={isSubmitting}
                    >
                      Editar
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => handleDelete(store.sede_id)}
                      isLoading={isDeletingId === store.sede_id}
                    >
                      Eliminar
                    </LoadingButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Store;