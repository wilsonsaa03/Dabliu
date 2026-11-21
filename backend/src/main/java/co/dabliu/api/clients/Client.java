package co.dabliu.api.clients;

import co.dabliu.api.common.AuditableEntity;
import co.dabliu.api.diagnostic.Sector;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Expediente del cliente. En la fase 2 se crea al convertir un prospecto; la fase 3 completa el módulo. */
@Entity
@Table(name = "clients")
public class Client extends AuditableEntity {

    public enum Status { ACTIVO, INACTIVO, POTENCIAL, SUSPENDIDO }

    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 30)
    private String taxId;

    private UUID companyId;
    private UUID contactId;

    @Column(length = 160)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 200)
    private String address;

    @Column(length = 80)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Sector sector;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(nullable = false)
    private LocalDate joinedAt;

    @Column(length = 2000)
    private String internalNotes;

    private UUID accountOwnerId;

    protected Client() {
    }

    public Client(String name, UUID companyId, UUID contactId, LocalDate joinedAt, UUID actor, Instant now) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.companyId = companyId;
        this.contactId = contactId;
        this.joinedAt = joinedAt;
        this.status = Status.ACTIVO;
        created(actor, now);
    }

    public void contactData(String taxId, String email, String phone, String city, Sector sector, UUID accountOwnerId) {
        this.taxId = taxId;
        this.email = email;
        this.phone = phone;
        this.city = city;
        this.sector = sector;
        this.accountOwnerId = accountOwnerId;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getTaxId() { return taxId; }
    public UUID getCompanyId() { return companyId; }
    public UUID getContactId() { return contactId; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public Sector getSector() { return sector; }
    public Status getStatus() { return status; }
    public LocalDate getJoinedAt() { return joinedAt; }
    public String getInternalNotes() { return internalNotes; }
    public UUID getAccountOwnerId() { return accountOwnerId; }
}
