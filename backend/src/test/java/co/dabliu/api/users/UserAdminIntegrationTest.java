package co.dabliu.api.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.dabliu.api.audit.ActivityLogRepository;
import co.dabliu.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** Administración de usuarios, matriz de permisos y reglas de protección. */
class UserAdminIntegrationTest extends IntegrationTest {

    @Autowired ActivityLogRepository activity;

    private String invite(Session as, String email, String roles) throws Exception {
        return mvc.perform(post("/api/v1/users").with(csrf()).cookie(as.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"fullName\":\"Persona Invitada\",\"roles\":[%s]}".formatted(email, roles)))
            .andReturn().getResponse().getContentAsString();
    }

    @Test
    void adminInvitesUserWhoActivatesAccountAndLogsIn() throws Exception {
        Session admin = login(createUser(unique("admin"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        String email = unique("nueva");

        mvc.perform(post("/api/v1/users").with(csrf()).cookie(admin.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"fullName\":\"Laura Gómez\",\"roles\":[\"COMERCIAL\"]}".formatted(email.toUpperCase())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value(email))
            .andExpect(jsonPath("$.status").value("INVITED"))
            .andExpect(jsonPath("$.roles[0].code").value("COMERCIAL"));

        // Invitado: aún no puede entrar.
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DEFAULT_PASSWORD)))
            .andExpect(status().isUnauthorized());

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(mailer, timeout(2000)).sendInvitation(eq(email), eq("Laura Gómez"), token.capture());
        mvc.perform(post("/api/v1/auth/accept-invitation").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"password\":\"laura-clave-2026\"}".formatted(token.getValue())))
            .andExpect(status().isNoContent());

        User laura = users.findByEmail(email).orElseThrow();
        assertThat(laura.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(laura.getEmailVerifiedAt()).isNotNull();
        Session session = login(email, "laura-clave-2026");
        mvc.perform(get("/api/v1/auth/me").cookie(session.cookies()))
            .andExpect(jsonPath("$.permissions").value(org.hamcrest.Matchers.hasItem("diagnostics.manage")));

        assertThat(activity.findAll()).anyMatch(a -> "user.invited".equals(a.getAction()) && laura.getId().equals(a.getEntityId()));
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        Session admin = login(createUser(unique("admin"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        String email = unique("dup");
        createUser(email, "DEVELOPER");
        mvc.perform(post("/api/v1/users").with(csrf()).cookie(admin.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"fullName\":\"Repetido\",\"roles\":[\"DEVELOPER\"]}".formatted(email)))
            .andExpect(status().isConflict());
    }

    @Test
    void permissionMatrixIsEnforcedByTheBackend() throws Exception {
        Session developer = login(createUser(unique("dev"), "DEVELOPER").getEmail(), DEFAULT_PASSWORD);
        Session comercial = login(createUser(unique("com"), "COMERCIAL").getEmail(), DEFAULT_PASSWORD);
        Session client = login(createUser(unique("cli"), "CLIENT").getEmail(), DEFAULT_PASSWORD);

        // Usuarios: solo administración.
        mvc.perform(get("/api/v1/users").cookie(developer.cookies())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users").cookie(comercial.cookies())).andExpect(status().isForbidden());
        // Diagnósticos: comercial sí, desarrollador no.
        mvc.perform(get("/api/v1/admin/diagnostic-requests").cookie(comercial.cookies())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/diagnostic-requests").cookie(developer.cookies())).andExpect(status().isForbidden());
        // Panel: todos los internos; el cliente no (tendrá su portal).
        mvc.perform(get("/api/v1/dashboard/summary").cookie(developer.cookies())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/dashboard/summary").cookie(client.cookies())).andExpect(status().isForbidden());
        // Auditoría: solo administración.
        mvc.perform(get("/api/v1/audit/activity").cookie(comercial.cookies())).andExpect(status().isForbidden());
    }

    @Test
    void adminCannotTouchSuperAdmins() throws Exception {
        Session admin = login(createUser(unique("admin"), "ADMIN").getEmail(), DEFAULT_PASSWORD);
        User root = users.findByEmail(ROOT_EMAIL).orElseThrow();

        mvc.perform(patch("/api/v1/users/" + root.getId() + "/status").with(csrf()).cookie(admin.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
            .andExpect(status().isUnprocessableContent());
        String body = invite(admin, unique("escala"), "\"SUPER_ADMIN\"");
        assertThat(body).contains("Solo un superadministrador");
    }

    @Test
    void nobodyDeactivatesThemselvesAndOneSuperAdminAlwaysRemains() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        User rootUser = users.findByEmail(ROOT_EMAIL).orElseThrow();

        mvc.perform(patch("/api/v1/users/" + rootUser.getId() + "/status").with(csrf()).cookie(root.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
            .andExpect(status().isUnprocessableContent());
        mvc.perform(put("/api/v1/users/" + rootUser.getId() + "/roles").with(csrf()).cookie(root.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[\"ADMIN\"]}"))
            .andExpect(status().isUnprocessableContent());
    }

    @Test
    void roleChangesAndDeactivationApplyImmediately() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        User target = createUser(unique("cambio"), "DEVELOPER");
        Session targetSession = login(target.getEmail(), DEFAULT_PASSWORD);

        mvc.perform(get("/api/v1/admin/diagnostic-requests").cookie(targetSession.cookies())).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/users/" + target.getId() + "/roles").with(csrf()).cookie(root.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[\"COMERCIAL\"]}"))
            .andExpect(status().isOk());
        // El mismo token, sin volver a iniciar sesión, ya tiene el permiso nuevo.
        mvc.perform(get("/api/v1/admin/diagnostic-requests").cookie(targetSession.cookies())).andExpect(status().isOk());

        mvc.perform(patch("/api/v1/users/" + target.getId() + "/status").with(csrf()).cookie(root.cookies())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("INACTIVE"));
        mvc.perform(get("/api/v1/auth/me").cookie(targetSession.cookies())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(targetSession.refresh())).andExpect(status().isUnauthorized());
    }

    @Test
    void clientRoleCannotBeMixedWithInternalRoles() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        String body = invite(root, unique("mixto"), "\"CLIENT\",\"ADMIN\"");
        assertThat(body).contains("no puede tener roles internos");
    }

    @Test
    void searchFiltersByTextStatusAndRole() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        String marker = "zeta" + System.nanoTime();
        createUser(marker + "-a@dabliu.test", "PROJECT_MANAGER");
        createUser(marker + "-b@dabliu.test", "DEVELOPER");

        mvc.perform(get("/api/v1/users").param("q", marker).cookie(root.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page.totalElements").value(2));
        mvc.perform(get("/api/v1/users").param("q", marker).param("role", "PROJECT_MANAGER").cookie(root.cookies()))
            .andExpect(jsonPath("$.page.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].roles[0].code").value("PROJECT_MANAGER"));
        mvc.perform(get("/api/v1/users").param("q", marker).param("status", "INVITED").cookie(root.cookies()))
            .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    void writesRequireCsrfEvenWithValidSession() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        mvc.perform(post("/api/v1/users").cookie(root.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"fullName\":\"Sin CSRF\",\"roles\":[\"DEVELOPER\"]}".formatted(unique("csrf"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void ownProfileCanBeUpdatedByAnyUser() throws Exception {
        User dev = createUser(unique("perfil"), "DEVELOPER");
        Session session = login(dev.getEmail(), DEFAULT_PASSWORD);
        mvc.perform(patch("/api/v1/users/me").with(csrf()).cookie(session.cookies()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Nombre Nuevo\",\"phone\":\"+57 300 000 0000\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fullName").value("Nombre Nuevo"));
        mvc.perform(get("/api/v1/users/me/access-log").cookie(session.cookies()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].event").value("LOGIN_SUCCESS"));
    }

    @Test
    void invitationCanBeResent() throws Exception {
        Session root = login(ROOT_EMAIL, ROOT_PASSWORD);
        String email = unique("reenvio");
        invite(root, email, "\"DEVELOPER\"");
        User invited = users.findByEmail(email).orElseThrow();
        mvc.perform(post("/api/v1/users/" + invited.getId() + "/invitation").with(csrf()).cookie(root.cookies()))
            .andExpect(status().isOk());
        verify(mailer, timeout(2000).times(2)).sendInvitation(eq(email), anyString(), anyString());
    }
}
