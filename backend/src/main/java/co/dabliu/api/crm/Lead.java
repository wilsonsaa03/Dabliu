package co.dabliu.api.crm;

import co.dabliu.api.common.AuditableEntity;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.crm.CrmEnums.LeadSource;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.CrmEnums.Temperature;
import co.dabliu.api.diagnostic.Sector;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Prospecto y oportunidad comercial en una sola entidad (ver docs/SEGUIMIENTO.md, fase 2).
 * Los cambios de etapa pasan por {@link #moveTo} para que siempre quede historial.
 */
@Entity
@Table(name = "leads")
public class Lead extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 120)
    private String contactName;

    @Column(length = 160)
    private String contactEmail;

    @Column(length = 30)
    private String contactPhone;

    @Column(length = 160)
    private String companyName;

    private UUID companyId;

    private UUID contactId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Sector sector;

    @Column(length = 2000)
    private String need;

    @Column(precision = 14, scale = 0)
    private BigDecimal estimatedBudget;

    /** Códigos de servicios de interés (catálogo en el frontend). */
    @Column(nullable = false, columnDefinition = "varchar(40)[]")
    private String[] services = new String[0];

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeadSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LeadStage stage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Temperature temperature;

    private UUID ownerId;

    @Column(length = 300)
    private String lostReason;

    private UUID diagnosticRequestId;

    private UUID clientId;

    private Instant convertedAt;

    @Column(nullable = false)
    private Instant stageChangedAt;

    private Instant archivedAt;

    protected Lead() {
    }

    public Lead(LeadSource source, UUID actor, Instant now) {
        this.id = UUID.randomUUID();
        this.source = source;
        this.stage = LeadStage.NUEVO;
        this.temperature = Temperature.WARM;
        this.stageChangedAt = now;
        created(actor, now);
    }

    public void updateDetails(String title, String contactName, String contactEmail, String contactPhone, String companyName,
                              Sector sector, String need, BigDecimal estimatedBudget, String[] services, Temperature temperature,
                              UUID actor, Instant now) {
        this.title = title;
        this.contactName = contactName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.companyName = companyName;
        this.sector = sector;
        this.need = need;
        this.estimatedBudget = estimatedBudget;
        this.services = services == null ? new String[0] : services;
        this.temperature = temperature == null ? Temperature.WARM : temperature;
        touched(actor, now);
    }

    public void link(UUID companyId, UUID contactId, UUID actor, Instant now) {
        this.companyId = companyId;
        this.contactId = contactId;
        touched(actor, now);
    }

    public void assignTo(UUID ownerId, UUID actor, Instant now) {
        this.ownerId = ownerId;
        touched(actor, now);
    }

    /** Cambia de etapa y devuelve la etapa anterior. Un prospecto convertido ya no cambia de etapa. */
    public LeadStage moveTo(LeadStage target, String lostReason, UUID actor, Instant now) {
        requireNotArchived();
        if (clientId != null && target != LeadStage.GANADO) {
            throw new BusinessRuleException("Este prospecto ya se convirtió en cliente; su etapa queda en Ganado.");
        }
        if (target == LeadStage.PERDIDO && (lostReason == null || lostReason.isBlank())) {
            throw new BusinessRuleException("Indica por qué se perdió la oportunidad.");
        }
        LeadStage previous = stage;
        stage = target;
        this.lostReason = target == LeadStage.PERDIDO ? lostReason.strip() : null;
        stageChangedAt = now;
        touched(actor, now);
        return previous;
    }

    public void markConverted(UUID clientId, UUID actor, Instant now) {
        this.clientId = clientId;
        this.convertedAt = now;
        touched(actor, now);
    }

    public void fromDiagnostic(UUID diagnosticRequestId) {
        this.diagnosticRequestId = diagnosticRequestId;
    }

    public void archive(UUID actor, Instant now) { archivedAt = now; touched(actor, now); }
    public void restore(UUID actor, Instant now) { archivedAt = null; touched(actor, now); }

    public void requireNotArchived() {
        if (archivedAt != null) throw new BusinessRuleException("El prospecto está archivado. Restáuralo para modificarlo.");
    }

    public boolean isConverted() { return clientId != null; }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getContactName() { return contactName; }
    public String getContactEmail() { return contactEmail; }
    public String getContactPhone() { return contactPhone; }
    public String getCompanyName() { return companyName; }
    public UUID getCompanyId() { return companyId; }
    public UUID getContactId() { return contactId; }
    public Sector getSector() { return sector; }
    public String getNeed() { return need; }
    public BigDecimal getEstimatedBudget() { return estimatedBudget; }
    public String[] getServices() { return services; }
    public LeadSource getSource() { return source; }
    public LeadStage getStage() { return stage; }
    public Temperature getTemperature() { return temperature; }
    public UUID getOwnerId() { return ownerId; }
    public String getLostReason() { return lostReason; }
    public UUID getDiagnosticRequestId() { return diagnosticRequestId; }
    public UUID getClientId() { return clientId; }
    public Instant getConvertedAt() { return convertedAt; }
    public Instant getStageChangedAt() { return stageChangedAt; }
    public Instant getArchivedAt() { return archivedAt; }
}
