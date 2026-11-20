package co.dabliu.api.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Registro inmutable de una acción relevante (bitácora). */
@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    private UUID id;

    private UUID actorId;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(nullable = false, length = 40)
    private String entityType;

    private UUID entityId;

    @Column(nullable = false, length = 300)
    private String summary;

    /** JSON con detalles adicionales (nunca contraseñas ni tokens). */
    @JdbcTypeCode(SqlTypes.JSON)
    private String details;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected ActivityLog() {
    }

    ActivityLog(UUID actorId, String action, String entityType, UUID entityId, String summary, String details, Instant now) {
        this.id = UUID.randomUUID();
        this.actorId = actorId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.summary = summary.length() > 300 ? summary.substring(0, 300) : summary;
        this.details = details;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public UUID getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public String getSummary() { return summary; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
