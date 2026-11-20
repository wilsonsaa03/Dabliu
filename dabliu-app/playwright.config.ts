import { defineConfig } from '@playwright/test';

/**
 * Pruebas end-to-end contra el sistema real en desarrollo:
 *   docker compose up -d                          (PostgreSQL)
 *   SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run   (backend, en /backend)
 *   npm start                                     (esta app en http://localhost:4300)
 * Usa el Chrome instalado en el equipo (no descarga navegadores).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4300',
    channel: 'chrome',
    headless: true,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
});
