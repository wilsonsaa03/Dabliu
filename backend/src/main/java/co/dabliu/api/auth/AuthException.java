package co.dabliu.api.auth;

import org.springframework.http.HttpStatus;

/**
 * Errores de autenticación con mensaje para el usuario y un código estable para el frontend.
 * Los mensajes no revelan si un correo existe.
 */
public class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String title;
    private final String code;

    private AuthException(HttpStatus status, String title, String code, String message) {
        super(message);
        this.status = status;
        this.title = title;
        this.code = code;
    }

    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "No se pudo iniciar sesión", "INVALID_CREDENTIALS",
            "El correo o la contraseña no son correctos.");
    }

    public static AuthException locked() {
        return new AuthException(HttpStatus.LOCKED, "Cuenta bloqueada temporalmente", "ACCOUNT_LOCKED",
            "Hubo varios intentos fallidos. Espera unos minutos o restablece tu contraseña.");
    }

    public static AuthException sessionExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Sesión vencida", "SESSION_EXPIRED",
            "Tu sesión terminó. Inicia sesión de nuevo.");
    }

    /** El refresh token se rotó hace un instante en otra pestaña: el cliente solo debe reintentar. */
    public static AuthException refreshRace() {
        return new AuthException(HttpStatus.CONFLICT, "Sesión renovada", "REFRESH_RACE",
            "La sesión se acaba de renovar. Reintenta la solicitud.");
    }

    public static AuthException invalidLink() {
        return new AuthException(HttpStatus.BAD_REQUEST, "Enlace no válido", "INVALID_LINK",
            "El enlace no es válido o ya venció. Solicita uno nuevo.");
    }

    public static AuthException wrongCurrentPassword() {
        return new AuthException(HttpStatus.BAD_REQUEST, "Contraseña actual incorrecta", "WRONG_PASSWORD",
            "La contraseña actual no es correcta.");
    }

    public static AuthException weakPassword(String reason) {
        return new AuthException(HttpStatus.BAD_REQUEST, "Contraseña no válida", "WEAK_PASSWORD", reason);
    }

    public HttpStatus status() { return status; }
    public String title() { return title; }
    public String code() { return code; }
}
