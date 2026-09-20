import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [messageEsError, setMessageEsError] = useState(false);
  const [stores, setStores] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [importando, setImportando] = useState(false);
  const [importMessage, setImportMessage] = useState(null);
  const fileInputRef = useRef(null);

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
    setMessageEsError(false);
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
    setMessageEsError(false);
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
        setMessageEsError(false);
        setFormData(FORM_VACIO);
        cerrarModal();
        fetchStores();
      } else {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
        setMessage(errorData.message || (isEditing ? 'Error al actualizar la sede' : 'Error al agregar la sede'));
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

  const handleDelete = async (sede_id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta sede?')) {
      setIsDeletingId(sede_id);
      try {
        const response = await fetch(`${API_BASE_URL}/sede/${sede_id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setMessage('Sede eliminada exitosamente');
          setMessageEsError(false);
          fetchStores();
        } else {
          setMessage('Error al eliminar la sede');
          setMessageEsError(true);
        }
      } catch (error) {
        setMessage('Error de conexión');
        setMessageEsError(true);
        console.error('Error:', error);
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  const escaparCSV = (valor) => {
    const s = String(valor ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportarCSV = () => {
    const encabezados = ['tipo', 'nombre', 'direccion', 'latitud', 'longitud'];
    const filas = stores.map((sede) =>
      encabezados.map((h) => escaparCSV(sede[h])).join(',')
    );
    const csv = [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sedes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (texto) => {
    const filas = [];
    let fila = [];
    let campo = '';
    let enComillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (enComillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') {
            campo += '"';
            i++;
          } else {
            enComillas = false;
          }
        } else {
          campo += c;
        }
      } else if (c === '"') {
        enComillas = true;
      } else if (c === ',') {
        fila.push(campo);
        campo = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = '';
      } else {
        campo += c;
      }
    }
    if (campo !== '' || fila.length > 0) {
      fila.push(campo);
      filas.push(fila);
    }
    return filas;
  };

  const importarCSV = async (file) => {
    setImportando(true);
    setImportMessage(null);
    try {
      const texto = await file.text();
      const filas = parseCSV(texto).filter((f) => f.some((c) => String(c).trim() !== ''));

      if (filas.length < 2) {
        setImportMessage({
          type: 'error',
          texto: 'El archivo CSV no contiene datos o el encabezado es inválido.'
        });
        return;
      }

      const encabezados = filas[0].map((h) => h.trim().toLowerCase());
      const indice = (col) => {
        const i = encabezados.indexOf(col);
        return i === -1 ? null : i;
      };
      const idx = {
        tipo: indice('tipo'),
        nombre: indice('nombre'),
        direccion: indice('direccion'),
        latitud: indice('latitud'),
        longitud: indice('longitud')
      };

      const camposFaltantes = Object.keys(idx).filter((k) => idx[k] === null);
      if (camposFaltantes.length > 0) {
        setImportMessage({
          type: 'error',
          texto: `Faltan columnas en el CSV: ${camposFaltantes.join(', ')}.`
        });
        return;
      }

      let creadas = 0;
      let duplicadas = 0;
      const errores = [];
      const datos = filas.slice(1);

      const nombresVistos = new Set(
        stores.map((s) => String(s.nombre || '').trim().toLowerCase())
      );
      const coordsVistas = new Set(
        stores.map((s) => `${String(s.latitud || '').trim()}|${String(s.longitud || '').trim()}`)
      );
      const esDuplicada = (data) =>
        nombresVistos.has(data.nombre.toLowerCase()) ||
        coordsVistas.has(`${data.latitud}|${data.longitud}`);

      for (let i = 0; i < datos.length; i++) {
        const fila = datos[i];
        const data = {
          tipo: String(fila[idx.tipo] ?? '').trim(),
          nombre: String(fila[idx.nombre] ?? '').trim(),
          direccion: String(fila[idx.direccion] ?? '').trim(),
          latitud: String(fila[idx.latitud] ?? '').trim(),
          longitud: String(fila[idx.longitud] ?? '').trim()
        };

        if (!data.tipo || !data.nombre || !data.direccion || !data.latitud || !data.longitud) {
          errores.push(`Fila ${i + 2}: faltan campos obligatorios`);
          continue;
        }

        if (esDuplicada(data)) {
          duplicadas++;
          continue;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/sede`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (response.ok) {
            creadas++;
            nombresVistos.add(data.nombre.toLowerCase());
            coordsVistas.add(`${data.latitud}|${data.longitud}`);
          } else if (response.status === 409) {
            duplicadas++;
          } else {
            errores.push(`Fila ${i + 2}: "${data.nombre}" (error del servidor)`);
          }
        } catch {
          errores.push(`Fila ${i + 2}: "${data.nombre}" (error de conexión)`);
        }
      }

      const resumen = `Importación completada: ${creadas} creadas, ${duplicadas} duplicadas, ${errores.length} con errores.`;
      setImportMessage({
        type: errores.length > 0 ? 'error' : 'success',
        texto: errores.length > 0
          ? `${resumen} ${errores.slice(0, 5).join(' | ')}`
          : resumen
      });
      fetchStores();
    } catch {
      setImportMessage({ type: 'error', texto: 'No se pudo leer el archivo CSV.' });
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importarCSV(file);
  };

  return (
    <div className="store-container">
      <div className="store-content">
        {!modalAbierto && message && (
          <p className={messageEsError ? 'message message--error' : 'message'}>{message}</p>
        )}
        {importMessage && (
          <p className={`import-message ${importMessage.type === 'error' ? 'import-message--error' : ''}`}>
            {importMessage.texto}
          </p>
        )}

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
          <div className="store-header-acciones">
            <button
              type="button"
              className="btn-csv"
              onClick={exportarCSV}
              disabled={stores.length === 0}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="btn-csv"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={importando}
            >
              {importando ? 'Importando...' : 'Importar CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleFileChange}
            />
            <button type="button" className="btn-agregar" onClick={abrirModalNueva}>
              + Agregar Sede
            </button>
          </div>
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
            {message && (
              <p className={messageEsError ? 'message message--error' : 'message'}>{message}</p>
            )}
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