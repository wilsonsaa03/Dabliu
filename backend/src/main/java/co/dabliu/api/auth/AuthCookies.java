package co.dabliu.api.auth;

import co.dabliu.api.config.DabliuProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

/**
 * Cookies de sesión. Ninguna es legible desde JavaScript (HttpOnly), así un XSS no puede robarlas.
 * - Acceso: va a toda la API, SameSite=Lax, vida corta.
 * - Refresh: solo viaja a /api/v1/auth, SameSite=Strict.
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "dabliu_at";
    public static final String REFRESH = "dabliu_rt";
    private static final String ACCESS_PATH = "/api";
    private static final String REFRESH_PATH = "/api/v1/auth";

    private final DabliuProperties.Auth config;

    public AuthCookies(DabliuProperties properties) {
        this.config = properties.auth();
    }

    public void write(HttpServletResponse response, String accessToken, String refreshToken) {
        writeAccess(response, accessToken);
        if (refreshToken != null) {
            add(response, cookie(REFRESH, refreshToken, REFRESH_PATH, "Strict", config.refreshTokenTtl()));
        }
    }

    public void writeAccess(HttpServletResponse response, String accessToken) {
        add(response, cookie(ACCESS, accessToken, ACCESS_PATH, "Lax", config.accessTokenTtl()));
    }

    public void clear(HttpServletResponse response) {
        add(response, cookie(ACCESS, "", ACCESS_PATH, "Lax", Duration.ZERO));
        add(response, cookie(REFRESH, "", REFRESH_PATH, "Strict", Duration.ZERO));
    }

    public String readRefresh(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, REFRESH);
        return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
    }

    private ResponseCookie cookie(String name, String value, String path, String sameSite, Duration maxAge) {
        return ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(config.secureCookies())
            .sameSite(sameSite)
            .path(path)
            .maxAge(maxAge)
            .build();
    }

    private static void add(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
