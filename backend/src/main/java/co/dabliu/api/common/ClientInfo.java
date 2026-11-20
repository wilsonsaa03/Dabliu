package co.dabliu.api.common;

import jakarta.servlet.http.HttpServletRequest;

/**
 * IP y navegador de quien hace la solicitud, para el historial de acceso y las sesiones.
 * La IP real detrás de un proxy la resuelve server.forward-headers-strategy.
 */
public record ClientInfo(String ip, String userAgent) {

    public static ClientInfo from(HttpServletRequest request) {
        return new ClientInfo(truncate(request.getRemoteAddr(), 45), truncate(request.getHeader("User-Agent"), 300));
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
