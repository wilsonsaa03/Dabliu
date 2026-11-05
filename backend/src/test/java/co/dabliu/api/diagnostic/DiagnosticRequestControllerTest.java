package co.dabliu.api.diagnostic;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.common.ApiExceptionHandler;
import co.dabliu.api.config.SecurityConfig;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({DiagnosticRequestController.class, AdminDiagnosticRequestController.class})
@Import({SecurityConfig.class, ApiExceptionHandler.class})
@TestPropertySource(properties = {
    "dabliu.cors.allowed-origins=https://dabliu.co",
    "dabliu.admin.username=admin",
    "dabliu.admin.password=secreto",
    "dabliu.rate-limit.max-requests=3",
    "dabliu.rate-limit.window=10m",
})
class DiagnosticRequestControllerTest {

    private static final String VALID_BODY = """
        {
          "fullName": "Ana Pérez",
          "company": "Transportes del Pacífico",
          "phone": "+57 315 000 0000",
          "email": "ana@ejemplo.co",
          "sector": "TRANSPORT_LOGISTICS",
          "budget": "FROM_5M_TO_15M",
          "need": "Llevamos los pedidos por WhatsApp y Excel y se nos pierden.",
          "dataConsent": true
        }
        """;

    @Autowired
    MockMvc mvc;

    @MockitoBean
    DiagnosticRequestService service;

    @Test
    void createsRequestAndReturns201() throws Exception {
        when(service.create(any())).thenReturn(savedRequest());

        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY)
                .with(remote("10.0.0.1")))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.status").value("NEW"))
            .andExpect(jsonPath("$.fullName").doesNotExist());
    }

    @Test
    void rejectsMissingConsent() throws Exception {
        String body = VALID_BODY.replace("\"dataConsent\": true", "\"dataConsent\": false");

        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(body)
                .with(remote("10.0.0.2")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.dataConsent").exists());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsShortNeedAndInvalidPhone() throws Exception {
        String body = VALID_BODY
            .replace("Llevamos los pedidos por WhatsApp y Excel y se nos pierden.", "corto")
            .replace("+57 315 000 0000", "abc");

        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(body)
                .with(remote("10.0.0.3")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.need").exists())
            .andExpect(jsonPath("$.errors.phone").exists());
    }

    @Test
    void rejectsUnknownSector() throws Exception {
        String body = VALID_BODY.replace("TRANSPORT_LOGISTICS", "MINING");

        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(body)
                .with(remote("10.0.0.4")))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void limitsRequestsPerIp() throws Exception {
        when(service.create(any())).thenReturn(savedRequest());

        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY)
                    .with(remote("10.0.0.5")))
                .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/v1/diagnostic-requests").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY)
                .with(remote("10.0.0.5")))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"));
    }

    @Test
    void allowsCorsPreflightFromLanding() throws Exception {
        mvc.perform(options("/api/v1/diagnostic-requests")
                .header("Origin", "https://dabliu.co")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://dabliu.co"));
    }

    @Test
    void rejectsCorsFromOtherOrigins() throws Exception {
        mvc.perform(options("/api/v1/diagnostic-requests")
                .header("Origin", "https://otro-sitio.com")
                .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/admin/diagnostic-requests"))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/diagnostic-requests").with(httpBasic("admin", "incorrecta")))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminListsRequests() throws Exception {
        when(service.list(isNull(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(savedRequest())));

        mvc.perform(get("/api/v1/admin/diagnostic-requests").with(httpBasic("admin", "secreto")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].fullName").value("Ana Pérez"))
            .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void adminFiltersByStatus() throws Exception {
        when(service.list(eq(DiagnosticStatus.NEW), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/api/v1/admin/diagnostic-requests").param("status", "NEW").with(httpBasic("admin", "secreto")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    void unknownRoutesAreDenied() throws Exception {
        mvc.perform(get("/api/v1/diagnostic-requests"))
            .andExpect(status().isUnauthorized());
    }

    private static DiagnosticRequest savedRequest() {
        DiagnosticRequest request = new DiagnosticRequest("Ana Pérez", "Transportes del Pacífico", "+57 315 000 0000",
            "ana@ejemplo.co", Sector.TRANSPORT_LOGISTICS, Budget.FROM_5M_TO_15M,
            "Llevamos los pedidos por WhatsApp y Excel y se nos pierden.", Instant.parse("2026-10-30T15:00:00Z"));
        ReflectionTestUtils.setField(request, "id", UUID.randomUUID());
        return request;
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor remote(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }
}
