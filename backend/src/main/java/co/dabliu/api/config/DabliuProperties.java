package co.dabliu.api.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Configuración propia de la API (prefijo "dabliu" en application.yml). */
@Validated
@ConfigurationProperties("dabliu")
public record DabliuProperties(
    /** Dirección de la aplicación privada (dabliu-app); se usa en los enlaces de los correos. */
    @NotBlank String appUrl,
    @Valid Cors cors,
    @Valid @NotNull Auth auth,
    Bootstrap bootstrap,
    @Valid RateLimit rateLimit,
    @Valid RateLimit authRateLimit,
    Notifications notifications) {

    public record Cors(@NotEmpty List<String> allowedOrigins) {}

    /**
     * Autenticación.
     * jwtSecret: clave HMAC en Base64 de al menos 32 bytes (p. ej. `openssl rand -base64 48`).
     * secureCookies: false solo en desarrollo local por http.
     * logLinks: escribe en el log los enlaces de invitación/recuperación (solo desarrollo, sin correo configurado).
     */
    public record Auth(
        @NotBlank String jwtSecret,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl,
        boolean secureCookies,
        @Min(1) int maxFailedAttempts,
        @NotNull Duration lockDuration,
        @NotNull Duration invitationTtl,
        @NotNull Duration passwordResetTtl,
        boolean logLinks) {}

    /** Primer superadministrador: se crea al arrancar solo si no existe ningún usuario. */
    public record Bootstrap(String adminEmail, String adminPassword, String adminName) {}

    public record RateLimit(@Min(1) int maxRequests, @NotNull Duration window) {}

    /** Aviso por correo de solicitudes nuevas. Vacío = desactivado. */
    public record Notifications(String emailTo, String emailFrom) {}
}
