package co.dabliu.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Evento del historial de acceso (inicio de sesión, intentos fallidos, cambios de contraseña…). */
@Entity
@Table(name = "access_log")
public class AccessLogEntry {

    public enum Event {
        LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED, LOGOUT, REFRESH_REUSE,
        PASSWORD_CHANGED, PASSWORD_RESET, INVITATION_ACCEPTED, SESSION_REVOKED
    }

    @Id
    private UUID id;

    private UUID userId;

    @Column(length = 160)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Event event;

    @Column(length = 45)
    private String ip;

    @Column(length = 300)
    private String userAgent;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected AccessLogEntry() {
    }

    AccessLogEntry(UUID userId, String email, Event event, String ip, String userAgent, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.email = email == null || email.length() <= 160 ? email : email.substring(0, 160);
        this.event = event;
        this.ip = ip;
        this.userAgent = userAgent;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getEmail() { return email; }
    public Event getEvent() { return event; }
    public String getIp() { return ip; }
    public String getUserAgent() { return userAgent; }
    public Instant getCreatedAt() { return createdAt; }
}
