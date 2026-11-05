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
public record DabliuProperties(@Valid Cors cors, @Valid Admin admin, @Valid RateLimit rateLimit, Notifications notifications) {

    public record Cors(@NotEmpty List<String> allowedOrigins) {}

    public record Admin(@NotBlank String username, @NotBlank String password) {}

    public record RateLimit(@Min(1) int maxRequests, @NotNull Duration window) {}

    /** Aviso por correo de solicitudes nuevas. Vacío = desactivado. */
    public record Notifications(String emailTo, String emailFrom) {}
}
