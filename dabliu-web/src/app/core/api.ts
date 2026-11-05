import { environment } from '../../environments/environment';

/**
 * URL base de la API de DABLIU (Spring Boot).
 * Se toma del archivo de entorno: src/environments/environment*.ts
 * Si la API falla, el formulario ofrece enviar la misma solicitud por WhatsApp.
 */
export const API_BASE_URL = environment.apiBaseUrl;
