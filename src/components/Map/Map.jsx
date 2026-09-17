import './Map.css';
import { MapContainer, TileLayer, ZoomControl, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const UMBRAL_SEGMENTO_MS = 15 * 60 * 1000; // 15 minutos
const ACCURACY_MAX = 100; // metros
const DIAS_ATRAS_MAX = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

// Marcador circular numerado para el orden planificado de visitas
const crearIconoPlan = (n) =>
  L.divIcon({
    className: 'mapa-ruta-plan-icon',
    html: `<div class="mapa-ruta-plan-bg">${n}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const fmtFecha = (ts) => {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Genera las opciones de día (de hoy hasta 30 días atrás)
const construirDias = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 0; i <= DIAS_ATRAS_MAX; i++) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() - i);
    dias.push(dia);
  }
  return dias;
};

// Etiqueta legible para cada día del desplegable
const etiquetaDia = (dia) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((hoy.getTime() - dia.getTime()) / DIA_MS);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return dia.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy.getTime();
  });
  const [segmentos, setSegmentos] = useState([]);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [mensajeRuta, setMensajeRuta] = useState('');
  const [mostrarAgencias, setMostrarAgencias] = useState(true);
  const [mostrarS24, setMostrarS24] = useState(true);
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null);
  const [rutasDisponibles, setRutasDisponibles] = useState([]);
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState('');
  const [rutaPlanificada, setRutaPlanificada] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const rutaParamProcesada = useRef(false);

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

        // Obtener rutas planificadas
        const rutasResponse = await fetch(`${API_BASE_URL}/rutas`);
        const rutasData = await rutasResponse.json();
        setRutasDisponibles(Array.isArray(rutasData) ? rutasData : []);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);

  // Cargar la ruta planificada seleccionada en el panel o desde el enlace "Ver en mapa"
  useEffect(() => {
    let ignorar = false;
    if (!rutaSeleccionadaId) {
      setRutaPlanificada(null);
      return;
    }
    const cargar = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ruta/${rutaSeleccionadaId}`);
        const data = response.ok ? await response.json() : null;
        if (ignorar) return;
        setRutaPlanificada(data && Array.isArray(data.sedes) ? data : null);
      } catch (error) {
        console.error('Error al cargar la ruta planificada:', error);
        if (!ignorar) setRutaPlanificada(null);
      }
    };
    cargar();
    return () => {
      ignorar = true;
    };
  }, [rutaSeleccionadaId]);

  // Si se llega con /map?ruta=ID, cargar esa ruta y ubicar técnico/día
  useEffect(() => {
    const rutaId = searchParams.get('ruta');
    if (rutaId && !rutaParamProcesada.current) {
      rutaParamProcesada.current = true;
      (async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/ruta/${rutaId}`);
          const data = response.ok ? await response.json() : null;
          if (data && Array.isArray(data.sedes)) {
            setRutaPlanificada(data);
            setRutaSeleccionadaId(String(data.ruta_id));
            setUsuarioSeleccionado(String(data.usuario_id));
            const d = new Date(`${data.fecha}T00:00:00`);
            if (!isNaN(d.getTime())) setDiaSeleccionado(d.getTime());
          }
        } catch (error) {
          console.error('Error al cargar ruta desde la URL:', error);
        } finally {
          setSearchParams({}, { replace: true });
        }
      })();
    } else if (rutaParamProcesada.current && !rutaId) {
      rutaParamProcesada.current = false;
    }
  }, [searchParams, setSearchParams]);

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
        const inicioDia = diaSeleccionado;
        const finDia = inicioDia + DIA_MS;
        const puntosRuta = puntos.filter((p) => p.ts >= inicioDia && p.ts < finDia);

        if (ignorar) return;
        setUltimaUbicacion(ultimoPunto);
        const segs = construirSegmentos(puntosRuta);
        setSegmentos(segs);
        if (puntosRuta.length === 0) {
          setMensajeRuta('Sin registros de ubicación en el día seleccionado.');
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
  }, [usuarioSeleccionado, diaSeleccionado]);

  const todosLosPuntos = segmentos.flat();
  const dias = construirDias();
  const usuarioActual = usuarios.find(
    (u) => String(u.usuario_id) === String(usuarioSeleccionado)
  );

  // Solo los usuarios con rol Técnico pueden evaluarse en el mapa
  const tecnicos = usuarios.filter(
    (u) => String(u.rol || '').trim() === 'Técnico'
  );

  // Rutas planificadas del técnico y día seleccionados
  const rutasDelDia = rutasDisponibles.filter(
    (r) =>
      String(r.usuario_id) === String(usuarioSeleccionado) &&
      String(r.fecha).slice(0, 10) === fmtFecha(diaSeleccionado)
  );

  // Puntos de la ruta planificada (en orden de visita) como objetos para el mapa
  const puntosPlan = (rutaPlanificada?.sedes || [])
    .filter(
      (s) =>
        s.latitud &&
        s.longitud &&
        !isNaN(parseFloat(s.latitud)) &&
        !isNaN(parseFloat(s.longitud))
    )
    .map((s) => ({ latitud: parseFloat(s.latitud), longitud: parseFloat(s.longitud) }));

  const puntosVista = todosLosPuntos.length > 0 ? todosLosPuntos : puntosPlan;

  const ultimaUbicacionMostrar = ultimaUbicacion;

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
                onChange={(e) => {
                  setUsuarioSeleccionado(e.target.value);
                  setRutaSeleccionadaId('');
                  setRutaPlanificada(null);
                }}
              >
                <option value="">Seleccionar técnico</option>
                {tecnicos.map((usuario) => (
                  <option key={usuario.usuario_id} value={usuario.usuario_id}>
                    {usuario.nombreCompleto || `Usuario ${usuario.usuario_id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="route-label">
              Día:
              <select
                className="route-select"
                value={diaSeleccionado}
                onChange={(e) => {
                  setDiaSeleccionado(Number(e.target.value));
                  setRutaSeleccionadaId('');
                  setRutaPlanificada(null);
                }}
              >
                {dias.map((dia) => (
                  <option key={dia.getTime()} value={dia.getTime()}>
                    {etiquetaDia(dia)}
                  </option>
                ))}
              </select>
            </label>

            <label className="route-label">
              Ruta planificada:
              <select
                className="route-select"
                value={rutaSeleccionadaId}
                onChange={(e) => setRutaSeleccionadaId(e.target.value)}
                disabled={!usuarioSeleccionado}
              >
                <option value="">{rutasDelDia.length ? 'Seleccionar ruta' : 'Sin ruta este día'}</option>
                {rutasDelDia.map((r) => (
                  <option key={r.ruta_id} value={r.ruta_id}>
                    {r.fecha} — {r.total_sedes} sedes — {r.estado}
                  </option>
                ))}
              </select>
            </label>

            {rutaPlanificada && Array.isArray(rutaPlanificada.sedes) && rutaPlanificada.sedes.length > 0 && (
              <div className="planned-route">
                <h4 className="panel-title">Orden planificado de visitas</h4>
                <p className="route-message">Línea naranja punteada: ruta planificada.</p>
                <ol className="planned-route-list">
                  {rutaPlanificada.sedes.map((s, i) => (
                    <li key={s.sede_id}>
                      <span className="planned-route-num">{i + 1}</span>
                      {s.nombre || `Sede #${s.sede_id}`}
                    </li>
                  ))}
                </ol>
              </div>
            )}

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

            <AjustarVistaMapa puntos={puntosVista} />

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
                      <p>Hora: {formatearHora(todosLosPuntos[0].ts)}</p>
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
                      <p>Hora: {formatearHora(todosLosPuntos[todosLosPuntos.length - 1].ts)}</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
          {rutaPlanificada &&
              Array.isArray(rutaPlanificada.sedes) &&
              rutaPlanificada.sedes.map((s, i) =>
                s.latitud && s.longitud ? (
                  <Marker
                    key={`plan-${s.sede_id}`}
                    position={[parseFloat(s.latitud), parseFloat(s.longitud)]}
                    icon={crearIconoPlan(i + 1)}
                  >
                    <Popup>
                      <div>
                        <strong>
                          {i + 1}. {s.tipo}
                        </strong>
                        <p>Nombre: {s.nombre}</p>
                        {s.direccion && <p>Dirección: {s.direccion}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default Map;