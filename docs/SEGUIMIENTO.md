# DABLIU SaaS · Seguimiento del desarrollo

Archivo vivo: se actualiza al cerrar cada fase. Una funcionalidad aparece como **hecha** solo si está implementada, probada y verificada.

## Estado por fase

| Fase | Estado | Fecha |
|---|---|---|
| 0 · Cierre del sitio público (política de datos, SEO) | ✅ Hecha y publicada | 2026-11-20 |
| 1 · Fundamentos (identidad, sesiones, roles, auditoría, panel) | ✅ Hecha (local, sin desplegar) | 2026-11-20 |
| 2 · CRM | ⏳ Siguiente | — |
| 3 · Clientes, proyectos y tareas | Pendiente | — |
| 4 · Portal del cliente | Pendiente (necesita dominio propio) | — |
| 5 · Propuestas y contratos | Pendiente | — |
| 6 · Finanzas y soporte | Pendiente | — |
| 7 · Automatizaciones e integraciones | Pendiente (necesita credenciales) | — |
| 8 · Producción | Pendiente (necesita hosting) | — |

## Arquitectura

- **Repositorio único:**
  - `dabliu-web`: sitio público, Angular con prerender, en Vercel.
  - `dabliu-app`: app privada, Angular.
  - `backend`: API, monolito modular con Spring Boot.
  - `docker-compose.yml`: PostgreSQL de desarrollo.
- **La app y la API van bajo el mismo dominio** (proxy `/api`). Así las cookies son de primera parte y CSRF funciona.
- **Sesión:** JWT de acceso de 15 minutos y refresh rotativo, ambos en cookies HttpOnly. Los permisos se cargan desde la base de datos en cada solicitud.
- **Paquete del backend:** se conservó `co.dabliu.api`. Renombrarlo a `co.dabliu.saas` costaba tiempo y no aportaba nada.

## Fase 1: lo implementado

**Backend**
- Migraciones:
  - **V2:** `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, con los 6 roles y 8 permisos iniciales.
  - **V3:** `refresh_tokens`, `user_tokens`, `access_log`, `activity_logs`.
- Autenticación:
  - Login, renovación con rotación y detección de reutilización, cierre de sesión.
  - Sesiones por dispositivo, con opción de cerrarlas.
  - Bloqueo tras 5 intentos fallidos.
- Contraseña: cambio (cierra las demás sesiones), recuperación por enlace e invitación con activación y verificación del correo.
- Usuarios:
  - Invitar, editar, asignar roles, activar y desactivar (desactivar cierra sus sesiones).
  - Búsqueda con filtros y paginación.
  - Reglas: solo un SUPER_ADMIN gestiona a otro SUPER_ADMIN, nadie se desactiva a sí mismo y siempre queda un SUPER_ADMIN activo.
- Auditoría: bitácora de actividad e historial de acceso.
- Panel: indicadores reales (solicitudes por día y por estado, variación frente al periodo anterior, usuarios, actividad), filtrados por permiso.
- Bandeja de diagnósticos protegida por permisos. El formulario público de la landing no cambió.
- Infraestructura: OpenAPI/Swagger (apagado en producción), límites por IP en la autenticación y primer administrador creado desde variables de entorno.

**Frontend (`dabliu-app`)**
- Pantallas públicas: login, recuperar contraseña, activar cuenta y restablecer contraseña.
- Layout: barra lateral filtrada por permisos, cajón en celular, modo oscuro (predeterminado) y claro.
- Módulos: panel con gráfico propio, solicitudes web (filtros en la URL y panel de seguimiento), usuarios (lista, invitación y detalle con roles, estado e historial de acceso), auditoría y mi perfil (datos, contraseña, sesiones e historial).
- Piezas comunes: avisos, confirmaciones, estados vacíos, esqueletos de carga, paginación y páginas de error y de "sin permiso".

## Pruebas ejecutadas (2026-11-20)

| Conjunto | Resultado |
|---|---|
| Backend: `./mvnw test` (Testcontainers + PostgreSQL 17) | 44 de 44 ✅ |
| Frontend: unitarias (`ng test`, Chrome headless) | 6 de 6 ✅ |
| End-to-end: Playwright contra el sistema real (API dev + app) | 6 de 6 ✅ |

Lo que cubren las pruebas end-to-end:
- Redirección al login.
- Error de credenciales.
- Gestión de una solicitud llegada desde la landing.
- Invitación y activación de un usuario, con la comprobación de que no ve Usuarios ni en la interfaz ni en la API (403).
- Cambio de contraseña y cierre de sesión.
- Vista en celular sin desbordamiento.

## Problemas encontrados y resueltos

- **El soporte JWT de Spring desactivaba CSRF** para las sesiones por cookie. Lo detectó una prueba: una escritura sin token devolvía 201. Se reemplazó por un filtro propio.
- **Columnas `CHAR(64)` incompatibles** con la validación de Hibernate. Se cambiaron a `VARCHAR(64)` antes de aplicar la migración en ningún ambiente.
- **La bitácora mostraba los estados en inglés** ("CONTACTED"). Ahora guarda la etiqueta en español. Los registros anteriores no se tocan, porque la bitácora es inmutable.

## Pendientes y decisiones abiertas

- **Hosting** del backend y de la base de datos, y **dominio propio**. El usuario los contratará; el portal de clientes (fase 4) depende del dominio.
- **Correo SMTP** para invitaciones y recuperación. Sin él, en producción no salen los enlaces.
- **El formulario de la landing sigue sin funcionar en producción** hasta publicar la API.
- **Foto de perfil:** se implementará con el módulo de documentos (fase 3), que trae el almacenamiento privado de archivos.
- **CI en GitHub Actions:** se agrega en la fase 8, junto con los Dockerfile de producción.

## Riesgos

- **Límite por IP en memoria:** vale para una sola instancia. Con varias, hay que moverlo al proxy o a Redis.
- **Clave de desarrollo pública:** `application-dev.yml` incluye una clave JWT y una contraseña de desarrollo a propósito. Nunca deben usarse en producción.
- **Costos recurrentes** (hosting, base de datos, correo, almacenamiento) a definir antes de la fase 8.

## Próximas tareas (fase 2: CRM)

1. Migración V4: `companies`, `contacts`, `leads` (con origen WEB_FORM), `opportunities`, `interactions` y `activities`, más los permisos `crm.*`.
2. Que las solicitudes web creen un prospecto de forma automática (evento de dominio), sin cambiar el formulario público.
3. Embudo Kanban con historial de cambios de etapa, seguimientos y recordatorios.
4. Conversión de prospecto en cliente, a prueba de duplicados y conservando el historial.
