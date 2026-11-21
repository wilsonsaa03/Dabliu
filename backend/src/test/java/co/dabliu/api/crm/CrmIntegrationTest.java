package co.dabliu.api.crm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.clients.ClientRepository;
import co.dabliu.api.support.IntegrationTest;
import co.dabliu.api.users.User;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** CRM de punta a punta contra PostgreSQL real. */
class CrmIntegrationTest extends IntegrationTest {

    @Autowired LeadRepository leads;
    @Autowired StageChangeRepository stageChanges;
    @Autowired ClientRepository clients;

    private static String leadBody(String title, String company, String ownerId) {
        return """
            {"title":"%s","contactName":"Pedro Gómez","contactEmail":"PEDRO@ejemplo.co","contactPhone":"+57 300 111 2233",
             "companyName":"%s","sector":"COMMERCE_SERVICES","need":"Controlar inventario","estimatedBudget":12000000,
             "services":["software_a_medida","DATOS_IA"],"source":"REFERRAL","temperature":"HOT"%s}"""
            .formatted(title, company, ownerId == null ? "" : ",\"ownerId\":\"" + ownerId + "\"");
    }

    private String createLead(Session as, String title, String company) throws Exception {
        String json = mvc.perform(post("/api/v1/crm/leads").with(csrf()).cookie(as.cookies())
                .contentType(MediaType.APPLICATION_JSON).content(leadBody(title, company, null)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private Session comercial() throws Exception {
        return login(createUser(unique("com"), "COMERCIAL").getEmail(), DEFAULT_PASSWORD);
    }

    @Test
    void webFormCreatesExactlyOneLead() throws Exception {
        String json = mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"Lucía Web","company":"Ferretería Pacífico","phone":"3150001111","sector":"COMMERCE_SERVICES",
                 "need":"Queremos vender por internet y controlar el inventario.","dataConsent":true}"""))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        UUID requestId = UUID.fromString(JsonPath.read(json, "$.id"));

        Lead lead = leads.findByDiagnosticRequestId(requestId).orElseThrow();
        assertThat(lead.getSource()).isEqualTo(CrmEnums.LeadSource.WEB_FORM);
        assertThat(lead.getStage()).isEqualTo(CrmEnums.LeadStage.NUEVO);
        assertThat(lead.getTitle()).isEqualTo("Diagnóstico gratuito · Ferretería Pacífico");
        assertThat(lead.getOwnerId()).isNull();
        assertThat(stageChanges.findByLeadIdOrderByChangedAtDescSeqDesc(lead.getId())).hasSize(1);
    }

    @Test
    void commercialCreatesLeadOwnedByThemAndCannotAssignToOthers() throws Exception {
        Session com = comercial();
        String id = createLead(com, "Inventario " + UUID.randomUUID(), "Tienda Uno");

        mvc.perform(get("/api/v1/crm/leads/" + id).cookie(com.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ownerName").value(Matchers.startsWith("Usuario com-")))
            .andExpect(jsonPath("$.contactEmail").value("pedro@ejemplo.co"))
            .andExpect(jsonPath("$.services[0]").value("SOFTWARE_A_MEDIDA"))
            .andExpect(jsonPath("$.stageHistory.length()").value(1));

        User other = createUser(unique("otro"), "COMERCIAL");
        mvc.perform(put("/api/v1/crm/leads/" + id + "/owner").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ownerId\":\"" + other.getId() + "\"}"))
            .andExpect(status().isUnprocessableContent());

        // Un administrador sí puede reasignar.
        Session admin = login(createUser(unique("adm"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        mvc.perform(put("/api/v1/crm/leads/" + id + "/owner").with(csrf()).cookie(admin.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ownerId\":\"" + other.getId() + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ownerId").value(other.getId().toString()));
        // Pero no a un cliente.
        User client = createUser(unique("cli"), "CLIENT");
        mvc.perform(put("/api/v1/crm/leads/" + id + "/owner").with(csrf()).cookie(admin.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ownerId\":\"" + client.getId() + "\"}"))
            .andExpect(status().isUnprocessableContent());
    }

    @Test
    void stageChangesAreRecordedAndLostNeedsAReason() throws Exception {
        Session com = comercial();
        String id = createLead(com, "Embudo " + UUID.randomUUID(), "Tienda Dos");

        mvc.perform(post("/api/v1/crm/leads/" + id + "/stage").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"CONTACTADO\",\"note\":\"Primera llamada\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stage").value("CONTACTADO"))
            .andExpect(jsonPath("$.stageHistory[0].fromStage").value("NUEVO"))
            .andExpect(jsonPath("$.stageHistory[0].note").value("Primera llamada"));

        mvc.perform(post("/api/v1/crm/leads/" + id + "/stage").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"PERDIDO\"}"))
            .andExpect(status().isUnprocessableContent());
        mvc.perform(post("/api/v1/crm/leads/" + id + "/stage").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"PERDIDO\",\"lostReason\":\"Eligió otro proveedor\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lostReason").value("Eligió otro proveedor"))
            .andExpect(jsonPath("$.stageHistory.length()").value(3));
    }

    @Test
    void boardGroupsByStageAndFiltersMine() throws Exception {
        Session com = comercial();
        String title = "Tablero " + UUID.randomUUID();
        createLead(com, title, "Tienda Tres");
        mvc.perform(get("/api/v1/crm/leads/board").param("owner", "me").cookie(com.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(8))
            .andExpect(jsonPath("$[0].stage").value("NUEVO"))
            .andExpect(jsonPath("$[0].total").value(1))
            .andExpect(jsonPath("$[0].value").value(12000000))
            .andExpect(jsonPath("$[0].leads[0].title").value(title));
    }

    @Test
    void interactionsAndActivitiesWithOverdueTracking() throws Exception {
        String email = createUser(unique("com"), "COMERCIAL").getEmail();
        Session com = login(email, DEFAULT_PASSWORD);
        String id = createLead(com, "Seguimiento " + UUID.randomUUID(), "Tienda Cuatro");

        mvc.perform(post("/api/v1/crm/leads/" + id + "/interactions").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"WHATSAPP\",\"summary\":\"Pidió la propuesta\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.interactions[0].type").value("WHATSAPP"));

        String due = clock.instant().plus(Duration.ofHours(2)).toString();
        String detail = mvc.perform(post("/api/v1/crm/leads/" + id + "/activities").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"CALL\",\"title\":\"Llamar para cerrar\",\"dueAt\":\"" + due + "\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.activities[0].overdue").value(false))
            .andReturn().getResponse().getContentAsString();
        String activityId = JsonPath.read(detail, "$.activities[0].id");

        clock.advance(Duration.ofHours(3));
        com = login(email, DEFAULT_PASSWORD); // la sesión de 15 minutos venció al adelantar el reloj
        mvc.perform(get("/api/v1/crm/activities").param("status", "overdue").cookie(com.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[?(@.id == '" + activityId + "')].overdue").value(Matchers.contains(true)));
        mvc.perform(get("/api/v1/dashboard/summary").cookie(com.cookies()))
            .andExpect(jsonPath("$.crm.myOverdueActivities").value(Matchers.greaterThanOrEqualTo(1)));

        mvc.perform(patch("/api/v1/crm/activities/" + activityId + "/done").with(csrf()).cookie(com.cookies()))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/crm/activities").param("status", "done").cookie(com.cookies()))
            .andExpect(jsonPath("$.content[?(@.id == '" + activityId + "')]").isNotEmpty());
    }

    @Test
    void conversionCreatesClientOnceAndReusesItForTheSameCompany() throws Exception {
        Session com = comercial();
        String id = createLead(com, "Conversión " + UUID.randomUUID(), "Distribuidora Única " + UUID.randomUUID());

        String result = mvc.perform(post("/api/v1/crm/leads/" + id + "/convert").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"taxId\":\"900." + (System.nanoTime() % 1000000) + "-1\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clientCreated").value(true))
            .andReturn().getResponse().getContentAsString();
        UUID clientId = UUID.fromString(JsonPath.read(result, "$.clientId"));
        String companyId = JsonPath.read(result, "$.companyId");

        mvc.perform(get("/api/v1/crm/leads/" + id).cookie(com.cookies()))
            .andExpect(jsonPath("$.stage").value("GANADO"))
            .andExpect(jsonPath("$.clientId").value(clientId.toString()))
            .andExpect(jsonPath("$.stageHistory[0].note").value("Convertido en cliente"));
        // Sin conversiones duplicadas.
        mvc.perform(post("/api/v1/crm/leads/" + id + "/convert").with(csrf()).cookie(com.cookies()))
            .andExpect(status().isConflict());
        // Un convertido no vuelve a otra etapa.
        mvc.perform(post("/api/v1/crm/leads/" + id + "/stage").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"NEGOCIACION\"}"))
            .andExpect(status().isUnprocessableContent());

        // Otra oportunidad de la misma empresa reutiliza el mismo cliente.
        String second = mvc.perform(post("/api/v1/crm/leads").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON)
                .content(leadBody("Segunda venta " + UUID.randomUUID(), "x", null).replace("\"companyName\":\"x\"", "\"companyId\":\"" + companyId + "\"")))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/v1/crm/leads/" + JsonPath.read(second, "$.id") + "/convert").with(csrf()).cookie(com.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clientCreated").value(false))
            .andExpect(jsonPath("$.clientId").value(clientId.toString()));

        assertThat(clients.findById(clientId)).isPresent();
        mvc.perform(get("/api/v1/clients/" + clientId).cookie(com.cookies())).andExpect(status().isOk());
    }

    @Test
    void permissionsByRole() throws Exception {
        Session dev = login(createUser(unique("dev"), "DEVELOPER").getEmail(), DEFAULT_PASSWORD);
        Session pm = login(createUser(unique("pm"), "PROJECT_MANAGER").getEmail(), DEFAULT_PASSWORD);

        mvc.perform(get("/api/v1/crm/leads").cookie(dev.cookies())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/crm/leads").cookie(pm.cookies())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/crm/leads").with(csrf()).cookie(pm.cookies())
                .contentType(MediaType.APPLICATION_JSON).content(leadBody("No permitido", "X", null)))
            .andExpect(status().isForbidden());
        // El comercial no archiva (solo administración).
        Session com = comercial();
        String id = createLead(com, "Archivo " + UUID.randomUUID(), "Tienda Cinco");
        mvc.perform(post("/api/v1/crm/leads/" + id + "/archive").with(csrf()).cookie(com.cookies())).andExpect(status().isForbidden());
    }

    @Test
    void archivedLeadsAreReadOnlyUntilRestored() throws Exception {
        Session com = comercial();
        Session admin = login(createUser(unique("adm"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        String id = createLead(com, "Archivado " + UUID.randomUUID(), "Tienda Seis");

        mvc.perform(post("/api/v1/crm/leads/" + id + "/archive").with(csrf()).cookie(admin.cookies()))
            .andExpect(jsonPath("$.archived").value(true));
        mvc.perform(post("/api/v1/crm/leads/" + id + "/stage").with(csrf()).cookie(com.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"CONTACTADO\"}"))
            .andExpect(status().isUnprocessableContent());
        mvc.perform(post("/api/v1/crm/leads/" + id + "/restore").with(csrf()).cookie(admin.cookies()))
            .andExpect(jsonPath("$.archived").value(false));
    }

    @Test
    void deletingAWebRequestRemovesItsLeadUnlessItIsAlreadyAClient() throws Exception {
        Session admin = login(createUser(unique("adm"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        String body = """
            {"fullName":"Borrar Me","phone":"3150002222","sector":"OTHER","need":"Solicito supresión de mis datos personales.","dataConsent":true}""";

        UUID first = UUID.fromString(JsonPath.read(mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(body))
            .andReturn().getResponse().getContentAsString(), "$.id"));
        mvc.perform(delete("/api/v1/admin/diagnostic-requests/" + first).with(csrf()).cookie(admin.cookies()))
            .andExpect(status().isNoContent());
        assertThat(leads.findByDiagnosticRequestId(first)).isEmpty();

        UUID second = UUID.fromString(JsonPath.read(mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(body))
            .andReturn().getResponse().getContentAsString(), "$.id"));
        Lead lead = leads.findByDiagnosticRequestId(second).orElseThrow();
        mvc.perform(post("/api/v1/crm/leads/" + lead.getId() + "/convert").with(csrf()).cookie(admin.cookies()))
            .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/diagnostic-requests/" + second).with(csrf()).cookie(admin.cookies()))
            .andExpect(status().isUnprocessableContent());
    }

    @Test
    void companiesRejectDuplicateTaxIdsAndShowTheirLeads() throws Exception {
        Session com = comercial();
        String nit = "901." + (System.nanoTime() % 1000000) + "-2";
        String company = mvc.perform(post("/api/v1/crm/companies").with(csrf()).cookie(com.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Transportes Bahía\",\"taxId\":\"" + nit + "\",\"sector\":\"TRANSPORT_LOGISTICS\",\"city\":\"Buenaventura\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String companyId = JsonPath.read(company, "$.id");
        mvc.perform(post("/api/v1/crm/companies").with(csrf()).cookie(com.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Otra\",\"taxId\":\"" + nit + "\"}"))
            .andExpect(status().isConflict());

        mvc.perform(post("/api/v1/crm/contacts").with(csrf()).cookie(com.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyId\":\"" + companyId + "\",\"fullName\":\"Ana Gerente\",\"position\":\"Gerente\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.companyName").value("Transportes Bahía"));

        mvc.perform(post("/api/v1/crm/leads").with(csrf()).cookie(com.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content(leadBody("Flota " + UUID.randomUUID(), "x", null).replace("\"companyName\":\"x\"", "\"companyId\":\"" + companyId + "\"")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.companyName").value("Transportes Bahía"));

        mvc.perform(get("/api/v1/crm/companies/" + companyId).cookie(com.cookies()))
            .andExpect(jsonPath("$.contacts.length()").value(1))
            .andExpect(jsonPath("$.leads.length()").value(1))
            .andExpect(jsonPath("$.clientId").doesNotExist());
    }

    @Test
    void dashboardShowsCrmFunnelForCommercialTeam() throws Exception {
        Session com = comercial();
        createLead(com, "Panel " + UUID.randomUUID(), "Tienda Siete");
        mvc.perform(get("/api/v1/dashboard/summary").cookie(com.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.crm.funnel.length()").value(8))
            .andExpect(jsonPath("$.crm.newLeads").value(Matchers.greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.crm.openOpportunities").value(Matchers.greaterThanOrEqualTo(1)));
        Session dev = login(createUser(unique("dev"), "DEVELOPER").getEmail(), DEFAULT_PASSWORD);
        mvc.perform(get("/api/v1/dashboard/summary").cookie(dev.cookies()))
            .andExpect(jsonPath("$.crm").doesNotExist());
    }
}
