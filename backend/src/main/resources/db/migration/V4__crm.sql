-- =========================================================
-- Fase 2 · CRM: empresas, contactos, prospectos (= oportunidades), historial de etapas,
-- interacciones, actividades de seguimiento y clientes (creados al convertir).
-- Montos en pesos colombianos enteros (COP). Fechas en UTC.
-- =========================================================

CREATE TABLE companies (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    tax_id      VARCHAR(30),
    sector      VARCHAR(30),
    city        VARCHAR(80),
    website     VARCHAR(200),
    phone       VARCHAR(30),
    notes       VARCHAR(2000),
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_companies_sector CHECK (sector IS NULL OR sector IN ('TRANSPORT_LOGISTICS', 'COMMERCE_SERVICES', 'AUTOMOTIVE_WORKSHOPS', 'OTHER'))
);
CREATE INDEX idx_companies_name ON companies (lower(name));
CREATE UNIQUE INDEX uq_companies_tax_id ON companies (tax_id) WHERE tax_id IS NOT NULL;

CREATE TABLE contacts (
    id          UUID         PRIMARY KEY,
    company_id  UUID REFERENCES companies (id) ON DELETE SET NULL,
    full_name   VARCHAR(120) NOT NULL,
    email       VARCHAR(160),
    phone       VARCHAR(30),
    position    VARCHAR(80),
    notes       VARCHAR(2000),
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_contacts_company ON contacts (company_id);
CREATE INDEX idx_contacts_name ON contacts (lower(full_name));

CREATE TABLE clients (
    id             UUID         PRIMARY KEY,
    name           VARCHAR(160) NOT NULL,
    tax_id         VARCHAR(30),
    company_id     UUID REFERENCES companies (id) ON DELETE SET NULL,
    contact_id     UUID REFERENCES contacts (id) ON DELETE SET NULL,
    email          VARCHAR(160),
    phone          VARCHAR(30),
    address        VARCHAR(200),
    city           VARCHAR(80),
    sector         VARCHAR(30),
    status         VARCHAR(20)  NOT NULL,
    joined_at      DATE         NOT NULL,
    internal_notes VARCHAR(2000),
    account_owner_id UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL,
    created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_clients_status CHECK (status IN ('ACTIVO', 'INACTIVO', 'POTENCIAL', 'SUSPENDIDO'))
);
CREATE INDEX idx_clients_name ON clients (lower(name));
CREATE UNIQUE INDEX uq_clients_company ON clients (company_id) WHERE company_id IS NOT NULL;

-- Prospecto / oportunidad comercial. Los datos de contacto se copian (snapshot) para no
-- obligar a crear empresa y contacto desde el primer minuto; se pueden vincular después.
CREATE TABLE leads (
    id                    UUID          PRIMARY KEY,
    title                 VARCHAR(160)  NOT NULL,
    contact_name          VARCHAR(120)  NOT NULL,
    contact_email         VARCHAR(160),
    contact_phone         VARCHAR(30),
    company_name          VARCHAR(160),
    company_id            UUID REFERENCES companies (id) ON DELETE SET NULL,
    contact_id            UUID REFERENCES contacts (id) ON DELETE SET NULL,
    sector                VARCHAR(30),
    need                  VARCHAR(2000),
    estimated_budget      NUMERIC(14, 0),
    services              VARCHAR(40)[] NOT NULL DEFAULT '{}',
    source                VARCHAR(20)   NOT NULL,
    stage                 VARCHAR(30)   NOT NULL,
    temperature           VARCHAR(10)   NOT NULL DEFAULT 'WARM',
    owner_id              UUID REFERENCES users (id) ON DELETE SET NULL,
    lost_reason           VARCHAR(300),
    -- Solicitud del formulario web que lo originó (una sola vez: evita duplicados).
    diagnostic_request_id UUID UNIQUE REFERENCES diagnostic_requests (id) ON DELETE CASCADE,
    -- Un cliente puede tener varias oportunidades ganadas (ventas repetidas): no es único.
    client_id             UUID REFERENCES clients (id) ON DELETE SET NULL,
    converted_at          TIMESTAMPTZ,
    stage_changed_at      TIMESTAMPTZ   NOT NULL,
    archived_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ   NOT NULL,
    updated_at            TIMESTAMPTZ   NOT NULL,
    created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_by            UUID REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_leads_stage CHECK (stage IN ('NUEVO', 'CONTACTADO', 'CALIFICADO', 'REUNION_PROGRAMADA', 'PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO', 'PERDIDO')),
    CONSTRAINT chk_leads_source CHECK (source IN ('WEB_FORM', 'WHATSAPP', 'REFERRAL', 'SOCIAL', 'EVENT', 'DIRECT', 'OTHER')),
    CONSTRAINT chk_leads_temperature CHECK (temperature IN ('COLD', 'WARM', 'HOT')),
    CONSTRAINT chk_leads_sector CHECK (sector IS NULL OR sector IN ('TRANSPORT_LOGISTICS', 'COMMERCE_SERVICES', 'AUTOMOTIVE_WORKSHOPS', 'OTHER')),
    CONSTRAINT chk_leads_budget CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
    CONSTRAINT chk_leads_converted CHECK ((client_id IS NULL) = (converted_at IS NULL))
);
CREATE INDEX idx_leads_board ON leads (stage, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_leads_owner ON leads (owner_id) WHERE archived_at IS NULL;
CREATE INDEX idx_leads_created ON leads (created_at DESC);
CREATE INDEX idx_leads_client ON leads (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_leads_company ON leads (company_id) WHERE company_id IS NOT NULL;

CREATE TABLE lead_stage_changes (
    id         UUID         PRIMARY KEY,
    -- Desempate de orden: varios cambios pueden ocurrir en el mismo instante (p. ej. al convertir).
    seq        BIGINT       GENERATED ALWAYS AS IDENTITY,
    lead_id    UUID         NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    from_stage VARCHAR(30),
    to_stage   VARCHAR(30)  NOT NULL,
    note       VARCHAR(300),
    changed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_stage_changes_lead ON lead_stage_changes (lead_id, changed_at DESC, seq DESC);
CREATE INDEX idx_stage_changes_to ON lead_stage_changes (to_stage, changed_at);

-- Historial de interacciones (llamadas, mensajes, reuniones, notas).
CREATE TABLE interactions (
    id          UUID          PRIMARY KEY,
    lead_id     UUID          NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    type        VARCHAR(20)   NOT NULL,
    summary     VARCHAR(2000) NOT NULL,
    occurred_at TIMESTAMPTZ   NOT NULL,
    author_id   UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL,
    CONSTRAINT chk_interactions_type CHECK (type IN ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'NOTE'))
);
CREATE INDEX idx_interactions_lead ON interactions (lead_id, occurred_at DESC);

-- Seguimientos y próximas actividades (recordatorios con fecha y responsable).
CREATE TABLE activities (
    id           UUID         PRIMARY KEY,
    lead_id      UUID         NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    type         VARCHAR(20)  NOT NULL,
    title        VARCHAR(160) NOT NULL,
    due_at       TIMESTAMPTZ  NOT NULL,
    assignee_id  UUID REFERENCES users (id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT chk_activities_type CHECK (type IN ('CALL', 'MEETING', 'FOLLOW_UP', 'TASK'))
);
CREATE INDEX idx_activities_pending ON activities (assignee_id, due_at) WHERE completed_at IS NULL;
CREATE INDEX idx_activities_lead ON activities (lead_id, due_at);

-- ---------- Permisos del CRM y de clientes ----------
INSERT INTO permissions (code, module, description) VALUES
    ('crm.read',       'crm',     'Ver prospectos, empresas, contactos y actividades'),
    ('crm.write',      'crm',     'Crear y editar prospectos, empresas, contactos, interacciones y actividades'),
    ('crm.assign',     'crm',     'Asignar prospectos a otros responsables comerciales'),
    ('crm.archive',    'crm',     'Archivar y restaurar prospectos, empresas y contactos'),
    ('crm.convert',    'crm',     'Convertir prospectos en clientes'),
    ('clients.read',   'clients', 'Ver clientes'),
    ('clients.manage', 'clients', 'Crear y editar clientes');

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r JOIN permissions p ON p.module IN ('crm', 'clients')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN');

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r JOIN permissions p
  ON (r.code = 'COMERCIAL'       AND p.code IN ('crm.read', 'crm.write', 'crm.convert', 'clients.read', 'clients.manage'))
  OR (r.code = 'PROJECT_MANAGER' AND p.code IN ('crm.read', 'clients.read'))
  OR (r.code = 'DEVELOPER'       AND p.code IN ('clients.read'));

-- ---------- Solicitudes web existentes → prospectos ----------
INSERT INTO leads (id, title, contact_name, contact_email, contact_phone, company_name, sector, need, source, stage,
                   diagnostic_request_id, stage_changed_at, created_at, updated_at)
SELECT gen_random_uuid(),
       'Diagnóstico gratuito · ' || COALESCE(d.company, d.full_name),
       d.full_name, d.email, d.phone, d.company, d.sector, d.need, 'WEB_FORM',
       CASE d.status WHEN 'NEW' THEN 'NUEVO' WHEN 'CONTACTED' THEN 'CONTACTADO' WHEN 'SCHEDULED' THEN 'REUNION_PROGRAMADA'
                     WHEN 'COMPLETED' THEN 'CALIFICADO' ELSE 'PERDIDO' END,
       d.id, d.updated_at, d.created_at, d.updated_at
FROM diagnostic_requests d;

INSERT INTO lead_stage_changes (id, lead_id, from_stage, to_stage, note, changed_at)
SELECT gen_random_uuid(), l.id, NULL, l.stage, 'Importado desde las solicitudes del formulario web', l.created_at FROM leads l;
