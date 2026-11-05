package co.dabliu.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Límite de solicitudes públicas por IP en ventana fija, en memoria.
 * Suficiente para una sola instancia; con varias instancias habría que moverlo a Redis o al proxy.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private final int maxRequests;
    private final long windowMillis;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(DabliuProperties.RateLimit config) {
        this(config, Clock.systemUTC());
    }

    RateLimitFilter(DabliuProperties.RateLimit config, Clock clock) {
        this.maxRequests = config.maxRequests();
        this.windowMillis = config.window().toMillis();
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod())
            && SecurityConfig.PUBLIC_DIAGNOSTIC_PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = clock.millis();
        if (windows.size() > 10_000) {
            windows.values().removeIf(w -> w.isExpired(now));
        }

        Window window = windows.compute(request.getRemoteAddr(),
            (ip, current) -> current == null || current.isExpired(now) ? new Window(now + windowMillis) : current);

        if (window.hits.incrementAndGet() > maxRequests) {
            long retryAfter = Math.max(1, (window.resetAt - now) / 1000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                {"type":"about:blank","title":"Demasiadas solicitudes","status":429,\
                "detail":"Has enviado varias solicitudes seguidas. Intenta de nuevo más tarde.","instance":"%s"}"""
                .formatted(request.getRequestURI()));
            return;
        }
        chain.doFilter(request, response);
    }

    private static final class Window {
        final long resetAt;
        final AtomicInteger hits = new AtomicInteger();

        Window(long resetAt) {
            this.resetAt = resetAt;
        }

        boolean isExpired(long now) {
            return now >= resetAt;
        }
    }
}
