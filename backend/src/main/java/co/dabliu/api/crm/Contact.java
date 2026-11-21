package co.dabliu.api.crm;

import co.dabliu.api.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contacts")
public class Contact extends AuditableEntity {

    @Id
    private UUID id;

    private UUID companyId;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(length = 160)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 80)
    private String position;

    @Column(length = 2000)
    private String notes;

    private Instant archivedAt;

    protected Contact() {
    }

    public Contact(UUID actor, Instant now) {
        this.id = UUID.randomUUID();
        created(actor, now);
    }

    public void update(UUID companyId, String fullName, String email, String phone, String position, String notes,
                       UUID actor, Instant now) {
        this.companyId = companyId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.position = position;
        this.notes = notes;
        touched(actor, now);
    }

    public void archive(UUID actor, Instant now) { archivedAt = now; touched(actor, now); }
    public void restore(UUID actor, Instant now) { archivedAt = null; touched(actor, now); }

    public UUID getId() { return id; }
    public UUID getCompanyId() { return companyId; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPosition() { return position; }
    public String getNotes() { return notes; }
    public Instant getArchivedAt() { return archivedAt; }
}
