package co.dabliu.api.crm;

import co.dabliu.api.common.AuditableEntity;
import co.dabliu.api.diagnostic.Sector;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "companies")
public class Company extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 30)
    private String taxId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Sector sector;

    @Column(length = 80)
    private String city;

    @Column(length = 200)
    private String website;

    @Column(length = 30)
    private String phone;

    @Column(length = 2000)
    private String notes;

    private Instant archivedAt;

    protected Company() {
    }

    public Company(UUID actor, Instant now) {
        this.id = UUID.randomUUID();
        created(actor, now);
    }

    public void update(String name, String taxId, Sector sector, String city, String website, String phone, String notes,
                       UUID actor, Instant now) {
        this.name = name;
        this.taxId = taxId;
        this.sector = sector;
        this.city = city;
        this.website = website;
        this.phone = phone;
        this.notes = notes;
        touched(actor, now);
    }

    public void archive(UUID actor, Instant now) { archivedAt = now; touched(actor, now); }
    public void restore(UUID actor, Instant now) { archivedAt = null; touched(actor, now); }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getTaxId() { return taxId; }
    public Sector getSector() { return sector; }
    public String getCity() { return city; }
    public String getWebsite() { return website; }
    public String getPhone() { return phone; }
    public String getNotes() { return notes; }
    public Instant getArchivedAt() { return archivedAt; }
}
