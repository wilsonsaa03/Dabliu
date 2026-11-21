package co.dabliu.api.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import java.util.UUID;

/** Campos de auditoría comunes: quién y cuándo creó o modificó el registro. */
@MappedSuperclass
public abstract class AuditableEntity {

    @Column(nullable = false, updatable = false)
    protected Instant createdAt;

    @Column(nullable = false)
    protected Instant updatedAt;

    @Column(updatable = false)
    protected UUID createdBy;

    protected UUID updatedBy;

    protected void created(UUID actor, Instant now) {
        createdAt = now;
        updatedAt = now;
        createdBy = actor;
        updatedBy = actor;
    }

    protected void touched(UUID actor, Instant now) {
        updatedAt = now;
        updatedBy = actor;
    }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getUpdatedBy() { return updatedBy; }
}
