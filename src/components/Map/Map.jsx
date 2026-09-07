import './Map.css';
import { MapContainer, TileLayer, ZoomControl, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import { API_BASE_URL } from '../../config';
import s24 from '../../assets/s24_icono.png';
import agencias from '../../assets/agencia_icono.png';
// Importar íconos locales para el marcador predeterminado
import markerIcon2x from '../../assets/marker-icon-2x.png';
import markerIcon from '../../assets/marker-icon.png';
import markerShadow from '../../assets/marker-shadow.png';

// Configurar el ícono predeterminado de Leaflet para que cargue de forma local
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Definir el ícono personalizado para "Super 24"
const s24Icon = L.icon({
  iconUrl: s24,
  iconSize: [30, 30], // Ajusta estos valores según sea necesario
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow,
});

// Definir el ícono personalizado para "Agencia"
const agenciaIcon = L.icon({
  iconUrl: agencias,
  iconSize: [30, 30], // Ajusta estos valores según sea necesario
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow,
});

// Opciones de rango de fechas para la ruta
const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 0, desdeInicioDeHoy: true },
  { id: '3d', label: '3 días', dias: 3, desdeInicioDeHoy: false },
  { id: '7d', label: '7 días', dias: 7, desdeInicioDeHoy: false },
  { id: '30d', label: '30 días', dias: 30, desdeInicioDeHoy: false },
];

const UMBRAL_SEGMENTO_MS = 15 * 60 * 1000; // 15 minutos
const ACCURACY_MAX = 100; // metros

// Calcula la fecha límite según el rango seleccionado
const obtenerLimiteRango = (rango) => {
  const config = RANGOS.find((r) => r.id === rango) || RANGOS[0];
  const limite = new Date();
  if (config.desdeInicioDeHoy) {
    limite.setHours(0, 0, 0, 0);
  } else {
    limite.setDate(limite.getDate() - config.dias);
  }
  return limite.getTime();
};

// Divide los puntos de la ruta en segmentos cuando hay saltos de tiempo grandes
const construirSegmentos = (puntos) => {
  const segmentos = [];
  let actual = [];
  for (let i = 0; i < puntos.length; i++) {
    const punto = puntos[i];
    const esNuevoSegmento =
      actual.length > 0 &&
      punto.ts - actual[actual.length - 1].ts > UMBRAL_SEGMENTO_MS;
    if (esNuevoSegmento && actual.length > 0) {
      segmentos.push(actual);
      actual = [];
    }
    actual.push(punto);
  }
  if (actual.length > 0) {
    segmentos.push(actual);
  }
  return segmentos;
};

// Ajusta el mapa para mostrar toda la ruta
function AjustarVistaMapa({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) {
      map.setView([puntos[0].latitud, puntos[0].longitud], 15);
    } else if (puntos.length > 1) {
      map.fitBounds(
        L.latLngBounds(puntos.map((p) => [p.latitud, p.longitud])),
        { padding: [40, 40] }
      );
    }
  }, [puntos, map]);
  return null;
}

