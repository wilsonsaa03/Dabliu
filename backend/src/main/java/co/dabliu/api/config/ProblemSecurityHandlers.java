package co.dabliu.api.config;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/** Respuestas 401 y 403 de Spring Security en el mismo formato problem+json que el resto de la API. */
final class ProblemSecurityHandlers {

    private ProblemSecurityHandlers() {
    }

    static AuthenticationEntryPoint unauthorized() {
        return (request, response, ex) -> write(response, 401, "No autenticado",
            "Inicia sesión para continuar.", request.getRequestURI());
    }

    static AccessDeniedHandler forbidden() {
        return (request, response, ex) -> write(response, 403, "Sin permiso",
            "Tu usuario no tiene permiso para esta acción.", request.getRequestURI());
    }

    private static void write(HttpServletResponse response, int status, String title, String detail, String instance)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
            {"type":"about:blank","title":"%s","status":%d,"detail":"%s","instance":"%s"}"""
            .formatted(title, status, detail, instance.replace("\"", "")));
    }
}
