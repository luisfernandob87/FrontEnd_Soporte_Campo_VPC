import './Map.css';
import { MapContainer, TileLayer, ZoomControl, Marker, Popup } from 'react-leaflet';
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

function Map() {
  const [sedes, setSedes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener sedes
        const sedesResponse = await fetch(`${API_BASE_URL}/sedes`);
        const sedesData = await sedesResponse.json();
        setSedes(sedesData);

        // Obtener usuarios
        const usuariosResponse = await fetch('https://backend-soporte-campo-vpc.onrender.com/usuarios');
        const usuariosData = await usuariosResponse.json();
        setUsuarios(usuariosData);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="map-container">
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
          {/* Renderizar marcadores de sedes */}
          {sedes
            .filter((sede) => sede.latitud && sede.longitud)
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
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default Map;