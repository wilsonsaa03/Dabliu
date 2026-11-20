package co.dabliu.api.auth.dto;

import co.dabliu.api.users.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Contratos de /api/v1/auth. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
        @NotBlank(message = "Escribe tu correo.") @Email(message = "Escribe un correo válido.") @Size(max = 160) String email,
        @NotBlank(message = "Escribe tu contraseña.") @Size(max = 128) String password) {}

    public record ForgotPasswordRequest(
        @NotBlank(message = "Escribe tu correo.") @Email(message = "Escribe un correo válido.") @Size(max = 160) String email) {}

    public record ResetPasswordRequest(
        @NotBlank @Size(max = 200) String token,
        @NotBlank(message = "Escribe la nueva contraseña.") @Size(max = 128) String password) {}

    public record ChangePasswordRequest(
        @NotBlank(message = "Escribe tu contraseña actual.") @Size(max = 128) String currentPassword,
        @NotBlank(message = "Escribe la nueva contraseña.") @Size(max = 128) String newPassword) {}

    /** Usuario autenticado tal como lo necesita el frontend para mostrar menús y permisos. */
    public record Me(UUID id, String email, String fullName, String phone, List<String> roles, List<String> permissions,
                     Instant lastLoginAt) {
        public static Me from(User user) {
            return new Me(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.roleCodes().stream().sorted().toList(), user.permissionCodes().stream().sorted().toList(),
                user.getLastLoginAt());
        }
    }

    public record CsrfResponse(String headerName) {}
}
