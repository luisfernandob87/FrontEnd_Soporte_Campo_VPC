// Configuración de la API.
//
// Vite incrusta esta variable al compilar, así que el valor con el que se
// construye la app queda escrito dentro del bundle. Por eso la URL de desarrollo
// NUNCA debe ir en un archivo .env versionado: si se sube, la app en producción
// queda pidiendo datos a localhost y todas las llamadas fallan.
//
//   - Desarrollo:  .env.local  con VITE_API_BASE_URL=http://localhost:4000
//   - Producción:  definir VITE_API_BASE_URL en el panel de Render.
//   - Si no está definida, se usa la URL de producción de abajo.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://backend-soporte-campo-vpc.onrender.com';
