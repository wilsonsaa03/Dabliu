package co.dabliu.api.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Acceso al usuario autenticado desde los servicios (la identidad la decide el backend, nunca el cliente). */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<AuthenticatedUser> get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthenticatedUser user ? Optional.of(user) : Optional.empty();
    }

    public static AuthenticatedUser require() {
        return get().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Sin sesión"));
    }

    public static UUID idOrNull() {
        return get().map(AuthenticatedUser::id).orElse(null);
    }
}
