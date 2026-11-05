package co.dabliu.api.diagnostic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "diagnostic_requests")
public class DiagnosticRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(length = 120)
    private String company;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 160)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Sector sector;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Budget budget;

    @Column(nullable = false, length = 1500)
    private String need;

    @Column(nullable = false)
    private boolean dataConsent;

    @Column(nullable = false)
    private Instant consentAcceptedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiagnosticStatus status;

    @Column(length = 2000)
    private String internalNotes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected DiagnosticRequest() {
    }

    public DiagnosticRequest(String fullName, String company, String phone, String email,
                             Sector sector, Budget budget, String need, Instant now) {
        this.fullName = fullName;
        this.company = company;
        this.phone = phone;
        this.email = email;
        this.sector = sector;
        this.budget = budget;
        this.need = need;
        this.dataConsent = true;
        this.consentAcceptedAt = now;
        this.status = DiagnosticStatus.NEW;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateTracking(DiagnosticStatus status, String internalNotes) {
        this.status = status;
        this.internalNotes = internalNotes;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getCompany() { return company; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public Sector getSector() { return sector; }
    public Budget getBudget() { return budget; }
    public String getNeed() { return need; }
    public boolean isDataConsent() { return dataConsent; }
    public Instant getConsentAcceptedAt() { return consentAcceptedAt; }
    public DiagnosticStatus getStatus() { return status; }
    public String getInternalNotes() { return internalNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
