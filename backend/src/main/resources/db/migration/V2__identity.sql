-- =========================================================
-- Fase 1 · Identidad: usuarios, roles y permisos.
-- Fechas en UTC (TIMESTAMPTZ); la aplicación las muestra en America/Bogota.
-- =========================================================

CREATE TABLE users (
    id                    UUID         PRIMARY KEY,
    email                 VARCHAR(160) NOT NULL,
    full_name             VARCHAR(120) NOT NULL,
    phone                 VARCHAR(30),
    -- Nulo mientras la persona no acepte su invitación y cree su contraseña.
    password_hash         VARCHAR(100),
    status                VARCHAR(20)  NOT NULL,
    email_verified_at     TIMESTAMPTZ,
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    -- Se incrementa al cambiar la contraseña o desactivar la cuenta: invalida los tokens emitidos.
    token_version         INTEGER      NOT NULL DEFAULT 0,
    last_login_at         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL,
    updated_at            TIMESTAMPTZ  NOT NULL,
    created_by            UUID,
    updated_by            UUID,

    CONSTRAINT chk_users_status CHECK (status IN ('INVITED', 'ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_users_email_lower CHECK (email = lower(email)),
    CONSTRAINT chk_users_active_has_password CHECK (status <> 'ACTIVE' OR password_hash IS NOT NULL)
);
CREATE UNIQUE INDEX uq_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);

CREATE TABLE roles (
    id          UUID         PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(300),
    -- Roles del sistema: no se pueden borrar ni renombrar desde la aplicación.
    system_role BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE permissions (
    code        VARCHAR(60)  PRIMARY KEY,
    module      VARCHAR(40)  NOT NULL,
    description VARCHAR(200) NOT NULL
);

CREATE TABLE role_permissions (
    role_id         UUID        NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_code VARCHAR(60) NOT NULL REFERENCES permissions (code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);

-- ---------- Datos iniciales ----------
INSERT INTO roles (id, code, name, description, sort_order) VALUES
    (gen_random_uuid(), 'SUPER_ADMIN',     'Superadministrador', 'Control total del sistema, incluidos otros administradores.', 1),
    (gen_random_uuid(), 'ADMIN',           'Administrador',      'Administra la operación y los usuarios (excepto superadministradores).', 2),
    (gen_random_uuid(), 'COMERCIAL',       'Comercial',          'Gestiona prospectos, oportunidades y propuestas.', 3),
    (gen_random_uuid(), 'PROJECT_MANAGER', 'Gerente de proyecto', 'Gestiona proyectos, equipos y entregas.', 4),
    (gen_random_uuid(), 'DEVELOPER',       'Desarrollador',      'Trabaja en las tareas y proyectos asignados.', 5),
    (gen_random_uuid(), 'CLIENT',          'Cliente',            'Acceso al portal privado con sus propios proyectos.', 6);

INSERT INTO permissions (code, module, description) VALUES
    ('dashboard.read',     'dashboard',   'Ver el panel de control'),
    ('users.read',         'users',       'Ver usuarios'),
    ('users.manage',       'users',       'Invitar, editar, activar y desactivar usuarios y asignar roles'),
    ('roles.read',         'users',       'Ver roles y permisos'),
    ('audit.read',         'audit',       'Ver la bitácora de actividad y el historial de acceso'),
    ('diagnostics.read',   'diagnostics', 'Ver solicitudes del diagnóstico gratuito'),
    ('diagnostics.manage', 'diagnostics', 'Actualizar y eliminar solicitudes del diagnóstico gratuito'),
    ('settings.manage',    'settings',    'Cambiar la configuración del sistema');

-- SUPER_ADMIN: todos los permisos.
INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r CROSS JOIN permissions p WHERE r.code = 'SUPER_ADMIN';

-- ADMIN: todos menos la configuración del sistema.
INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN' AND p.code <> 'settings.manage';

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r JOIN permissions p
  ON (r.code = 'COMERCIAL'       AND p.code IN ('dashboard.read', 'diagnostics.read', 'diagnostics.manage'))
  OR (r.code = 'PROJECT_MANAGER' AND p.code IN ('dashboard.read', 'diagnostics.read'))
  OR (r.code = 'DEVELOPER'       AND p.code IN ('dashboard.read'));
-- CLIENT no tiene permisos internos: su acceso (portal) llega en la fase 4.
