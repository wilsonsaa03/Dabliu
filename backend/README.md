# dabliu-api

API de DABLIU SOLUCIONES. Recibe las solicitudes del **Diagnóstico Tecnológico Gratuito** que llegan desde la landing (`dabliu-web`) y permite gestionarlas internamente.

Spring Boot 4.1 · Java 17 · PostgreSQL · Flyway · Spring Security (HTTP Basic para el administrador).

## Endpoints

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| POST | `/api/v1/diagnostic-requests` | Público (CORS + límite por IP) | Formulario de la landing. Responde **201** |
| GET | `/api/v1/admin/diagnostic-requests?status=NEW&page=0&size=20` | Admin | Listar solicitudes (más recientes primero) |
| GET | `/api/v1/admin/diagnostic-requests/{id}` | Admin | Ver una solicitud |
| PATCH | `/api/v1/admin/diagnostic-requests/{id}` | Admin | Cambiar estado y notas internas |
| DELETE | `/api/v1/admin/diagnostic-requests/{id}` | Admin | Borrar datos (derecho de supresión, Ley 1581) |
| GET | `/actuator/health` | Público | Monitoreo |

### POST /api/v1/diagnostic-requests

```json
{
  "fullName": "Ana Pérez",
  "company": "Transportes del Pacífico",
  "phone": "+57 315 000 0000",
  "email": "ana@ejemplo.co",
  "sector": "TRANSPORT_LOGISTICS",
  "budget": "FROM_5M_TO_15M",
  "need": "Llevamos los pedidos por WhatsApp y Excel y se nos pierden.",
  "dataConsent": true
}
```

- `sector`: `TRANSPORT_LOGISTICS` | `COMMERCE_SERVICES` | `AUTOMOTIVE_WORKSHOPS` | `OTHER`
- `budget`: `UNKNOWN` | `UNDER_5M` | `FROM_5M_TO_15M` | `FROM_15M_TO_40M` | `OVER_40M` (opcional, por defecto `UNKNOWN`)
- `company` y `email` son opcionales. `dataConsent` debe ser `true`.

Respuesta `201 Created` (sin datos personales):

```json
{ "id": "…uuid…", "status": "NEW", "createdAt": "2026-10-30T15:00:00Z" }
```

Errores en formato `application/problem+json`. Un 400 de validación incluye `errors` por campo:

```json
{ "title": "Datos inválidos", "status": 400, "errors": { "need": "Entre 15 y 1500 caracteres." } }
```

Si una misma IP supera el límite responde **429** con cabecera `Retry-After`.

### PATCH (seguimiento interno)

```json
{ "status": "CONTACTED", "internalNotes": "Agendado por WhatsApp para el jueves." }
```

Estados: `NEW` → `CONTACTED` → `SCHEDULED` → `COMPLETED`, o `DISCARDED`.

## Configuración (variables de entorno)

| Variable | Por defecto | Descripción |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/dabliu` | Conexión a PostgreSQL |
| `DB_USERNAME` | `postgres` | |
| `DB_PASSWORD` | — (obligatoria) | |
| `ADMIN_USERNAME` | `admin` | Usuario de los endpoints `/admin` |
| `ADMIN_PASSWORD` | — (obligatoria; en perfil `dev`: `dabliu-dev`) | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Dominios de la landing, separados por coma |
| `RATE_LIMIT_MAX` | `5` (`50` en `dev`) | Solicitudes públicas por IP en cada ventana |
| `RATE_LIMIT_WINDOW` | `10m` | Duración de la ventana |
| `FORWARD_HEADERS_STRATEGY` | `native` | Toma la IP real del visitante detrás de un proxy interno (necesario para el límite por IP) |
| `NOTIFY_EMAIL_TO` | vacío | Correo que recibe el aviso de cada solicitud nueva (vacío = sin aviso) |
| `NOTIFY_EMAIL_FROM` | vacío | Remitente del aviso (algunos SMTP lo exigen) |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | — | SMTP para el aviso (p. ej. Gmail con contraseña de aplicación, o el SMTP de tu dominio) |
| `PORT` | `8080` | |

## Ejecutar en local

1. Crear la base de datos (una sola vez). La tabla la crea Flyway al arrancar:

   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE dabliu;"
   ```

2. Arrancar con el perfil `dev`:

   ```powershell
   $env:DB_PASSWORD = "tu_password_de_postgres"
   $env:SPRING_PROFILES_ACTIVE = "dev"
   mvn spring-boot:run
   ```

3. Arrancar la landing (`dabliu-web`, `ng serve`). Ya apunta a `http://localhost:8080` en `src/app/core/api.ts`.

Ver las solicitudes (Postman o PowerShell):

```powershell
curl.exe -u admin:dabliu-dev http://localhost:8080/api/v1/admin/diagnostic-requests
```

## Pruebas

```powershell
mvn test
```

## Producción

- Definir `DB_PASSWORD`, `ADMIN_PASSWORD` (larga y única) y `CORS_ALLOWED_ORIGINS=https://tu-dominio` — sin perfil `dev`.
- Servir siempre detrás de HTTPS (HTTP Basic envía la contraseña en cada petición).
- Cambiar `API_BASE_URL` en `dabliu-web/src/app/core/api.ts` por la URL pública de la API.
- El límite por IP es en memoria: vale para una instancia. Si la API queda detrás de un proxy (Nginx, Render, Railway…), activar `server.forward-headers-strategy=native` para que use la IP real del visitante y no la del proxy.
