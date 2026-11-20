package co.dabliu.api.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.annotations.BatchSize;

/**
 * Usuario interno o cliente. Las reglas de estado viven aquí; las de permisos (quién puede
 * cambiar a quién) en UserService.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    private Instant emailVerifiedAt;

    @Column(nullable = false)
    private int failedLoginAttempts;

    private Instant lockedUntil;

    @Column(nullable = false)
    private int tokenVersion;

    private Instant lastLoginAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column(updatable = false)
    private UUID createdBy;

    private UUID updatedBy;

    @ManyToMany
    @JoinTable(name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id"))
    @BatchSize(size = 50)
    private Set<Role> roles = new HashSet<>();

    protected User() {
    }

    /** Usuario invitado: sin contraseña hasta que acepte la invitación. */
    public static User invited(String email, String fullName, String phone, Collection<Role> roles, UUID actor, Instant now) {
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = email;
        user.fullName = fullName;
        user.phone = phone;
        user.status = UserStatus.INVITED;
        user.roles.addAll(roles);
        user.createdAt = now;
        user.updatedAt = now;
        user.createdBy = actor;
        user.updatedBy = actor;
        return user;
    }

    /** Usuario activo creado por el sistema (primer superadministrador). */
    public static User active(String email, String fullName, String passwordHash, Collection<Role> roles, Instant now) {
        User user = invited(email, fullName, null, roles, null, now);
        user.passwordHash = passwordHash;
        user.status = UserStatus.ACTIVE;
        user.emailVerifiedAt = now;
        return user;
    }

    // ---------- Autenticación ----------

    public boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public boolean canLogIn() {
        return status == UserStatus.ACTIVE && passwordHash != null;
    }

    /** Suma un intento fallido; al llegar al máximo bloquea la cuenta por el tiempo indicado. */
    public boolean registerFailedLogin(int maxAttempts, Duration lockDuration, Instant now) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maxAttempts) {
            lockedUntil = now.plus(lockDuration);
            failedLoginAttempts = 0;
            return true;
        }
        return false;
    }

    public void registerSuccessfulLogin(Instant now) {
        failedLoginAttempts = 0;
        lockedUntil = null;
        lastLoginAt = now;
    }

    /** Nueva contraseña: invalida los tokens de acceso emitidos y quita el bloqueo. */
    public void changePassword(String newHash, Instant now) {
        passwordHash = newHash;
        tokenVersion++;
        failedLoginAttempts = 0;
        lockedUntil = null;
        touch(id, now);
    }

    /** Acepta la invitación: crea la contraseña y verifica el correo (el enlace llegó a ese correo). */
    public void acceptInvitation(String passwordHash, Instant now) {
        if (status != UserStatus.INVITED) throw new IllegalStateException("El usuario no está invitado");
        this.passwordHash = passwordHash;
        this.status = UserStatus.ACTIVE;
        this.emailVerifiedAt = now;
        touch(id, now);
    }

    // ---------- Administración ----------

    public void updateProfile(String fullName, String phone, UUID actor, Instant now) {
        this.fullName = fullName;
        this.phone = phone;
        touch(actor, now);
    }

    public void replaceRoles(Collection<Role> newRoles, UUID actor, Instant now) {
        roles.clear();
        roles.addAll(newRoles);
        touch(actor, now);
    }

    public void deactivate(UUID actor, Instant now) {
        status = UserStatus.INACTIVE;
        tokenVersion++;
        touch(actor, now);
    }

    /** Reactiva: vuelve a ACTIVE si ya tenía contraseña; si nunca la creó, queda INVITED. */
    public void reactivate(UUID actor, Instant now) {
        status = passwordHash == null ? UserStatus.INVITED : UserStatus.ACTIVE;
        touch(actor, now);
    }

    private void touch(UUID actor, Instant now) {
        updatedBy = actor;
        updatedAt = now;
    }

    public boolean hasRole(String code) {
        return roles.stream().anyMatch(r -> r.getCode().equals(code));
    }

    public Set<String> roleCodes() {
        return roles.stream().map(Role::getCode).collect(Collectors.toSet());
    }

    public Set<String> permissionCodes() {
        return roles.stream().flatMap(r -> r.getPermissions().stream()).map(Permission::getCode).collect(Collectors.toSet());
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getPasswordHash() { return passwordHash; }
    public UserStatus getStatus() { return status; }
    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public Instant getLockedUntil() { return lockedUntil; }
    public int getTokenVersion() { return tokenVersion; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Set<Role> getRoles() { return roles; }
}
