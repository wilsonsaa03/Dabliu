package co.dabliu.api.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Autentica cada solicitud con el JWT de la cookie (o del encabezado Authorization).
 *
 * Se usa en lugar del soporte "oauth2ResourceServer" de Spring Security a propósito: ese soporte
 * desactiva la protección CSRF en toda solicitud que traiga un token, y como aquí el token viaja
 * en una cookie (que el navegador adjunta solo), eso abriría la puerta a ataques CSRF.
 * Con este filtro la protección CSRF sigue activa para las solicitudes autenticadas por cookie.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final BearerTokenResolver resolver;
    private final JwtDecoder decoder;
    private final UserJwtAuthenticationConverter converter;
    private final AuthenticationEntryPoint entryPoint;
    private final SecurityContextHolderStrategy contexts = SecurityContextHolder.getContextHolderStrategy();

    public JwtAuthenticationFilter(BearerTokenResolver resolver, JwtDecoder decoder,
                                   UserJwtAuthenticationConverter converter, AuthenticationEntryPoint entryPoint) {
        this.resolver = resolver;
        this.decoder = decoder;
        this.converter = converter;
        this.entryPoint = entryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = resolver.resolve(request);
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }
        Authentication authentication;
        try {
            authentication = converter.convert(decoder.decode(token));
        } catch (JwtException e) {
            contexts.clearContext();
            entryPoint.commence(request, response, new InvalidBearerTokenException("Token no válido", e));
            return;
        } catch (AuthenticationException e) {
            contexts.clearContext();
            entryPoint.commence(request, response, e);
            return;
        }
        SecurityContext context = contexts.createEmptyContext();
        context.setAuthentication(authentication);
        contexts.setContext(context);
        chain.doFilter(request, response);
    }
}
