/**
 * Configuración de PRODUCCIÓN (ng build).
 * apiBaseUrl: dominio donde quede publicada la API de Spring Boot, sin "/" al final.
 *   - Vacío ('') = misma dirección que la página (si un proxy envía /api al backend).
 *   - Si la API vive en otro dominio, escríbelo aquí, p. ej. 'https://api.tu-dominio.co',
 *     y agrega el dominio de la página en CORS_ALLOWED_ORIGINS del backend.
 */
export const environment = {
  apiBaseUrl: '',
};
