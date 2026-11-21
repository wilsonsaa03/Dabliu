# dabliu-api

API de **DABLIU SaaS** (DABLIU SOLUCIONES). Monolito modular con Spring Boot.

- **Público:** recibe las solicitudes del Diagnóstico Tecnológico Gratuito desde la landing (`dabliu-web`).
- **Privado:** usuarios, roles y permisos, sesiones seguras, auditoría, panel y bandeja de solicitudes, que usa la app privada (`dabliu-app`).

Spring Boot 4.1 · Java 17 · PostgreSQL · Flyway · Spring Security (JWT en cookies HttpOnly) · springdoc-openapi.

## Módulos

| Paquete | Contenido |
|---|---|
| `auth` | Login, renovación con rotación de refresh tokens, sesiones por dispositivo, contraseña, invitaciones, historial de acceso |
| `users` | Usuarios, roles y permisos; reglas de protección del superadministrador |
| `audit` | Bitácora de actividad (quién hizo qué) |
| `dashboard` | Indicadores con datos reales, filtrados por permiso |
| `diagnostic` | Formulario público de la landing y bandeja interna |
| `common`, `config` | Errores (RFC 9457), seguridad, CORS, límites por IP, OpenAPI |

## Seguridad (resumen)

- **Sesión:** JWT de acceso (15 min) en la cookie `dabliu_at` y refresh token rotativo (14 días) en `dabliu_rt` (HttpOnly, Secure, SameSite). Nada en localStorage.
  - Si un refresh token ya usado vuelve a aparecer, se cierra toda esa sesión, porque puede tratarse de un robo.
- **Permisos:** roles y permisos en la base de datos, verificados en cada endpoint con `@PreAuthorize`. Los roles y la desactivación se leen en cada solicitud, así que aplican de inmediato.
- **CSRF:** activo para la app (cookie `XSRF-TOKEN` + encabezado `X-XSRF-TOKEN`).
  - Se usa un filtro JWT propio a propósito: el soporte `oauth2ResourceServer` de Spring desactiva CSRF ante cualquier token, incluido el de la cookie.
  - Exentos: el formulario público y las herramientas que envían `Authorization: Bearer`.
- **Contraseñas:** BCrypt, mínimo 10 caracteres con letras y números, y bloqueo temporal tras 5 intentos fallidos.
- **Respuestas que no revelan correos registrados:** el login y la recuperación responden igual exista o no el correo.
- **Límites por IP:** en el formulario público y en las rutas de autenticación.
- **Errores:** nunca muestran trazas. Siempre usan el formato `application/problem+json` con mensajes en español.

## Ejecutar en local (desarrollo)

```powershell
# 1. Base de datos (desde la raíz del repositorio)
docker compose up -d            # PostgreSQL en localhost:5434

# 2. API con el perfil dev
cd backend
$env:SPRING_PROFILES_ACTIVE = "dev"
./mvnw spring-boot:run
```

El perfil `dev`:
- Crea el primer superadministrador `admin@dabliu.local` con la contraseña `dabliu-dev-2026`.
- Activa Swagger en <http://localhost:8080/swagger-ui.html>.
- Escribe en el log los enlaces de invitación y recuperación, porque en desarrollo no hay correo.

**Esos valores son solo para desarrollo.**

## Pruebas

```powershell
./mvnw test     # requiere Docker encendido (Testcontainers levanta PostgreSQL real)
```

Hay 44 pruebas:
- **Flujos de sesión:** rotación, reutilización, bloqueo y CSRF.
- **Permisos por rol** y reglas del superadministrador.
- **Invitaciones** y recuperación de contraseña.
- **Panel** y formulario público.

## Endpoints principales (`/api/v1`)

La documentación completa (OpenAPI) está en `/swagger-ui.html` cuando `API_DOCS_ENABLED=true`.

| Método y ruta | Acceso |
|---|---|
| `POST /diagnostic-requests` | Público (formulario de la landing) |
| `GET /auth/csrf` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` | Público (con CSRF) |
| `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/accept-invitation` · `GET /auth/link-info` | Público (con CSRF) |
| `GET /auth/me` · `GET/DELETE /auth/sessions` · `POST /auth/change-password` | Con sesión |
| `GET/PATCH /users/me` · `GET /users/me/access-log` | Con sesión |
| `GET /users` · `GET /users/{id}` | `users.read` |
| `POST /users` · `PATCH /users/{id}` · `PUT /users/{id}/roles` · `PATCH /users/{id}/status` · `POST /users/{id}/invitation` | `users.manage` |
| `GET /roles` | `roles.read` o `users.manage` |
| `GET /users/{id}/access-log` · `GET /audit/activity` · `GET /audit/access` | `audit.read` |
| `GET /dashboard/summary?from&to` | `dashboard.read` |
| `GET /admin/diagnostic-requests` · `GET /admin/diagnostic-requests/{id}` | `diagnostics.read` |
| `PATCH /admin/diagnostic-requests/{id}` · `DELETE /admin/diagnostic-requests/{id}` | `diagnostics.manage` |

## Configuración (variables de entorno)

| Variable | Por defecto | Descripción |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | `…localhost:5432/dabliu`, `postgres`, obligatoria | PostgreSQL |
| `JWT_SECRET` | **obligatoria** | Clave HMAC en Base64 de al menos 32 bytes: `openssl rand -base64 48` |
| `APP_URL` | `http://localhost:4301` | Dirección de `dabliu-app` (para los enlaces de los correos) |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | vacío | Primer superadministrador (solo si no hay usuarios). Después de crearlo, quita la contraseña del entorno |
| `AUTH_SECURE_COOKIES` | `true` | `false` solo en desarrollo por http |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | `15m` / `14d` | Duración de la sesión |
| `AUTH_MAX_FAILED_ATTEMPTS` / `AUTH_LOCK_DURATION` | `5` / `15m` | Bloqueo por intentos fallidos |
| `INVITATION_TTL` / `PASSWORD_RESET_TTL` | `72h` / `30m` | Vigencia de los enlaces |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Dominios de la landing (formulario público) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `5` / `10m` | Formulario público por IP |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW` | `20` / `10m` | Login y recuperación por IP |
| `API_DOCS_ENABLED` | `false` | Swagger/OpenAPI |
| `FORWARD_HEADERS_STRATEGY` | `native` | IP real detrás de un proxy interno |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | — | SMTP para invitaciones, recuperación y avisos |
| `NOTIFY_EMAIL_TO` / `NOTIFY_EMAIL_FROM` | vacío | Aviso de solicitudes nuevas y remitente de los correos |
| `PORT` | `8080` | |

## Producción

1. **Variables:** define `DB_*`, `JWT_SECRET`, `APP_URL`, `CORS_ALLOWED_ORIGINS`, el SMTP y, la primera vez, `BOOTSTRAP_ADMIN_*`, sin el perfil `dev`.
2. **Mismo dominio para la app y la API:** sirve `dabliu-app` y la API bajo el mismo dominio, con un proxy que envíe `/api` a este servicio (p. ej. `app.dabliu.co/api`). Así las cookies son de primera parte y CSRF funciona.
3. **HTTPS siempre:** las cookies llevan `Secure`.
4. **Límite por IP:** es en memoria, así que vale para una sola instancia. Con varias instancias hay que moverlo al proxy o a Redis.
