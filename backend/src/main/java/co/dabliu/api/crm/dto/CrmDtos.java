package co.dabliu.api.crm.dto;

import co.dabliu.api.crm.Company;
import co.dabliu.api.crm.Contact;
import co.dabliu.api.crm.CrmEnums.ActivityType;
import co.dabliu.api.crm.CrmEnums.InteractionType;
import co.dabliu.api.crm.CrmEnums.LeadSource;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.CrmEnums.Temperature;
import co.dabliu.api.crm.Lead;
import co.dabliu.api.crm.LeadHistory.Activity;
import co.dabliu.api.crm.LeadHistory.Interaction;
import co.dabliu.api.crm.LeadHistory.StageChange;
import co.dabliu.api.diagnostic.Sector;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Contratos de /api/v1/crm. Montos en COP enteros. */
public final class CrmDtos {

    private CrmDtos() {
    }

    private static final String PHONE = "^[+0-9 ()-]{7,30}$";

    // ---------- Empresas ----------

    public record CompanyRequest(
        @NotBlank(message = "Escribe el nombre de la empresa.") @Size(max = 160) String name,
        @Size(max = 30) @Pattern(regexp = "^[0-9.\\-]*$", message = "El NIT solo admite números, puntos y guion.") String taxId,
        Sector sector,
        @Size(max = 80) String city,
        @Size(max = 200) String website,
        @Pattern(regexp = PHONE, message = "Escribe un teléfono válido.") String phone,
        @Size(max = 2000) String notes) {}

    public record CompanyView(UUID id, String name, String taxId, Sector sector, String city, String website, String phone,
                              String notes, boolean archived, Instant createdAt, Instant updatedAt) {
        public static CompanyView from(Company c) {
            return new CompanyView(c.getId(), c.getName(), c.getTaxId(), c.getSector(), c.getCity(), c.getWebsite(), c.getPhone(),
                c.getNotes(), c.getArchivedAt() != null, c.getCreatedAt(), c.getUpdatedAt());
        }
    }

    public record CompanyDetail(CompanyView company, List<ContactView> contacts, List<LeadSummary> leads, UUID clientId) {}

    // ---------- Contactos ----------

    public record ContactRequest(
        UUID companyId,
        @NotBlank(message = "Escribe el nombre.") @Size(max = 120) String fullName,
        @Email(message = "Escribe un correo válido.") @Size(max = 160) String email,
        @Pattern(regexp = PHONE, message = "Escribe un teléfono válido.") String phone,
        @Size(max = 80) String position,
        @Size(max = 2000) String notes) {}

    public record ContactView(UUID id, UUID companyId, String companyName, String fullName, String email, String phone,
                              String position, String notes, boolean archived, Instant createdAt) {
        public static ContactView from(Contact c, String companyName) {
            return new ContactView(c.getId(), c.getCompanyId(), companyName, c.getFullName(), c.getEmail(), c.getPhone(),
                c.getPosition(), c.getNotes(), c.getArchivedAt() != null, c.getCreatedAt());
        }
    }

    // ---------- Prospectos ----------

    public record LeadRequest(
        @NotBlank(message = "Escribe un título para la oportunidad.") @Size(max = 160) String title,
        @NotBlank(message = "Escribe el nombre del contacto.") @Size(max = 120) String contactName,
        @Email(message = "Escribe un correo válido.") @Size(max = 160) String contactEmail,
        @Pattern(regexp = PHONE, message = "Escribe un teléfono válido.") String contactPhone,
        @Size(max = 160) String companyName,
        UUID companyId,
        UUID contactId,
        Sector sector,
        @Size(max = 2000) String need,
        @PositiveOrZero(message = "El presupuesto no puede ser negativo.")
        @DecimalMax(value = "99999999999999", message = "El presupuesto es demasiado alto.") BigDecimal estimatedBudget,
        @Size(max = 12) List<@Pattern(regexp = "^[A-Za-z_]{2,40}$", message = "Código de servicio no válido.") String> services,
        LeadSource source,
        Temperature temperature,
        UUID ownerId) {}

    public record StageRequest(@NotNull LeadStage stage, @Size(max = 300) String note, @Size(max = 300) String lostReason) {}

