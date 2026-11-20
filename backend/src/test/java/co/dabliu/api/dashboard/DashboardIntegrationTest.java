package co.dabliu.api.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.support.IntegrationTest;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** El panel muestra datos reales y solo los bloques permitidos para cada rol. */
class DashboardIntegrationTest extends IntegrationTest {

    @Test
    void countsPublicFormRequestsAndHidesBlocksWithoutPermission() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        long before = readReceived(root);

        // El formulario público de la landing sigue funcionando sin sesión ni CSRF.
        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"Carlos Ruiz","phone":"+57 315 000 0000","sector":"COMMERCE_SERVICES",
                 "need":"Necesitamos controlar inventario y ventas.","dataConsent":true}"""))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/dashboard/summary").cookie(root.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.period.timezone").value("America/Bogota"))
            .andExpect(jsonPath("$.diagnostics.receivedInPeriod").value((int) before + 1))
            .andExpect(jsonPath("$.diagnostics.perDay.length()").value(30))
            .andExpect(jsonPath("$.users.active").value(Matchers.greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.recentActivity").isArray());

        Session developer = login(createUser(unique("dev"), "DEVELOPER").getEmail(), DEFAULT_PASSWORD);
        mvc.perform(get("/api/v1/dashboard/summary").cookie(developer.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.diagnostics").doesNotExist())
            .andExpect(jsonPath("$.users").doesNotExist())
            .andExpect(jsonPath("$.recentActivity").doesNotExist());
    }

    @Test
    void rejectsInvalidPeriods() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        mvc.perform(get("/api/v1/dashboard/summary").param("from", "2026-05-01").param("to", "2026-04-01").cookie(root.cookies()))
            .andExpect(status().isUnprocessableContent());
    }

    private long readReceived(Session session) throws Exception {
        String json = mvc.perform(get("/api/v1/dashboard/summary").cookie(session.cookies()))
            .andReturn().getResponse().getContentAsString();
        return ((Number) com.jayway.jsonpath.JsonPath.read(json, "$.diagnostics.receivedInPeriod")).longValue();
    }
}
