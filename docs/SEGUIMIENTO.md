# DABLIU SaaS · Seguimiento del desarrollo

Archivo vivo: se actualiza al cerrar cada fase. Una funcionalidad aparece como **hecha** solo si está implementada, probada y verificada.

## Estado por fase

| Fase | Estado | Fecha |
|---|---|---|
| 0 · Cierre del sitio público (política de datos, SEO) | ✅ Hecha y publicada | 2026-11-20 |
| 1 · Fundamentos (identidad, sesiones, roles, auditoría, panel) | ✅ Hecha (local, sin desplegar) | 2026-11-20 |
| 2 · CRM | ✅ Hecha (local, sin desplegar) | 2026-11-21 |
| 3 · Clientes, proyectos y tareas | ⏳ Siguiente | — |
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

## Fase 2: lo implementado

**Decisión de modelo:** el prospecto y la oportunidad son una sola entidad (`leads`), con su etapa en el embudo. Con dos tablas habría que duplicar datos y sincronizarlos, y el documento pide no crear tablas sin necesidad. Un cliente puede tener varias oportunidades ganadas (ventas repetidas).

**Backend**
- Migración V4:
  - Tablas `companies`, `contacts`, `clients`, `leads`, `lead_stage_changes`, `interactions` y `activities`.
  - Permisos `crm.read`, `crm.write`, `crm.assign`, `crm.archive`, `crm.convert`, `clients.read` y `clients.manage`.
  - Importó a `leads` las solicitudes web existentes; en la base de desarrollo fueron 4 de 4.
- **Cada solicitud del formulario público crea su prospecto** en la misma transacción. Es idempotente: una misma solicitud nunca genera dos prospectos.
- **Etapas:** cada cambio queda en el historial, y marcar una oportunidad como perdida exige el motivo. Un prospecto convertido ya no cambia de etapa.
- **Responsables:** cualquier comercial puede tomar un prospecto para sí; asignarlo a otra persona exige `crm.assign`, y solo a usuarios internos activos.
- **Seguimiento:** interacciones (llamada, WhatsApp, correo, reunión, nota) y actividades con fecha límite y marca de vencidas.
- **Conversión a cliente:** en una transacción con bloqueo de fila.
  - Crea o reutiliza la empresa y el contacto.
  - Crea el cliente, o reutiliza el de la empresa si ya existía.
  - Rechaza una segunda conversión con 409 y conserva el prospecto.
- **Supresión de datos:** borrar una solicitud web borra también su prospecto, salvo que ya sea cliente (en ese caso responde 422).
- **Panel:** bloque CRM con prospectos nuevos, oportunidades abiertas y su valor, ganadas y perdidas, embudo por etapa y mis actividades.

**Frontend**
- **Prospectos:** tablero Kanban con arrastre (Angular CDK, también en pantallas táctiles); el cambio se guarda al instante y se revierte si la API falla. También vista de lista, búsqueda y filtro Míos / Sin asignar.
- **Detalle del prospecto:** historial unificado, registro de interacciones, actividades, cambio de etapa y de responsable, conversión y archivo.
- **Otras pantallas:** actividades (pendientes, vencidas, completadas; mías o de todos), empresas con su detalle de contactos y oportunidades, contactos y clientes (solo consulta).
- **Dependencia nueva:** `@angular/cdk` 20.2.14, para el arrastre accesible con mouse y táctil.

## Pruebas ejecutadas (2026-11-21)

| Conjunto | Resultado |
|---|---|
| Backend: `./mvnw test` (Testcontainers + PostgreSQL 17) | 56 de 56 ✅ (12 nuevas del CRM) |
| Frontend: unitarias | 9 de 9 ✅ |
| End-to-end (Playwright, sistema real) | 10 de 10 ✅ (fases 1 y 2) |

## Problemas encontrados y resueltos en la fase 2

- **Error de diseño atrapado por una prueba:** `leads.client_id` estaba como único, y eso impedía una segunda venta a un cliente existente. Se corrigió antes de aplicar la migración en ningún ambiente.
- **Historial desordenado en cambios simultáneos:** dos cambios de etapa en el mismo instante (por ejemplo, al convertir) quedaban en orden aleatorio. Se agregó la columna `seq` (IDENTITY) para desempatar.
- **Error 500 en la lista de prospectos sin responsable:** `Map.of().get(null)` lanzaba NullPointerException con los prospectos del formulario web.
- **Entidades anidadas:** Hibernate las nombraba `LeadHistory$Activity`; ahora tienen nombre explícito.
- **Selectores mal inicializados:** cuando las opciones llegaban de forma asíncrona, el selector no mostraba el valor guardado. Se usa `[selected]` por opción.
- **Puertos en conflicto con el proyecto ARABIAN OUD:** la base de desarrollo pasó al 5434 y la app al 4301.

## Próximas tareas (fase 3: clientes, proyectos y tareas)

1. Expediente completo del cliente: edición, estados, notas internas y vista 360.
2. Proyectos vinculados a clientes: equipo, etapas, tareas y subtareas, prioridades, fechas y avance calculado según las tareas.
3. Vistas Kanban, lista, calendario y cronograma; comentarios e incidencias.
4. Almacenamiento privado de archivos (base del módulo de documentos y de la foto de perfil).
