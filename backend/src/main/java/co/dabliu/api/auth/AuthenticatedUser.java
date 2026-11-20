package co.dabliu.api.auth;

import java.util.Set;
import java.util.UUID;

/** Usuario de la solicitud actual (principal de Spring Security). Se arma desde la base de datos en cada solicitud. */
public record AuthenticatedUser(UUID id, String email, String fullName, Set<String> roles, Set<String> permissions) {

    public boolean hasRole(String role) {
        return roles.contains(role);
    }
}
