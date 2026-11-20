package co.dabliu.api.config;

import co.dabliu.api.auth.CookieBearerTokenResolver;
import co.dabliu.api.auth.JwtAuthenticationFilter;
import co.dabliu.api.auth.UserJwtAuthenticationConverter;
import java.util.List;
import java.util.Set;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Seguridad de la API.
 *
 * - Público: crear solicitudes de diagnóstico (landing, con CORS y límite por IP), salud y autenticación.
 * - Privado: todo lo demás bajo /api/v1 exige sesión; cada endpoint exige además su permiso
 *   (@PreAuthorize). El backend es la autoridad: el frontend solo oculta lo que no se puede usar.
 * - Sesión: JWT de acceso en cookie HttpOnly + refresh rotativo. Sin sesión en el servidor.
 * - CSRF: activo para la aplicación (cookie XSRF-TOKEN + encabezado X-XSRF-TOKEN). Exento solo
 *   el formulario público, que no usa cookies.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(DabliuProperties.class)
public class SecurityConfig {

    public static final String PUBLIC_DIAGNOSTIC_PATH = "/api/v1/diagnostic-requests";
    private static final Set<String> AUTH_RATE_LIMITED = Set.of(
        "/api/v1/auth/login", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/accept-invitation");

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, DabliuProperties properties, JwtDecoder jwtDecoder,
                                            UserJwtAuthenticationConverter jwtConverter) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf
                .spa()
                // Cookie XSRF-TOKEN legible por la aplicación + encabezado X-XSRF-TOKEN (convención de Angular).
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers(
                    // Formulario público: no usa cookies, así que no hay sesión que suplantar.
                    PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, PUBLIC_DIAGNOSTIC_PATH),
                    // Herramientas con "Authorization: Bearer": el navegador nunca agrega ese encabezado solo.
                    request -> request.getHeader("Authorization") != null))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, PUBLIC_DIAGNOSTIC_PATH).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf", "/api/v1/auth/link-info").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
                    "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/accept-invitation").permitAll()
                .requestMatchers("/actuator/health", "/error").permitAll()
                // Documentación: solo responde si springdoc está activado (desactivado por defecto en producción).
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().denyAll())
            // Autenticación por JWT con filtro propio (ver JwtAuthenticationFilter: mantiene CSRF activo).
            .addFilterBefore(new JwtAuthenticationFilter(new CookieBearerTokenResolver(), jwtDecoder, jwtConverter,
                ProblemSecurityHandlers.unauthorized()), AuthorizationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(ProblemSecurityHandlers.unauthorized())
                .accessDeniedHandler(ProblemSecurityHandlers.forbidden()))
            .headers(headers -> headers
                .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
            .addFilterAfter(new RateLimitFilter(Set.of(PUBLIC_DIAGNOSTIC_PATH), properties.rateLimit()), CorsFilter.class)
            .addFilterAfter(new RateLimitFilter(AUTH_RATE_LIMITED, properties.authRateLimit()), CorsFilter.class);
        return http.build();
    }

    /**
     * CORS solo para el formulario público de la landing (otro dominio, sin cookies).
     * La aplicación privada llama a la API por el mismo dominio (proxy /api), así que no necesita CORS.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(DabliuProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("POST", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type"));
        config.setExposedHeaders(List.of("Location"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration(PUBLIC_DIAGNOSTIC_PATH, config);
        return source;
    }

    /** BCrypt (formato delegado: el hash guarda su algoritmo y permite migrar a Argon2 más adelante). */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
