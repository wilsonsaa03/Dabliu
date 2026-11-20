package co.dabliu.api.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.auth.AuthCookies;
import co.dabliu.api.auth.AuthMailer;
import co.dabliu.api.users.RoleRepository;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base de las pruebas de integración: aplicación completa + PostgreSQL real en Docker (Testcontainers).
 * El contenedor y el contexto se comparten entre clases; cada prueba usa correos únicos para no chocar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(IntegrationTest.TestClockConfig.class)
public abstract class IntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    public static final String ROOT_EMAIL = "root@dabliu.test";
    public static final String ROOT_PASSWORD = "clave-raiz-2026";
    public static final String DEFAULT_PASSWORD = "clave-segura-123";

    @Autowired protected MockMvc mvc;
    @Autowired protected UserRepository users;
    @Autowired protected RoleRepository roles;
    @Autowired protected PasswordEncoder encoder;
    @Autowired protected MutableClock clock;

    /** El correo real no se envía en pruebas: se captura el token que se habría enviado. */
    @MockitoBean protected AuthMailer mailer;

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@dabliu.test";
    }

    /** Crea un usuario activo con los roles indicados directamente en la base de datos. */
    protected User createUser(String email, String... roleCodes) {
        var found = roles.findByCodeIn(Arrays.asList(roleCodes));
        return users.save(User.active(email, "Usuario " + email.substring(0, email.indexOf('@')),
            encoder.encode(DEFAULT_PASSWORD), found, clock.instant()));
    }

    /** Sesión del navegador: las cookies que dejó el login. */
    public record Session(Cookie access, Cookie refresh) {
        public Cookie[] cookies() {
            return refresh == null ? new Cookie[] {access} : new Cookie[] {access, refresh};
        }
    }

    protected Session login(String email, String password) throws Exception {
        MockHttpServletResponse response = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn().getResponse();
        return sessionFrom(response);
    }

    protected static Session sessionFrom(MockHttpServletResponse response) {
        return new Session(response.getCookie(AuthCookies.ACCESS), response.getCookie(AuthCookies.REFRESH));
    }

    /** Reloj controlable: permite simular el paso del tiempo (vencimientos, bloqueos). */
    public static class MutableClock extends Clock {
        private Instant now = Instant.now();

        public void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(now, zone); }
        @Override public Instant instant() { return now; }
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }
}