function Map() {
  const [sedes, setSedes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [rango, setRango] = useState('hoy');
  const [segmentos, setSegmentos] = useState([]);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [mensajeRuta, setMensajeRuta] = useState('');
  const [mostrarAgencias, setMostrarAgencias] = useState(true);
  const [mostrarS24, setMostrarS24] = useState(true);
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener sedes
        const sedesResponse = await fetch(`${API_BASE_URL}/sedes`);
        const sedesData = await sedesResponse.json();
        setSedes(sedesData);

        // Obtener usuarios
        const usuariosResponse = await fetch(`${API_BASE_URL}/usuarios`);
        const usuariosData = await usuariosResponse.json();
        setUsuarios(usuariosData);
        if (usuariosData.length > 0) {
          setUsuarioSeleccionado(String(usuariosData[0].usuario_id));
        }
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);

  // Obtener el historial de ubicación del usuario seleccionado
  useEffect(() => {
    let ignorar = false;
    if (!usuarioSeleccionado) {
      setSegmentos([]);
      setUltimaUbicacion(null);
      return;
    }

    const fetchHistorial = async () => {
      setCargandoRuta(true);
      setMensajeRuta('');
      try {
        const response = await fetch(
          `${API_BASE_URL}/usuario/${usuarioSeleccionado}/historial`
        );
        if (!response.ok) {
          throw new Error('Error al obtener el historial');
        }
        const data = await response.json();
        const limite = obtenerLimiteRango(rango);

        const puntos = (Array.isArray(data) ? data : [])
          .filter(
            (p) =>
              p.latitud && p.longitud && (p.accuracy == null || p.accuracy <= ACCURACY_MAX)
          )
          .map((p) => ({
            latitud: parseFloat(p.latitud),
            longitud: parseFloat(p.longitud),
            ts: new Date(p.timestamp).getTime(),
          }))
          .filter((p) => !isNaN(p.ts))
          .sort((a, b) => a.ts - b.ts);

        const ultimoPunto = puntos[puntos.length - 1] || null;
        const puntosRuta = puntos.filter((p) => p.ts >= limite);

        if (ignorar) return;
        setUltimaUbicacion(ultimoPunto);
        const segs = construirSegmentos(puntosRuta);
        setSegmentos(segs);
        if (puntosRuta.length === 0) {
          setMensajeRuta('Sin registros de ubicación en el rango seleccionado.');
        }
      } catch (error) {
        console.error('Error al obtener el historial:', error);
        if (!ignorar) {
          setSegmentos([]);
          setUltimaUbicacion(null);
          setMensajeRuta('No se pudo cargar la ruta.');
        }
      } finally {
        if (!ignorar) setCargandoRuta(false);
      }
    };

    fetchHistorial();
    return () => {
      ignorar = true;
    };
  }, [usuarioSeleccionado, rango]);

  const todosLosPuntos = segmentos.flat();
  const usuarioActual = usuarios.find(
    (u) => String(u.usuario_id) === String(usuarioSeleccionado)
  );

  const ubicacionDesdeUsuario =
    usuarioActual?.latitud && usuarioActual?.longitud
      ? {
          latitud: parseFloat(usuarioActual.latitud),
          longitud: parseFloat(usuarioActual.longitud),
          ts: null,
        }
      : null;

  const ultimaUbicacionMostrar = ultimaUbicacion || ubicacionDesdeUsuario;

  const formatearFecha = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Sin registro';
  const formatearHora = (ts) =>
    ts
      ? new Date(ts).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Sin registro';

  return (
    <div className="map-container">
      <div className="map-layout">
        <aside className="map-panel">
          <div className="panel-block">
            <h3 className="panel-title">Capas</h3>
            <div className="layer-controls">
              <button
                type="button"
                className={`layer-button ${mostrarAgencias ? 'active' : ''}`}
                aria-pressed={mostrarAgencias}
                onClick={() => setMostrarAgencias((v) => !v)}
              >
                <img src={agencias} alt="" />
                Agencias
              </button>
              <button
                type="button"
                className={`layer-button ${mostrarS24 ? 'active' : ''}`}
                aria-pressed={mostrarS24}
                onClick={() => setMostrarS24((v) => !v)}
              >
                <img src={s24} alt="" />
                Super 24
              </button>
            </div>
          </div>

          <div className="panel-block">
            <h3 className="panel-title">Evaluar ruta de técnico</h3>
            <label className="route-label">
              Técnico:
              <select
                className="route-select"
                value={usuarioSeleccionado}
                onChange={(e) => setUsuarioSeleccionado(e.target.value)}
              >
                {usuarios.length === 0 && <option value="">Sin técnicos</option>}
                {usuarios.map((usuario) => (
                  <option key={usuario.usuario_id} value={usuario.usuario_id}>
                    {usuario.nombreCompleto || `Usuario ${usuario.usuario_id}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="range-buttons">
              {RANGOS.map((r) => (
                <button
                  key={r.id}
                  className={`range-button ${rango === r.id ? 'active' : ''}`}
                  onClick={() => setRango(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="last-location">
              <h4 className="panel-title">Última ubicación</h4>
              {cargandoRuta && <p className="route-message">Cargando ruta...</p>}
              {!cargandoRuta &&
                !ultimaUbicacionMostrar &&
                !mensajeRuta && <p className="route-message">Sin datos de ubicación.</p>}
              {!cargandoRuta && mensajeRuta && (
                <p className="route-message">{mensajeRuta}</p>
              )}
              {!cargandoRuta && ultimaUbicacionMostrar && (
                <dl className="location-details">
                  <div>
                    <dt>Latitud</dt>
                    <dd>{ultimaUbicacionMostrar.latitud.toFixed(5)}</dd>
                  </div>
                  <div>
                    <dt>Longitud</dt>
                    <dd>{ultimaUbicacionMostrar.longitud.toFixed(5)}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>{formatearFecha(ultimaUbicacionMostrar.ts)}</dd>
                  </div>
                  <div>
                    <dt>Hora</dt>
                    <dd>{formatearHora(ultimaUbicacionMostrar.ts)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </aside>

        <div className="map-content">
          <MapContainer
            center={[14.6426491, -90.5156846]}
            zoom={12}
            zoomControl={false}
            className="leaflet-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
            />
            <ZoomControl position="bottomright" />

            <AjustarVistaMapa puntos={todosLosPuntos} />

            {/* Renderizar marcadores de sedes */}
            {sedes
              .filter((sede) => sede.latitud && sede.longitud)
              .filter((sede) => {
                if (sede.tipo === 'Super 24') return mostrarS24;
                if (sede.tipo === 'Agencia') return mostrarAgencias;
                return true;
              })
              .map((sede) => (
                <Marker
                  key={sede.sede_id}
                  position={[parseFloat(sede.latitud), parseFloat(sede.longitud)]}
                  icon={
                    sede.tipo === 'Super 24'
                      ? s24Icon
                      : sede.tipo === 'Agencia'
                      ? agenciaIcon
                      : new L.Icon.Default()
                  }
                >
                  <Popup>
                    <div>
                      <h3>{sede.tipo}</h3>
                      <p>Nombre: {sede.nombre}</p>
                      <p>Dirección: {sede.direccion}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Renderizar marcadores de usuarios */}
            {usuarios
              .filter((usuario) => usuario.latitud && usuario.longitud)
              .map((usuario) => (
                <Marker
                  key={usuario.usuario_id}
                  position={[parseFloat(usuario.latitud), parseFloat(usuario.longitud)]}
                  icon={new L.Icon.Default()}
                >
                  <Popup>
                    <div>
                      <p>{usuario.nombreCompleto}</p>
                      <p>
                        Lat: {parseFloat(usuario.latitud).toFixed(5)} — Lng:{' '}
                        {parseFloat(usuario.longitud).toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Renderizar la ruta del usuario seleccionado */}
            {segmentos.map((segmento, i) => (
              <Polyline
                key={i}
                positions={segmento.map((p) => [p.latitud, p.longitud])}
                pathOptions={{ color: '#1976d2', weight: 4, opacity: 0.8 }}
              />
            ))}
            {todosLosPuntos.length > 0 && (
              <>
                <Marker
                  position={[
                    todosLosPuntos[0].latitud,
                    todosLosPuntos[0].longitud,
                  ]}
                  icon={new L.Icon.Default()}
                >
                  <Popup>
                    <div>
                      <p>Inicio de ruta — {usuarioActual?.nombreCompleto}</p>
                    </div>
                  </Popup>
                </Marker>
                <Marker
                  position={[
                    todosLosPuntos[todosLosPuntos.length - 1].latitud,
                    todosLosPuntos[todosLosPuntos.length - 1].longitud,
                  ]}
                  icon={new L.Icon.Default()}
                >
                  <Popup>
                    <div>
                      <p>Última ubicación — {usuarioActual?.nombreCompleto}</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default Map;