package co.dabliu.api.crm;

import co.dabliu.api.crm.CrmEnums.ActivityType;
import co.dabliu.api.crm.CrmEnums.InteractionType;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Entidades del historial comercial de un prospecto. */
public final class LeadHistory {

    private LeadHistory() {
    }

    /** Cambio de etapa (inmutable). */
    @Entity(name = "StageChange")
    @Table(name = "lead_stage_changes")
    public static class StageChange {
        @Id private UUID id;
        /** Lo asigna la base de datos (IDENTITY); solo sirve para ordenar cambios del mismo instante. */
        @Column(insertable = false, updatable = false) private Long seq;
        @Column(nullable = false) private UUID leadId;
        @Enumerated(EnumType.STRING) @Column(length = 30) private LeadStage fromStage;
        @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private LeadStage toStage;
        @Column(length = 300) private String note;
        private UUID changedBy;
        @Column(nullable = false) private Instant changedAt;

        protected StageChange() {
        }

        public StageChange(UUID leadId, LeadStage from, LeadStage to, String note, UUID changedBy, Instant now) {
            this.id = UUID.randomUUID();
            this.leadId = leadId;
            this.fromStage = from;
            this.toStage = to;
            this.note = note;
            this.changedBy = changedBy;
            this.changedAt = now;
        }

        public UUID getId() { return id; }
        public UUID getLeadId() { return leadId; }
        public LeadStage getFromStage() { return fromStage; }
        public LeadStage getToStage() { return toStage; }
        public String getNote() { return note; }
        public UUID getChangedBy() { return changedBy; }
        public Instant getChangedAt() { return changedAt; }
    }

    /** Interacción registrada (llamada, mensaje, reunión, nota). */
    @Entity(name = "Interaction")
    @Table(name = "interactions")
    public static class Interaction {
        @Id private UUID id;
        @Column(nullable = false) private UUID leadId;
        @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private InteractionType type;
        @Column(nullable = false, length = 2000) private String summary;
        @Column(nullable = false) private Instant occurredAt;
        private UUID authorId;
        @Column(nullable = false, updatable = false) private Instant createdAt;

        protected Interaction() {
        }

        public Interaction(UUID leadId, InteractionType type, String summary, Instant occurredAt, UUID authorId, Instant now) {
            this.id = UUID.randomUUID();
            this.leadId = leadId;
            this.type = type;
            this.summary = summary;
            this.occurredAt = occurredAt;
            this.authorId = authorId;
            this.createdAt = now;
        }

        public UUID getId() { return id; }
        public UUID getLeadId() { return leadId; }
        public InteractionType getType() { return type; }
        public String getSummary() { return summary; }
        public Instant getOccurredAt() { return occurredAt; }
        public UUID getAuthorId() { return authorId; }
        public Instant getCreatedAt() { return createdAt; }
    }

    /** Actividad de seguimiento con fecha límite (recordatorio). */
    @Entity(name = "Activity")
    @Table(name = "activities")
    public static class Activity {
        @Id private UUID id;
        @Column(nullable = false) private UUID leadId;
        @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ActivityType type;
        @Column(nullable = false, length = 160) private String title;
        @Column(nullable = false) private Instant dueAt;
        private UUID assigneeId;
        private Instant completedAt;
        private UUID completedBy;
        private UUID createdBy;
        @Column(nullable = false, updatable = false) private Instant createdAt;

        protected Activity() {
        }

        public Activity(UUID leadId, ActivityType type, String title, Instant dueAt, UUID assigneeId, UUID createdBy, Instant now) {
            this.id = UUID.randomUUID();
            this.leadId = leadId;
            this.type = type;
            this.title = title;
            this.dueAt = dueAt;
            this.assigneeId = assigneeId;
            this.createdBy = createdBy;
            this.createdAt = now;
        }

        public void update(ActivityType type, String title, Instant dueAt, UUID assigneeId) {
            this.type = type;
            this.title = title;
            this.dueAt = dueAt;
            this.assigneeId = assigneeId;
        }

        public void complete(UUID by, Instant now) {
            if (completedAt == null) {
                completedAt = now;
                completedBy = by;
            }
        }

        public void reopen() {
            completedAt = null;
            completedBy = null;
        }

        public boolean isOverdue(Instant now) {
            return completedAt == null && dueAt.isBefore(now);
        }

        public UUID getId() { return id; }
        public UUID getLeadId() { return leadId; }
        public ActivityType getType() { return type; }
        public String getTitle() { return title; }
        public Instant getDueAt() { return dueAt; }
        public UUID getAssigneeId() { return assigneeId; }
        public Instant getCompletedAt() { return completedAt; }
        public UUID getCompletedBy() { return completedBy; }
        public UUID getCreatedBy() { return createdBy; }
        public Instant getCreatedAt() { return createdAt; }
    }
}
