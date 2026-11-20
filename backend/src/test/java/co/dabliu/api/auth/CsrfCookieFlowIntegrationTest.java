package co.dabliu.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.support.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.annotation.DirtiesContext;

/**
 * El flujo CSRF real que usa Angular, sin el atajo csrf() de spring-security-test
 * (ese atajo reemplaza el repositorio de tokens del contexto; por eso esta clase usa uno propio).
 */
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class CsrfCookieFlowIntegrationTest extends IntegrationTest {

    @Test
    void angularStyleCsrfFlowWorksAndIsRequired() throws Exception {
        MockHttpServletResponse csrfResponse = mvc.perform(get("/api/v1/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"))
            .andReturn().getResponse();
        Cookie xsrf = csrfResponse.getCookie("XSRF-TOKEN");
        assertThat(xsrf).isNotNull();
        assertThat(xsrf.isHttpOnly()).as("Angular debe poder leerla").isFalse();

        String body = "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(ROOT_EMAIL, ROOT_PASSWORD);
        // Sin el encabezado: rechazado aunque la cookie viaje (así se frena a un sitio ajeno).
        mvc.perform(post("/api/v1/auth/login").cookie(xsrf).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        // Con cookie + encabezado iguales: aceptado.
        MockHttpServletResponse login = mvc.perform(post("/api/v1/auth/login").cookie(xsrf)
                .header("X-XSRF-TOKEN", xsrf.getValue()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andReturn().getResponse();

        Session session = sessionFrom(login);
        // Una escritura autenticada por cookie también exige el token.
        mvc.perform(post("/api/v1/auth/logout").cookie(session.access(), session.refresh()))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").cookie(session.access(), session.refresh(), xsrf)
                .header("X-XSRF-TOKEN", xsrf.getValue()))
            .andExpect(status().isNoContent());
    }
}
