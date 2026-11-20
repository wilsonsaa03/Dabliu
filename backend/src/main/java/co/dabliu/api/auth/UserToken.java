package co.dabliu.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Token de un solo uso enviado por correo (invitación o recuperación de contraseña). */
@Entity
@Table(name = "user_tokens")
public class UserToken {

    public enum Purpose { INVITATION, PASSWORD_RESET }

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Purpose purpose;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant usedAt;

    protected UserToken() {
    }

    UserToken(UUID userId, Purpose purpose, String tokenHash, Instant now, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.purpose = purpose;
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.expiresAt = expiresAt;
    }

    boolean isUsable(Purpose expected, Instant now) {
        return purpose == expected && usedAt == null && expiresAt.isAfter(now);
    }

    void markUsed(Instant now) {
        usedAt = now;
    }

    public UUID getUserId() { return userId; }
    public Purpose getPurpose() { return purpose; }
    public Instant getExpiresAt() { return expiresAt; }
}
