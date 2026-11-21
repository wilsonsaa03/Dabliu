# dabliu-app

Aplicación privada de **DABLIU SaaS**: panel administrativo (y, en fases siguientes, colaboradores y portal de clientes).

Angular 20 (standalone, carga diferida por módulo) · Tailwind CSS v4 · Lucide · Reactive Forms.

## Desarrollo

```powershell
# Requiere la API en marcha (ver backend/README.md): docker compose up -d  +  backend con perfil dev
npm install
npm start          # http://localhost:4301  (el proxy envía /api a http://localhost:8080)
```

Primer usuario en desarrollo: `admin@dabliu.local` / `dabliu-dev-2026`.

## Cómo funciona la sesión

- **Cookies:** la API guarda la sesión en cookies HttpOnly. Esta app nunca ve ni guarda tokens (nada en localStorage).
- **Arranque:** al iniciar pide `GET /api/v1/auth/csrf` (cookie `XSRF-TOKEN`). Angular la copia sola al encabezado `X-XSRF-TOKEN` en cada escritura.
- **Renovación:** si una solicitud responde 401 porque venció el token de acceso, el interceptor renueva la sesión una vez y repite la solicitud.
- **Permisos:** los guards y el menú usan los permisos del usuario solo para mostrar u ocultar opciones. **El backend vuelve a verificar todo.**
- **Mismo dominio:** la app llama siempre a `/api` relativo, así que en producción hay que servir la app y la API bajo el mismo dominio, con un proxy de `/api` hacia la API.

## Estructura

```
src/app/
  core/       sesión (auth), guards, interceptor, layout (barra lateral), servicios de API, modelos, textos
  shared/     componentes reutilizables (avisos, confirmación, paginación, estados vacíos, contraseña)
  features/   auth · dashboard · diagnostics · users · audit · profile · errors
```

## Pruebas

```powershell
npm test -- --watch=false --browsers=ChromeHeadless   # unitarias (guards, reglas de contraseña, textos)

# End-to-end contra el sistema real (API con perfil dev en marcha + npm start):
$env:BACKEND_LOG = "ruta\al\log\del\backend"   # para leer el enlace de invitación (en dev no hay correo)
npx playwright test                             # usa el Chrome instalado; capturas en e2e/screenshots
```

## Compilar

```powershell
npm run build      # dist/dabliu-app/browser
```
