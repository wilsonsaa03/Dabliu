package co.dabliu.api.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.web.util.WebUtils;

/**
 * Toma el JWT de la cookie HttpOnly (navegador) o del encabezado Authorization (herramientas).
 * En las rutas públicas de autenticación no lo lee: un token vencido no debe impedir iniciar sesión
 * ni renovarla.
 */
public class CookieBearerTokenResolver implements BearerTokenResolver {

    static final Set<String> IGNORED_PATHS = Set.of(
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/auth/csrf",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v1/auth/accept-invitation",
        "/api/v1/auth/link-info");

    private final DefaultBearerTokenResolver header = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        if (IGNORED_PATHS.contains(request.getRequestURI())) return null;
        String fromHeader = header.resolve(request);
        if (fromHeader != null) return fromHeader;
        Cookie cookie = WebUtils.getCookie(request, AuthCookies.ACCESS);
        return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
    }
}
