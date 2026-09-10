import { useState, useEffect, useMemo, useCallback } from 'react';
import './Reportes.css';
import { API_BASE_URL } from '../../config';

// Distancia en km entre dos puntos (fórmula de Haversine)
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.latitud - a.latitud) * Math.PI) / 180;
  const dLng = ((b.longitud - a.longitud) * Math.PI) / 180;
  const lat1 = (a.latitud * Math.PI) / 180;
  const lat2 = (b.latitud * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Descarga un arreglo de objetos como archivo CSV
const descargarCSV = (nombre, filas) => {
  if (!filas || filas.length === 0) return;
  const headers = Object.keys(filas[0]);
  const contenido = [
    headers.join(','),
    ...filas.map((fila) =>
      headers
        .map((h) => {
          const valor = fila[h] == null ? '' : String(fila[h]);
          return /[",;\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + contenido], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
};

const fmtFecha = (ts) =>
  ts
    ? new Date(ts).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Sin registro';

const fmtHora = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Sin registro';

const fmtFechaHora = (ts) =>
  ts
    ? new Date(ts).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sin registros';

const isoFecha = (fecha) => {
  const d = new Date(fecha);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const inicioDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const finDelDia = (fecha) => inicioDelDia(fecha) + 24 * 60 * 60 * 1000;

const hoyISO = () => isoFecha(new Date());

function Reportes() {
  const [tab, setTab] = useState('reportes');

  const [sedes, setSedes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [historiales, setHistoriales] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Controles de reportes
  const [desdeActividad, setDesdeActividad] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return isoFecha(d);
  });
  const [hastaActividad, setHastaActividad] = useState(hoyISO);
  const [diaDistancia, setDiaDistancia] = useState(hoyISO);
  const [diasInactivos, setDiasInactivos] = useState(3);

  // Controles resumen de sedes
  const [verTodosTipos, setVerTodosTipos] = useState(false);
  const [busquedaSede, setBusquedaSede] = useState('');
  const [paginaSedes, setPaginaSedes] = useState(1);

  // Controles de bitácora
  const [bitacora, setBitacora] = useState([]);
  const [cargandoBitacora, setCargandoBitacora] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [desdeBitacora, setDesdeBitacora] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoFecha(d);
  });
  const [hastaBitacora, setHastaBitacora] = useState('');
  const [paginaBitacora, setPaginaBitacora] = useState(1);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [sedesRes, usuariosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sedes`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/usuarios`).then((r) => r.json()),
      ]);
      const sedesArr = Array.isArray(sedesRes) ? sedesRes : [];
      const usuariosArr = Array.isArray(usuariosRes) ? usuariosRes : [];
      setSedes(sedesArr);
      setUsuarios(usuariosArr);

      const resultado = await Promise.all(
        usuariosArr.map(async (usuario) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/usuario/${usuario.usuario_id}/historial`
            );
            if (!res.ok) return { id: String(usuario.usuario_id), puntos: [] };
            const data = await res.json();
            const puntos = (Array.isArray(data) ? data : [])
              .filter((p) => p.latitud && p.longitud)
              .map((p) => ({
                latitud: parseFloat(p.latitud),
                longitud: parseFloat(p.longitud),
                ts: new Date(p.timestamp).getTime(),
              }))
              .filter((p) => !isNaN(p.ts))
              .sort((a, b) => a.ts - b.ts);
            return { id: String(usuario.usuario_id), puntos };
          } catch {
            return { id: String(usuario.usuario_id), puntos: [] };
          }
        })
      );
      const mapa = {};
      resultado.forEach((r) => {
        mapa[r.id] = r.puntos;
      });
      setHistoriales(mapa);
    } catch {
      setError('No se pudieron cargar los datos del reporte.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cargarBitacora = useCallback(async () => {
    setCargandoBitacora(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      if (desdeBitacora) params.set('desde', `${desdeBitacora}T00:00:00`);
      if (hastaBitacora) params.set('hasta', `${hastaBitacora}T23:59:59`);
      params.set('limite', '500');
      const res = await fetch(`${API_BASE_URL}/bitacora?${params.toString()}`);
      const data = await res.json();
      setBitacora(Array.isArray(data) ? data : []);
      setPaginaBitacora(1);
    } catch {
      setBitacora([]);
    } finally {
      setCargandoBitacora(false);
    }
  }, [filtroTipo, filtroUsuario, desdeBitacora, hastaBitacora]);

  useEffect(() => {
    cargarBitacora();
  }, [cargarBitacora]);

  // --- Reporte 1: Resumen de sedes por tipo ---
  const resumenSedes = useMemo(() => {
    const porTipo = {};
    sedes.forEach((s) => {
      porTipo[s.tipo] = (porTipo[s.tipo] || 0) + 1;
    });
    const tipos = Object.entries(porTipo)
      .map(([tipo, n]) => ({ tipo, n }))
      .sort((a, b) => b.n - a.n);
    return { total: sedes.length, tipos };
  }, [sedes]);

  const sedesFiltradas = useMemo(() => {
    const q = busquedaSede.trim().toLowerCase();
    if (!q) return sedes;
    return sedes.filter((s) =>
      [s.tipo, s.nombre, s.direccion].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [sedes, busquedaSede]);

  const FILAS_POR_PAGINA = 50;
  const totalPaginasSedes = Math.max(
    1,
    Math.ceil(sedesFiltradas.length / FILAS_POR_PAGINA)
  );
  const paginaSedesActual = Math.min(paginaSedes, totalPaginasSedes);
  const sedesPaginadas = sedesFiltradas.slice(
    (paginaSedesActual - 1) * FILAS_POR_PAGINA,
    paginaSedesActual * FILAS_POR_PAGINA
  );

  // --- Reporte 2: Técnicos con última ubicación ---
  const tecnicosUltimaUbicacion = useMemo(() => {
    return usuarios
      .map((u) => {
        const ultimo = (historiales[u.usuario_id] || [])[
          (historiales[u.usuario_id] || []).length - 1
        ];
        return {
          Técnico: u.nombreCompleto || `Usuario ${u.usuario_id}`,
          Latitud: ultimo ? ultimo.latitud.toFixed(5) : '-',
          Longitud: ultimo ? ultimo.longitud.toFixed(5) : '-',
          Fecha: ultimo ? fmtFecha(ultimo.ts) : 'Sin registro',
          Hora: ultimo ? fmtHora(ultimo.ts) : '-',
        };
      })
      .sort((a, b) => {
        if (a.Fecha === 'Sin registro') return 1;
        if (b.Fecha === 'Sin registro') return -1;
        return 0;
      });
  }, [usuarios, historiales]);

  // --- Reporte 3: Actividad por técnico/día ---
  const actividadPorDia = useMemo(() => {
    const desde = inicioDelDia(new Date(`${desdeActividad}T00:00:00`));
    const hasta = finDelDia(new Date(`${hastaActividad}T00:00:00`));
    const filas = [];
    usuarios.forEach((u) => {
      const porDia = {};
      (historiales[u.usuario_id] || []).forEach((p) => {
        if (p.ts >= desde && p.ts < hasta) {
          const dia = fmtFecha(p.ts);
          porDia[dia] = (porDia[dia] || 0) + 1;
        }
      });
      Object.entries(porDia).forEach(([dia, cantidad]) => {
        filas.push({
          Técnico: u.nombreCompleto || `Usuario ${u.usuario_id}`,
          Día: dia,
          'N° registros': cantidad,
        });
      });
    });
    filas.sort((a, b) =>
      a.Técnico.localeCompare(b.Técnico) || a.Día.localeCompare(b.Día)
    );
    return filas;
  }, [usuarios, historiales, desdeActividad, hastaActividad]);

  // --- Reporte 4: Distancia recorrida por día ---
  const distanciaPorDia = useMemo(() => {
    const desde = inicioDelDia(new Date(`${diaDistancia}T00:00:00`));
    const hasta = finDelDia(new Date(`${diaDistancia}T00:00:00`));
    const GAP_MAX = 10 * 60 * 1000;
    return usuarios
      .map((u) => {
        const puntosDia = (historiales[u.usuario_id] || [])
          .filter((p) => p.ts >= desde && p.ts < hasta)
          .sort((a, b) => a.ts - b.ts);
        let total = 0;
        let tiempoActivoMs = 0;
        for (let i = 1; i < puntosDia.length; i++) {
          const d = haversineKm(puntosDia[i - 1], puntosDia[i]);
          const dt = puntosDia[i].ts - puntosDia[i - 1].ts;
          total += d;
          if (dt >= 0 && dt <= GAP_MAX) tiempoActivoMs += dt;
        }
        const horas = tiempoActivoMs / 3600000;
        const vel = total > 0 && horas > 0 ? (total / horas).toFixed(1) : '-';
        return {
          Técnico: u.nombreCompleto || `Usuario ${u.usuario_id}`,
          'Distancia (km)': total > 0 ? total.toFixed(2) : '-',
          'Vel. promedio (km/h)': vel,
          'Puntos GPS': puntosDia.length,
        };
      })
      .filter((r) => r['Puntos GPS'] > 0)
      .sort((a, b) => {
        const da = parseFloat(a['Distancia (km)']) || 0;
        const db = parseFloat(b['Distancia (km)']) || 0;
        return db - da;
      });
  }, [usuarios, historiales, diaDistancia]);

  // --- Reporte 5: Técnicos sin actividad ---
  const tecnicosSinActividad = useMemo(() => {
    const desde = inicioDelDia(new Date()) - diasInactivos * 24 * 60 * 60 * 1000;
    return usuarios
      .filter((u) => {
        const ultimo = (historiales[u.usuario_id] || [])[
          (historiales[u.usuario_id] || []).length - 1
        ];
        return !ultimo || ultimo.ts < desde;
      })
      .map((u) => ({
        Técnico: u.nombreCompleto || `Usuario ${u.usuario_id}`,
        'Última fecha': (() => {
          const ultimo = (historiales[u.usuario_id] || [])[
            (historiales[u.usuario_id] || []).length - 1
          ];
          return ultimo ? fmtFechaHora(ultimo.ts) : 'Sin registros';
        })(),
      }));
  }, [usuarios, historiales, diasInactivos]);

  // --- Bitácora GPS de técnicos ---
  const bitacoraGPS = useMemo(() => {
    const filas = [];
    usuarios.forEach((u) => {
      const porDia = {};
      (historiales[u.usuario_id] || []).forEach((p) => {
        const dia = fmtFecha(p.ts);
        if (!porDia[dia]) {
          porDia[dia] = { conteo: 0, primera: p.ts, ultima: p.ts };
        }
        porDia[dia].conteo += 1;
        if (p.ts < porDia[dia].primera) porDia[dia].primera = p.ts;
        if (p.ts > porDia[dia].ultima) porDia[dia].ultima = p.ts;
      });
      Object.entries(porDia).forEach(([dia, info]) => {
        filas.push({
          Fecha: dia,
          Técnico: u.nombreCompleto || `Usuario ${u.usuario_id}`,
          'N° ubicaciones': info.conteo,
          'Primera hora': fmtHora(info.primera),
          'Última hora': fmtHora(info.ultima),
        });
      });
    });
    filas.sort((a, b) => b.Fecha.localeCompare(a.Fecha));
    return filas;
  }, [usuarios, historiales]);

  const bitacoraFilas = bitacora.map((b) => ({
    Fecha: new Date(b.fecha).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    Tipo: b.tipo,
    Descripción: b.descripcion,
    Usuario: b.usuario || '-',
  }));

  const FILAS_BITACORA_POR_PAGINA = 20;
  const totalPaginasBitacora = Math.max(
    1,
    Math.ceil(bitacoraFilas.length / FILAS_BITACORA_POR_PAGINA)
  );
  const paginaBitacoraActual = Math.min(paginaBitacora, totalPaginasBitacora);
  const bitacoraFilasPaginadas = bitacoraFilas.slice(
    (paginaBitacoraActual - 1) * FILAS_BITACORA_POR_PAGINA,
    paginaBitacoraActual * FILAS_BITACORA_POR_PAGINA
  );

  return (
    <div className="reportes-container">
      <div className="reportes-tabs">
        <button
          className={`reportes-tab ${tab === 'reportes' ? 'active' : ''}`}
          onClick={() => setTab('reportes')}
        >
          Reportes
        </button>
        <button
          className={`reportes-tab ${tab === 'bitacora' ? 'active' : ''}`}
          onClick={() => setTab('bitacora')}
        >
          Bitácora
        </button>
      </div>

      {error && <p className="reportes-error">{error}</p>}

      {tab === 'reportes' && (
        <div className="reportes-grid">
          {cargando && <p className="reportes-msg">Cargando datos...</p>}

          {!cargando && (
            <>
              {/* Reporte 1 */}
              <section className="reporte-card">
                <h3>Resumen de sedes por tipo</h3>
                <div className="reporte-kpis">
                  <div className="reporte-kpi">
                    <span className="kpi-valor">{resumenSedes.total}</span>
                    <span className="kpi-label">Total sedes</span>
                  </div>
                </div>
                {resumenSedes.total > 0 && (
                  <div className="reporte-barras">
                    {resumenSedes.tipos
                      .slice(0, verTodosTipos ? resumenSedes.tipos.length : 8)
                      .map(({ tipo, n }) => (
                        <div key={tipo} className="reporte-barra-row">
                          <span className="reporte-barra-label">
                            {tipo}
                            <em>
                              {n} ({((n / resumenSedes.total) * 100).toFixed(1)}%)
                            </em>
                          </span>
                          <div className="reporte-barra">
                            <div
                              className="reporte-barra-fill"
                              style={{
                                width: `${(n / resumenSedes.tipos[0].n) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    {resumenSedes.tipos.length > 8 && (
                      <button
                        className="reporte-descargar"
                        onClick={() => setVerTodosTipos((v) => !v)}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {verTodosTipos ? 'Ver menos' : 'Ver todos'}
                      </button>
                    )}
                  </div>
                )}
                <div className="reporte-filtros">
                  <label>
                    Buscar:
                    <input
                      type="text"
                      value={busquedaSede}
                      onChange={(e) => {
                        setBusquedaSede(e.target.value);
                        setPaginaSedes(1);
                      }}
                      placeholder="Tipo, nombre o dirección"
                    />
                  </label>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nombre</th>
                      <th>Dirección</th>
                      <th>Latitud</th>
                      <th>Longitud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sedesPaginadas.length === 0 && (
                      <tr>
                        <td colSpan="5" className="reporte-table--vacio">
                          Sin sedes que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                    {sedesPaginadas.map((s) => (
                      <tr key={s.sede_id}>
                        <td>{s.tipo}</td>
                        <td>{s.nombre}</td>
                        <td>{s.direccion}</td>
                        <td>{s.latitud}</td>
                        <td>{s.longitud}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="reporte-paginacion">
                  <button
                    className="reporte-descargar"
                    disabled={paginaSedesActual <= 1}
                    onClick={() => setPaginaSedes(paginaSedesActual - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {paginaSedesActual} de {totalPaginasSedes} (
                    {sedesFiltradas.length} sedes)
                  </span>
                  <button
                    className="reporte-descargar"
                    disabled={paginaSedesActual >= totalPaginasSedes}
                    onClick={() => setPaginaSedes(paginaSedesActual + 1)}
                  >
                    Siguiente
                  </button>
                </div>
                <button
                  className="reporte-descargar"
                  onClick={() =>
                    descargarCSV('resumen_sedes', sedes.map((s) => ({
                      Tipo: s.tipo,
                      Nombre: s.nombre,
                      Dirección: s.direccion,
                      Latitud: s.latitud,
                      Longitud: s.longitud,
                    })))
                  }
                >
                  Descargar CSV
                </button>
              </section>

              {/* Reporte 2 */}
              <section className="reporte-card">
                <h3>Técnicos con última ubicación</h3>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Latitud</th>
                      <th>Longitud</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tecnicosUltimaUbicacion.map((fila, i) => (
                      <tr key={i}>
                        <td>{fila.Técnico}</td>
                        <td>{fila.Latitud}</td>
                        <td>{fila.Longitud}</td>
                        <td>{fila.Fecha}</td>
                        <td>{fila.Hora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="reporte-descargar"
                  onClick={() =>
                    descargarCSV('tecnicos_ultima_ubicacion', tecnicosUltimaUbicacion)
                  }
                >
                  Descargar CSV
                </button>
              </section>

              {/* Reporte 3 */}
              <section className="reporte-card">
                <h3>Actividad por técnico/día</h3>
                <div className="reporte-filtros">
                  <label>
                    Desde:
                    <input
                      type="date"
                      value={desdeActividad}
                      onChange={(e) => setDesdeActividad(e.target.value)}
                    />
                  </label>
                  <label>
                    Hasta:
                    <input
                      type="date"
                      value={hastaActividad}
                      onChange={(e) => setHastaActividad(e.target.value)}
                    />
                  </label>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Día</th>
                      <th>N° registros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividadPorDia.length === 0 && (
                      <tr>
                        <td colSpan="3">Sin registros en el rango seleccionado.</td>
                      </tr>
                    )}
                    {actividadPorDia.map((fila, i) => (
                      <tr key={i}>
                        <td>{fila.Técnico}</td>
                        <td>{fila.Día}</td>
                        <td>{fila['N° registros']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="reporte-descargar"
                  onClick={() => descargarCSV('actividad_tecnico_dia', actividadPorDia)}
                >
                  Descargar CSV
                </button>
              </section>

              {/* Reporte 4 */}
              <section className="reporte-card">
                <h3>Distancia y velocidad promedio por día</h3>
                <div className="reporte-filtros">
                  <label>
                    Día:
                    <input
                      type="date"
                      value={diaDistancia}
                      onChange={(e) => setDiaDistancia(e.target.value)}
                    />
                  </label>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Distancia (km)</th>
                      <th>Vel. promedio (km/h)</th>
                      <th>Puntos GPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distanciaPorDia.length === 0 && (
                      <tr>
                        <td colSpan="4">
                          Sin registros de ubicación en el día seleccionado.
                        </td>
                      </tr>
                    )}
                    {distanciaPorDia.map((fila, i) => (
                      <tr key={i}>
                        <td>{fila.Técnico}</td>
                        <td>{fila['Distancia (km)']}</td>
                        <td>{fila['Vel. promedio (km/h)']}</td>
                        <td>{fila['Puntos GPS']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="reporte-descargar"
                  onClick={() => descargarCSV('distancia_recorrida', distanciaPorDia)}
                >
                  Descargar CSV
                </button>
              </section>

              {/* Reporte 5 */}
              <section className="reporte-card">
                <h3>Técnicos sin actividad</h3>
                <div className="reporte-filtros">
                  <label>
                    Sin actividad en últimos:
                    <select
                      value={diasInactivos}
                      onChange={(e) => setDiasInactivos(Number(e.target.value))}
                    >
                      <option value={1}>1 día</option>
                      <option value={3}>3 días</option>
                      <option value={5}>5 días</option>
                      <option value={7}>7 días</option>
                      <option value={10}>10 días</option>
                      <option value={15}>15 días</option>
                    </select>
                  </label>
                </div>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Última fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tecnicosSinActividad.length === 0 && (
                      <tr>
                        <td colSpan="2">
                          Todos los técnicos tienen actividad reciente.
                        </td>
                      </tr>
                    )}
                    {tecnicosSinActividad.map((fila, i) => (
                      <tr key={i}>
                        <td>{fila.Técnico}</td>
                        <td>{fila['Última fecha']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="reporte-descargar"
                  onClick={() =>
                    descargarCSV('tecnicos_sin_actividad', tecnicosSinActividad)
                  }
                >
                  Descargar CSV
                </button>
              </section>
            </>
          )}
        </div>
      )}

      {tab === 'bitacora' && (
        <div className="reportes-grid">
          <section className="reporte-card">
            <h3>Bitácora administrativa</h3>
            <div className="reporte-filtros">
              <label>
                Tipo:
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="login">Inicio de sesión</option>
                  <option value="sede_creada">Sede creada</option>
                  <option value="sede_editada">Sede editada</option>
                  <option value="sede_eliminada">Sede eliminada</option>
                  <option value="usuario_creado">Técnico creado</option>
                  <option value="usuario_editado">Técnico editado</option>
                </select>
              </label>
              <label>
                Usuario:
                <input
                  type="text"
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  placeholder="Buscar usuario"
                />
              </label>
              <label>
                Desde:
                <input
                  type="date"
                  value={desdeBitacora}
                  onChange={(e) => setDesdeBitacora(e.target.value)}
                />
              </label>
              <label>
                Hasta:
                <input
                  type="date"
                  value={hastaBitacora}
                  onChange={(e) => setHastaBitacora(e.target.value)}
                />
              </label>
              <button
                className="reporte-descargar"
                onClick={cargarBitacora}
                disabled={cargandoBitacora}
              >
                {cargandoBitacora ? 'Cargando...' : 'Filtrar'}
              </button>
            </div>
            <table className="reporte-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {bitacoraFilas.length === 0 && (
                  <tr>
                    <td colSpan="4">Sin registros en la bitácora.</td>
                  </tr>
                )}
                {bitacoraFilasPaginadas.map((fila, i) => (
                  <tr key={i}>
                    <td>{fila.Fecha}</td>
                    <td>{fila.Tipo}</td>
                    <td>{fila.Descripción}</td>
                    <td>{fila.Usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="reporte-paginacion">
              <button
                className="reporte-descargar"
                disabled={paginaBitacoraActual <= 1}
                onClick={() => setPaginaBitacora(paginaBitacoraActual - 1)}
              >
                Anterior
              </button>
              <span>
                Página {paginaBitacoraActual} de {totalPaginasBitacora} (
                {bitacoraFilas.length} registros)
              </span>
              <button
                className="reporte-descargar"
                disabled={paginaBitacoraActual >= totalPaginasBitacora}
                onClick={() => setPaginaBitacora(paginaBitacoraActual + 1)}
              >
                Siguiente
              </button>
            </div>
            <button
              className="reporte-descargar"
              onClick={() => descargarCSV('bitacora_administrativa', bitacoraFilas)}
            >
              Descargar CSV
            </button>
          </section>

          <section className="reporte-card">
            <h3>Actividad GPS de técnicos</h3>
            {cargando && <p className="reportes-msg">Cargando datos...</p>}
            {!cargando && (
              <>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Técnico</th>
                      <th>N° ubicaciones</th>
                      <th>Primera hora</th>
                      <th>Última hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bitacoraGPS.length === 0 && (
                      <tr>
                        <td colSpan="5">Sin registros de ubicación.</td>
                      </tr>
                    )}
                    {bitacoraGPS.map((fila, i) => (
                      <tr key={i}>
                        <td>{fila.Fecha}</td>
                        <td>{fila.Técnico}</td>
                        <td>{fila['N° ubicaciones']}</td>
                        <td>{fila['Primera hora']}</td>
                        <td>{fila['Última hora']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="reporte-descargar"
                  onClick={() => descargarCSV('bitacora_gps_tecnicos', bitacoraGPS)}
                >
                  Descargar CSV
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Reportes;