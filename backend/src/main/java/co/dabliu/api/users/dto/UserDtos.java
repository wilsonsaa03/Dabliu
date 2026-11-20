package co.dabliu.api.users.dto;

import co.dabliu.api.auth.AccessLogEntry;
import co.dabliu.api.users.Permission;
import co.dabliu.api.users.Role;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Contratos de /api/v1/users y /api/v1/roles. */
public final class UserDtos {

    private UserDtos() {
    }

    private static final String PHONE = "^[+0-9 ()-]{7,30}$";

    public record InviteUserRequest(
        @NotBlank(message = "Escribe el correo.") @Email(message = "Escribe un correo válido.") @Size(max = 160) String email,
        @NotBlank(message = "Escribe el nombre.") @Size(min = 2, max = 120) String fullName,
        @Pattern(regexp = PHONE, message = "Escribe un teléfono válido.") String phone,
        @NotEmpty(message = "Asigna al menos un rol.") Set<@NotBlank String> roles) {}

    public record UpdateUserRequest(
        @NotBlank(message = "Escribe el nombre.") @Size(min = 2, max = 120) String fullName,
        @Pattern(regexp = PHONE, message = "Escribe un teléfono válido.") String phone) {}

    public record UpdateRolesRequest(@NotEmpty(message = "Asigna al menos un rol.") Set<@NotBlank String> roles) {}

    public record UpdateStatusRequest(@NotNull UserStatus status) {}

    public record RoleRef(String code, String name) {
        static RoleRef from(Role role) {
            return new RoleRef(role.getCode(), role.getName());
        }
    }

    public record UserView(UUID id, String email, String fullName, String phone, UserStatus status, List<RoleRef> roles,
                           boolean locked, Instant emailVerifiedAt, Instant lastLoginAt, Instant createdAt, Instant updatedAt) {
        public static UserView from(User user, Instant now) {
            return new UserView(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.getStatus(),
                user.getRoles().stream().sorted(Comparator.comparingInt(Role::getSortOrder)).map(RoleRef::from).toList(),
                user.isLocked(now), user.getEmailVerifiedAt(), user.getLastLoginAt(), user.getCreatedAt(), user.getUpdatedAt());
        }
    }

    public record PermissionView(String code, String module, String description) {
        static PermissionView from(Permission p) {
            return new PermissionView(p.getCode(), p.getModule(), p.getDescription());
        }
    }

    public record RoleView(String code, String name, String description, List<PermissionView> permissions) {
        public static RoleView from(Role role) {
            return new RoleView(role.getCode(), role.getName(), role.getDescription(),
                role.getPermissions().stream().map(PermissionView::from)
                    .sorted(Comparator.comparing(PermissionView::code)).toList());
        }
    }

    public record AccessLogView(UUID id, String event, String email, String ip, String userAgent, Instant createdAt) {
        public static AccessLogView from(AccessLogEntry e) {
            return new AccessLogView(e.getId(), e.getEvent().name(), e.getEmail(), e.getIp(), e.getUserAgent(), e.getCreatedAt());
        }
    }
}
