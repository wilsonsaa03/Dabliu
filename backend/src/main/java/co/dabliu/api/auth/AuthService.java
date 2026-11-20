package co.dabliu.api.auth;

import co.dabliu.api.audit.ActivityLogService;
import co.dabliu.api.common.AfterCommit;
import co.dabliu.api.common.ClientInfo;
import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.common.SecureTokens;
import co.dabliu.api.config.DabliuProperties;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inicio y cierre de sesión, renovación con rotación de refresh tokens, sesiones activas,
 * cambio y recuperación de contraseña, y aceptación de invitaciones.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    /** Si dos pestañas renuevan a la vez, el token recién rotado se tolera este tiempo sin tratarlo como robo. */
    private static final Duration REFRESH_GRACE = Duration.ofSeconds(30);

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final UserTokenRepository userTokens;
    private final AccessTokenService accessTokens;
    private final AccessLogService accessLog;
    private final ActivityLogService activity;
    private final AuthMailer mailer;
    private final PasswordEncoder encoder;
    private final DabliuProperties.Auth config;
    private final Clock clock;
    /** Hash ficticio: cuando el correo no existe se compara igual, para no revelar por el tiempo de respuesta. */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, UserTokenRepository userTokens,
                       AccessTokenService accessTokens, AccessLogService accessLog, ActivityLogService activity,
                       AuthMailer mailer, PasswordEncoder encoder, DabliuProperties properties, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.userTokens = userTokens;
        this.accessTokens = accessTokens;
        this.accessLog = accessLog;
        this.activity = activity;
        this.mailer = mailer;
        this.encoder = encoder;
        this.config = properties.auth();
        this.clock = clock;
        this.dummyHash = encoder.encode(SecureTokens.generate());
    }

    /** Tokens emitidos: el de acceso (JWT) y el refresh (valor en claro, solo para la cookie). */
    public record Session(User user, String accessToken, String refreshToken) {}

    // ---------- Inicio de sesión ----------

    @Transactional(noRollbackFor = AuthException.class)
    public Session login(String rawEmail, String password, ClientInfo client) {
        String email = normalizeEmail(rawEmail);
        Instant now = Instant.now(clock);
        User user = users.findByEmail(email).orElse(null);

        if (user == null) {
            encoder.matches(password, dummyHash);
            accessLog.record(null, email, AccessLogEntry.Event.LOGIN_FAILED, client);
            throw AuthException.invalidCredentials();
        }
        if (user.isLocked(now)) {
            accessLog.record(user.getId(), email, AccessLogEntry.Event.LOGIN_LOCKED, client);
            throw AuthException.locked();
        }
        if (!user.canLogIn() || !encoder.matches(password, user.getPasswordHash())) {
            if (user.canLogIn()) {
                boolean locked = user.registerFailedLogin(config.maxFailedAttempts(), config.lockDuration(), now);
                accessLog.record(user.getId(), email,
                    locked ? AccessLogEntry.Event.LOGIN_LOCKED : AccessLogEntry.Event.LOGIN_FAILED, client);
                if (locked) throw AuthException.locked();
            } else {
                encoder.matches(password, dummyHash);
                accessLog.record(user.getId(), email, AccessLogEntry.Event.LOGIN_FAILED, client);
            }
            throw AuthException.invalidCredentials();
        }

        user.registerSuccessfulLogin(now);
        String refresh = openSession(user.getId(), UUID.randomUUID(), client, now);
        accessLog.record(user.getId(), email, AccessLogEntry.Event.LOGIN_SUCCESS, client);
        return new Session(user, accessTokens.issue(user), refresh);
    }

    // ---------- Renovación ----------

    @Transactional(noRollbackFor = AuthException.class)
    public Session refresh(String rawRefresh, ClientInfo client) {
        if (rawRefresh == null) throw AuthException.sessionExpired();
        Instant now = Instant.now(clock);
        RefreshToken current = refreshTokens.findForUpdate(SecureTokens.sha256(rawRefresh))
            .orElseThrow(AuthException::sessionExpired);

        if (current.getRevokedAt() != null) {
            boolean justRotated = "ROTATED".equals(current.getRevokedReason())
                && current.getRevokedAt().isAfter(now.minus(REFRESH_GRACE));
            if (justRotated) throw AuthException.refreshRace();
            if ("ROTATED".equals(current.getRevokedReason())) {
                // Un token ya usado volvió a aparecer: posible robo. Se cierra toda esa sesión.
                refreshTokens.revokeFamily(current.getFamilyId(), "REUSE", now);
                accessLog.record(current.getUserId(), null, AccessLogEntry.Event.REFRESH_REUSE, client);
                log.warn("Reutilización de refresh token detectada; sesión {} revocada", current.getFamilyId());
            }
            throw AuthException.sessionExpired();
        }
        if (!current.isActive(now)) throw AuthException.sessionExpired();

        User user = users.findById(current.getUserId()).orElseThrow(AuthException::sessionExpired);
        if (!user.canLogIn()) {
            refreshTokens.revokeFamily(current.getFamilyId(), "REVOKED", now);
            throw AuthException.sessionExpired();
        }
        current.revoke("ROTATED", now);
        String refresh = openSession(user.getId(), current.getFamilyId(), client, now);
        return new Session(user, accessTokens.issue(user), refresh);
    }

    // ---------- Cierre de sesión y sesiones ----------

    @Transactional
    public void logout(String rawRefresh, ClientInfo client) {
        if (rawRefresh == null) return;
        refreshTokens.findByTokenHash(SecureTokens.sha256(rawRefresh)).ifPresent(token -> {
            refreshTokens.revokeFamily(token.getFamilyId(), "LOGOUT", Instant.now(clock));
            accessLog.record(token.getUserId(), null, AccessLogEntry.Event.LOGOUT, client);
        });
    }

    public record SessionInfo(UUID id, Instant lastActivityAt, Instant expiresAt, String ip, String userAgent, boolean current) {}

    @Transactional(readOnly = true)
    public List<SessionInfo> sessions(UUID userId, String currentRawRefresh) {
        UUID currentFamily = familyOf(currentRawRefresh);
        return refreshTokens.findActiveByUser(userId, Instant.now(clock)).stream()
            .map(t -> new SessionInfo(t.getFamilyId(), t.getCreatedAt(), t.getExpiresAt(), t.getIp(), t.getUserAgent(),
                t.getFamilyId().equals(currentFamily)))
            .toList();
    }

    @Transactional
    public void revokeSession(UUID userId, UUID familyId, ClientInfo client) {
        boolean owned = refreshTokens.findActiveByUser(userId, Instant.now(clock)).stream()
            .anyMatch(t -> t.getFamilyId().equals(familyId));
        if (!owned) throw new NotFoundException("No existe esa sesión activa");
        refreshTokens.revokeFamily(familyId, "REVOKED", Instant.now(clock));
        accessLog.record(userId, null, AccessLogEntry.Event.SESSION_REVOKED, client);
    }

    // ---------- Contraseña ----------

    /** Cambia la contraseña, cierra las demás sesiones y devuelve un token de acceso nuevo para esta. */
    @Transactional
    public String changePassword(UUID userId, String currentPassword, String newPassword, String currentRawRefresh,
                                 ClientInfo client) {
        User user = users.findById(userId).orElseThrow(AuthException::sessionExpired);
        if (!encoder.matches(currentPassword, user.getPasswordHash())) throw AuthException.wrongCurrentPassword();
        PasswordPolicy.check(newPassword, user.getEmail());
        Instant now = Instant.now(clock);
        user.changePassword(encoder.encode(newPassword), now);

        UUID keep = familyOf(currentRawRefresh);
        if (keep == null) refreshTokens.revokeAllForUser(userId, "PASSWORD", now);
        else refreshTokens.revokeOthersForUser(userId, keep, "PASSWORD", now);

        accessLog.record(userId, user.getEmail(), AccessLogEntry.Event.PASSWORD_CHANGED, client);
        activity.record(userId, "user.password_changed", "USER", userId, "Cambió su contraseña", null);
        users.flush();
        return accessTokens.issue(user);
    }

    /** Siempre responde igual, exista o no el correo (no revela qué correos están registrados). */
    @Transactional
    public void forgotPassword(String rawEmail) {
        users.findByEmail(normalizeEmail(rawEmail)).filter(User::canLogIn).ifPresent(user -> {
            String token = issueLink(user.getId(), UserToken.Purpose.PASSWORD_RESET, config.passwordResetTtl());
            AfterCommit.run(() -> mailer.sendPasswordReset(user.getEmail(), user.getFullName(), token));
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword, ClientInfo client) {
        Instant now = Instant.now(clock);
        UserToken token = usableLink(rawToken, UserToken.Purpose.PASSWORD_RESET, now);
        User user = users.findById(token.getUserId()).filter(User::canLogIn).orElseThrow(AuthException::invalidLink);
        PasswordPolicy.check(newPassword, user.getEmail());
        token.markUsed(now);
        user.changePassword(encoder.encode(newPassword), now);
        refreshTokens.revokeAllForUser(user.getId(), "PASSWORD", now);
        accessLog.record(user.getId(), user.getEmail(), AccessLogEntry.Event.PASSWORD_RESET, client);
        activity.record(user.getId(), "user.password_reset", "USER", user.getId(), "Restableció su contraseña", null);
    }

    // ---------- Invitaciones ----------

    /** Crea el enlace de invitación y programa el correo (lo usa UserService al invitar o reenviar). */
    @Transactional
    public void sendInvitation(User user) {
        String token = issueLink(user.getId(), UserToken.Purpose.INVITATION, config.invitationTtl());
        AfterCommit.run(() -> mailer.sendInvitation(user.getEmail(), user.getFullName(), token));
    }

    @Transactional
    public void acceptInvitation(String rawToken, String password, ClientInfo client) {
        Instant now = Instant.now(clock);
        UserToken token = usableLink(rawToken, UserToken.Purpose.INVITATION, now);
        User user = users.findById(token.getUserId())
            .filter(u -> u.getStatus() == co.dabliu.api.users.UserStatus.INVITED)
            .orElseThrow(AuthException::invalidLink);
        PasswordPolicy.check(password, user.getEmail());
        token.markUsed(now);
        user.acceptInvitation(encoder.encode(password), now);
        accessLog.record(user.getId(), user.getEmail(), AccessLogEntry.Event.INVITATION_ACCEPTED, client);
        activity.record(user.getId(), "user.invitation_accepted", "USER", user.getId(),
            "Activó su cuenta", Map.of("email", user.getEmail()));
    }

    public record LinkInfo(String fullName, String email, UserToken.Purpose purpose) {}

    /** Datos mínimos para saludar en la página del enlace (solo con un token vigente). */
    @Transactional(readOnly = true)
    public LinkInfo linkInfo(String rawToken, UserToken.Purpose purpose) {
        UserToken token = usableLink(rawToken, purpose, Instant.now(clock));
        User user = users.findById(token.getUserId()).orElseThrow(AuthException::invalidLink);
        return new LinkInfo(user.getFullName(), user.getEmail(), purpose);
    }

    // ---------- Internos ----------

    private String openSession(UUID userId, UUID familyId, ClientInfo client, Instant now) {
        String raw = SecureTokens.generate();
        refreshTokens.save(new RefreshToken(userId, familyId, SecureTokens.sha256(raw), now,
            now.plus(config.refreshTokenTtl()), client == null ? null : client.ip(), client == null ? null : client.userAgent()));
        return raw;
    }

    private String issueLink(UUID userId, UserToken.Purpose purpose, Duration ttl) {
        Instant now = Instant.now(clock);
        userTokens.invalidatePending(userId, purpose, now);
        String raw = SecureTokens.generate();
        userTokens.save(new UserToken(userId, purpose, SecureTokens.sha256(raw), now, now.plus(ttl)));
        return raw;
    }

    private UserToken usableLink(String rawToken, UserToken.Purpose purpose, Instant now) {
        if (rawToken == null || rawToken.isBlank()) throw AuthException.invalidLink();
        return userTokens.findByTokenHash(SecureTokens.sha256(rawToken))
            .filter(t -> t.isUsable(purpose, now))
            .orElseThrow(AuthException::invalidLink);
    }

    private UUID familyOf(String rawRefresh) {
        if (rawRefresh == null) return null;
        return refreshTokens.findByTokenHash(SecureTokens.sha256(rawRefresh))
            .filter(t -> t.getRevokedAt() == null)
            .map(RefreshToken::getFamilyId)
            .orElse(null);
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }
}