    public record AssignRequest(UUID ownerId) {}

    public record LeadSummary(UUID id, String title, String contactName, String companyName, LeadStage stage, Temperature temperature,
                              BigDecimal estimatedBudget, LeadSource source, UUID ownerId, String ownerName, Instant nextActivityAt,
                              boolean overdue, boolean converted, boolean archived, Instant stageChangedAt, Instant createdAt) {
        public static LeadSummary from(Lead l, Map<UUID, String> names, Instant nextActivity, Instant now) {
            return new LeadSummary(l.getId(), l.getTitle(), l.getContactName(), l.getCompanyName(), l.getStage(), l.getTemperature(),
                l.getEstimatedBudget(), l.getSource(), l.getOwnerId(), names.get(l.getOwnerId()), nextActivity,
                nextActivity != null && nextActivity.isBefore(now), l.isConverted(), l.getArchivedAt() != null,
                l.getStageChangedAt(), l.getCreatedAt());
        }
    }

    public record StageChangeView(UUID id, LeadStage fromStage, LeadStage toStage, String note, String changedByName, Instant changedAt) {
        public static StageChangeView from(StageChange c, Map<UUID, String> names) {
            return new StageChangeView(c.getId(), c.getFromStage(), c.getToStage(), c.getNote(),
                c.getChangedBy() == null ? "Sistema" : names.getOrDefault(c.getChangedBy(), "Usuario eliminado"), c.getChangedAt());
        }
    }

    public record InteractionView(UUID id, InteractionType type, String summary, Instant occurredAt, String authorName) {
        public static InteractionView from(Interaction i, Map<UUID, String> names) {
            return new InteractionView(i.getId(), i.getType(), i.getSummary(), i.getOccurredAt(), names.get(i.getAuthorId()));
        }
    }

    public record ActivityView(UUID id, UUID leadId, String leadTitle, ActivityType type, String title, Instant dueAt,
                               UUID assigneeId, String assigneeName, Instant completedAt, String completedByName, boolean overdue) {
        public static ActivityView from(Activity a, String leadTitle, Map<UUID, String> names, Instant now) {
            return new ActivityView(a.getId(), a.getLeadId(), leadTitle, a.getType(), a.getTitle(), a.getDueAt(), a.getAssigneeId(),
                names.get(a.getAssigneeId()), a.getCompletedAt(), names.get(a.getCompletedBy()), a.isOverdue(now));
        }
    }

    public record LeadDetail(UUID id, String title, String contactName, String contactEmail, String contactPhone, String companyName,
                             UUID companyId, UUID contactId, Sector sector, String need, BigDecimal estimatedBudget, List<String> services,
                             LeadSource source, LeadStage stage, Temperature temperature, UUID ownerId, String ownerName,
                             String lostReason, UUID diagnosticRequestId, UUID clientId, Instant convertedAt, Instant stageChangedAt,
                             boolean archived, Instant createdAt, Instant updatedAt, String createdByName,
                             List<StageChangeView> stageHistory, List<InteractionView> interactions, List<ActivityView> activities) {}

    public record InteractionRequest(
        @NotNull(message = "Elige el tipo.") InteractionType type,
        @NotBlank(message = "Escribe qué pasó.") @Size(max = 2000) String summary,
        Instant occurredAt) {}

    public record ActivityRequest(
        @NotNull(message = "Elige el tipo.") ActivityType type,
        @NotBlank(message = "Escribe la actividad.") @Size(max = 160) String title,
        @NotNull(message = "Indica la fecha.") Instant dueAt,
        UUID assigneeId) {}

    public record ConvertRequest(
        @Size(max = 160) String clientName,
        @Size(max = 30) @Pattern(regexp = "^[0-9.\\-]*$", message = "El NIT solo admite números, puntos y guion.") String taxId,
        LocalDate joinedAt) {}

    public record ConversionResult(UUID clientId, String clientName, boolean clientCreated, UUID companyId, UUID contactId) {}

    public record BoardColumn(LeadStage stage, String label, long total, BigDecimal value, List<LeadSummary> leads) {}
}
