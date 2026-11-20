-- =========================================================
-- Fase 1 · Sesiones, tokens de un solo uso, historial de acceso y bitácora.
-- Los tokens nunca se guardan en claro: solo su hash SHA-256 (hex).
-- =========================================================

-- Refresh tokens con rotación. Cada inicio de sesión abre una "familia" (= una sesión/dispositivo);
-- si se reutiliza un token ya rotado, se revoca toda la familia.
CREATE TABLE refresh_tokens (
    id             UUID        PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id      UUID        NOT NULL,
    token_hash     VARCHAR(64) NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked_at     TIMESTAMPTZ,
    revoked_reason VARCHAR(20),
    ip             VARCHAR(45),
    user_agent     VARCHAR(300),

    CONSTRAINT chk_refresh_reason CHECK (revoked_reason IS NULL OR revoked_reason IN ('ROTATED', 'LOGOUT', 'REVOKED', 'REUSE', 'PASSWORD'))
);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);

-- Invitaciones (crear contraseña y verificar el correo) y recuperación de contraseña.
CREATE TABLE user_tokens (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    VARCHAR(20) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,

    CONSTRAINT chk_user_tokens_purpose CHECK (purpose IN ('INVITATION', 'PASSWORD_RESET'))
);
CREATE INDEX idx_user_tokens_user_purpose ON user_tokens (user_id, purpose);

-- Historial de acceso (incluye intentos fallidos con el correo escrito).
CREATE TABLE access_log (
    id         UUID         PRIMARY KEY,
    user_id    UUID         REFERENCES users (id) ON DELETE SET NULL,
    email      VARCHAR(160),
    event      VARCHAR(30)  NOT NULL,
    ip         VARCHAR(45),
    user_agent VARCHAR(300),
    created_at TIMESTAMPTZ  NOT NULL,

    CONSTRAINT chk_access_event CHECK (event IN (
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKED', 'LOGOUT', 'REFRESH_REUSE',
        'PASSWORD_CHANGED', 'PASSWORD_RESET', 'INVITATION_ACCEPTED', 'SESSION_REVOKED'))
);
CREATE INDEX idx_access_log_user_created ON access_log (user_id, created_at DESC);
CREATE INDEX idx_access_log_created ON access_log (created_at DESC);

-- Bitácora de actividad: quién hizo qué sobre qué registro.
CREATE TABLE activity_logs (
    id          UUID         PRIMARY KEY,
    actor_id    UUID         REFERENCES users (id) ON DELETE SET NULL,
    action      VARCHAR(60)  NOT NULL,
    entity_type VARCHAR(40)  NOT NULL,
    entity_id   UUID,
    summary     VARCHAR(300) NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_activity_entity ON activity_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_created ON activity_logs (created_at DESC);
CREATE INDEX idx_activity_actor ON activity_logs (actor_id, created_at DESC);
