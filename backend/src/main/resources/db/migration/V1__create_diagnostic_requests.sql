CREATE TABLE diagnostic_requests (
    id                  UUID         PRIMARY KEY,
    full_name           VARCHAR(120) NOT NULL,
    company             VARCHAR(120),
    phone               VARCHAR(20)  NOT NULL,
    email               VARCHAR(160),
    sector              VARCHAR(30)  NOT NULL,
    budget              VARCHAR(30)  NOT NULL,
    need                VARCHAR(1500) NOT NULL,
    -- Evidencia de la autorización de tratamiento de datos (Ley 1581 de 2012).
    data_consent        BOOLEAN      NOT NULL CHECK (data_consent),
    consent_accepted_at TIMESTAMPTZ  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    internal_notes      VARCHAR(2000),
    created_at          TIMESTAMPTZ  NOT NULL,
    updated_at          TIMESTAMPTZ  NOT NULL,

    CONSTRAINT chk_sector CHECK (sector IN ('TRANSPORT_LOGISTICS', 'COMMERCE_SERVICES', 'AUTOMOTIVE_WORKSHOPS', 'OTHER')),
    CONSTRAINT chk_budget CHECK (budget IN ('UNKNOWN', 'UNDER_5M', 'FROM_5M_TO_15M', 'FROM_15M_TO_40M', 'OVER_40M')),
    CONSTRAINT chk_status CHECK (status IN ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'DISCARDED'))
);

CREATE INDEX idx_diagnostic_requests_status_created ON diagnostic_requests (status, created_at DESC);
