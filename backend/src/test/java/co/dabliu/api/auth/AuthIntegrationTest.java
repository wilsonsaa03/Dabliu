package co.dabliu.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.support.IntegrationTest;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserStatus;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;

/** Flujos completos de autenticación contra PostgreSQL real. */
class AuthIntegrationTest extends IntegrationTest {

    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired AccessLogRepository accessLog;

    private static String credentials(String email, String password) {
        return "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password);
    }

    @Test
    void bootstrapCreatesSuperAdminWhoCanLogIn() throws Exception {
        Session session = login(ROOT_EMAIL, ROOT_PASSWORD);

        assertThat(session.access().isHttpOnly()).isTrue();
        assertThat(session.refresh().isHttpOnly()).isTrue();
        assertThat(session.refresh().getPath()).isEqualTo("/api/v1/auth");

        mvc.perform(get("/api/v1/auth/me").cookie(session.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(ROOT_EMAIL))
            .andExpect(jsonPath("$.roles[0]").value("SUPER_ADMIN"))
            .andExpect(jsonPath("$.permissions").isArray());
    }

    @Test
    void loginRequiresCsrfToken() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(credentials(ROOT_EMAIL, ROOT_PASSWORD)))
            .andExpect(status().isForbidden());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveSameAnswer() throws Exception {
        String email = unique("ana");
        createUser(email, "DEVELOPER");

        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(email, "incorrecta-1")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(unique("nadie"), "x")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void locksAccountAfterRepeatedFailuresAndUnlocksLater() throws Exception {
        String email = unique("bloqueo");
        createUser(email, "DEVELOPER");

        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(email, "mala-" + i)))
                .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(email, "mala-5")))
            .andExpect(status().isLocked());
        // Bloqueada: ni siquiera la contraseña correcta entra.
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(email, DEFAULT_PASSWORD)))
            .andExpect(status().isLocked());

        clock.advance(Duration.ofMinutes(16));
        login(email, DEFAULT_PASSWORD);
    }

    @Test
    void protectedEndpointsRejectAnonymousAndForgedTokens() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").cookie(new jakarta.servlet.http.Cookie(AuthCookies.ACCESS, "eyJhbGciOiJIUzI1NiJ9.e30.firma-falsa")))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesTokenAndDetectsReuse() throws Exception {
        String email = unique("rota");
        createUser(email, "DEVELOPER");
        Session first = login(email, DEFAULT_PASSWORD);

        MockHttpServletResponse rotated = mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(first.refresh()))
            .andExpect(status().isOk())
            .andReturn().getResponse();
        Session second = sessionFrom(rotated);
        assertThat(second.refresh().getValue()).isNotEqualTo(first.refresh().getValue());

        // Reutilizar el token viejo justo después (otra pestaña): se pide reintentar, sin cerrar la sesión.
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(first.refresh()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("REFRESH_RACE"));

        // Reutilizarlo mucho después: posible robo. Se revoca toda la sesión, incluido el token nuevo.
        clock.advance(Duration.ofMinutes(2));
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(first.refresh()))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(second.refresh()))
            .andExpect(status().isUnauthorized());

        User user = users.findByEmail(email).orElseThrow();
        assertThat(accessLog.findAll()).anyMatch(e -> user.getId().equals(e.getUserId()) && e.getEvent() == AccessLogEntry.Event.REFRESH_REUSE);
    }

    @Test
    void expiredAccessTokenIsRejectedButRefreshRenewsIt() throws Exception {
        String email = unique("vence");
        createUser(email, "DEVELOPER");
        Session session = login(email, DEFAULT_PASSWORD);

        clock.advance(Duration.ofMinutes(20));
        mvc.perform(get("/api/v1/auth/me").cookie(session.access())).andExpect(status().isUnauthorized());

        Session renewed = sessionFrom(mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(session.refresh()))
            .andExpect(status().isOk()).andReturn().getResponse());
        mvc.perform(get("/api/v1/auth/me").cookie(renewed.access())).andExpect(status().isOk());
    }

    @Test
    void logoutRevokesTheSession() throws Exception {
        String email = unique("salir");
        createUser(email, "DEVELOPER");
        Session session = login(email, DEFAULT_PASSWORD);

        mvc.perform(post("/api/v1/auth/logout").with(csrf()).cookie(session.cookies()))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(session.refresh()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordInvalidatesOtherSessionsButKeepsCurrent() throws Exception {
        String email = unique("cambia");
        createUser(email, "DEVELOPER");
        Session laptop = login(email, DEFAULT_PASSWORD);
        Session phone = login(email, DEFAULT_PASSWORD);

        MockHttpServletResponse response = mvc.perform(post("/api/v1/auth/change-password").with(csrf()).cookie(laptop.cookies())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"nueva-clave-456\"}".formatted(DEFAULT_PASSWORD)))
            .andExpect(status().isNoContent())
            .andReturn().getResponse();

        // El token de acceso viejo deja de servir en todos lados (cambió la versión)...
        mvc.perform(get("/api/v1/auth/me").cookie(phone.access())).andExpect(status().isUnauthorized());
        // ...el otro dispositivo no puede renovar...
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(phone.refresh())).andExpect(status().isUnauthorized());
        // ...y este dispositivo sigue con el token nuevo.
        mvc.perform(get("/api/v1/auth/me").cookie(response.getCookie(AuthCookies.ACCESS))).andExpect(status().isOk());
        login(email, "nueva-clave-456");
    }

    @Test
    void changePasswordRejectsWeakPasswords() throws Exception {
        String email = unique("debil");
        createUser(email, "DEVELOPER");
        Session session = login(email, DEFAULT_PASSWORD);

        mvc.perform(post("/api/v1/auth/change-password").with(csrf()).cookie(session.cookies())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"corta\"}".formatted(DEFAULT_PASSWORD)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
    }

    @Test
    void forgotAndResetPasswordFlow() throws Exception {
        String email = unique("olvido");
        createUser(email, "DEVELOPER");
        Session before = login(email, DEFAULT_PASSWORD);

        mvc.perform(post("/api/v1/auth/forgot-password").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email)))
            .andExpect(status().isAccepted());
        // Un correo que no existe recibe la misma respuesta.
        mvc.perform(post("/api/v1/auth/forgot-password").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(unique("fantasma"))))
            .andExpect(status().isAccepted());

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(mailer, timeout(2000)).sendPasswordReset(eq(email), anyString(), token.capture());

        mvc.perform(get("/api/v1/auth/link-info").param("token", token.getValue()).param("purpose", "PASSWORD_RESET"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(email));

        String body = "{\"token\":\"%s\",\"password\":\"restablecida-789\"}".formatted(token.getValue());
        mvc.perform(post("/api/v1/auth/reset-password").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());
        // El enlace es de un solo uso.
        mvc.perform(post("/api/v1/auth/reset-password").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_LINK"));
        // Restablecer cierra las sesiones existentes.
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(before.refresh())).andExpect(status().isUnauthorized());
        login(email, "restablecida-789");
    }

    @Test
    void sessionsCanBeListedAndRevoked() throws Exception {
        String email = unique("sesiones");
        createUser(email, "DEVELOPER");
        Session laptop = login(email, DEFAULT_PASSWORD);
        Session phone = login(email, DEFAULT_PASSWORD);

        String json = mvc.perform(get("/api/v1/auth/sessions").cookie(laptop.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andReturn().getResponse().getContentAsString();
        String phoneSessionId = com.jayway.jsonpath.JsonPath.<java.util.List<String>>read(json, "$[?(@.current == false)].id").get(0);

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/auth/sessions/" + phoneSessionId)
                .with(csrf()).cookie(laptop.cookies()))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(phone.refresh())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(laptop.refresh())).andExpect(status().isOk());
    }

    @Test
    void inactiveUsersCannotLogIn() throws Exception {
        String email = unique("inactivo");
        User user = createUser(email, "DEVELOPER");
        user.deactivate(null, clock.instant());
        users.save(user);
        assertThat(users.findByEmail(email).orElseThrow().getStatus()).isEqualTo(UserStatus.INACTIVE);

        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials(email, DEFAULT_PASSWORD)))
            .andExpect(status().isUnauthorized());
    }
}
