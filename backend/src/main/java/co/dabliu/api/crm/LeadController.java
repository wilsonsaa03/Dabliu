package co.dabliu.api.crm;

import co.dabliu.api.auth.CurrentUser;
import co.dabliu.api.crm.CrmEnums.LeadSource;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.CrmEnums.Temperature;
import co.dabliu.api.crm.dto.CrmDtos.ActivityRequest;
import co.dabliu.api.crm.dto.CrmDtos.ActivityView;
import co.dabliu.api.crm.dto.CrmDtos.AssignRequest;
import co.dabliu.api.crm.dto.CrmDtos.BoardColumn;
import co.dabliu.api.crm.dto.CrmDtos.ConversionResult;
import co.dabliu.api.crm.dto.CrmDtos.ConvertRequest;
import co.dabliu.api.crm.dto.CrmDtos.InteractionRequest;
import co.dabliu.api.crm.dto.CrmDtos.LeadDetail;
import co.dabliu.api.crm.dto.CrmDtos.LeadRequest;
import co.dabliu.api.crm.dto.CrmDtos.LeadSummary;
import co.dabliu.api.crm.dto.CrmDtos.StageRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "CRM · Prospectos", description = "Embudo comercial, etapas, interacciones, actividades y conversión")
@RestController
@RequestMapping("/api/v1/crm")
public class LeadController {

    private final LeadService leads;
    private final ConversionService conversion;

    public LeadController(LeadService leads, ConversionService conversion) {
        this.leads = leads;
        this.conversion = conversion;
    }

    @Operation(summary = "Busca prospectos (texto, etapa, responsable, origen, temperatura)")
    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/leads")
    public PagedModel<LeadSummary> search(@RequestParam(required = false) String q,
                                          @RequestParam(required = false) LeadStage stage,
                                          @RequestParam(required = false) String owner,
                                          @RequestParam(required = false) LeadSource source,
                                          @RequestParam(required = false) Temperature temperature,
                                          @RequestParam(defaultValue = "false") boolean archived,
                                          @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Owner o = Owner.parse(owner);
        return new PagedModel<>(leads.search(new LeadService.LeadFilter(q, stage, o.id(), o.unassigned(), source, temperature, archived), pageable));
    }

    @Operation(summary = "Embudo por etapas (Kanban). owner=me para ver solo los propios, owner=none para los sin asignar")
    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/leads/board")
    public List<BoardColumn> board(@RequestParam(required = false) String q, @RequestParam(required = false) String owner) {
        Owner o = Owner.parse(owner);
        return leads.board(q, o.id(), o.unassigned());
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/leads/{id}")
    public LeadDetail get(@PathVariable UUID id) {
        return leads.detail(id);
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/leads")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadDetail create(@Valid @RequestBody LeadRequest body) {
        return leads.detail(leads.create(body, CurrentUser.require()).getId());
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/leads/{id}")
    public LeadDetail update(@PathVariable UUID id, @Valid @RequestBody LeadRequest body) {
        leads.update(id, body, CurrentUser.require());
        return leads.detail(id);
    }

    @Operation(summary = "Asigna el responsable comercial (a otra persona exige crm.assign)")
    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/leads/{id}/owner")
    public LeadDetail assign(@PathVariable UUID id, @RequestBody AssignRequest body) {
        leads.assign(id, body.ownerId(), CurrentUser.require());
        return leads.detail(id);
    }

    @Operation(summary = "Cambia la etapa (queda en el historial; Perdido exige motivo)")
    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/leads/{id}/stage")
    public LeadDetail stage(@PathVariable UUID id, @Valid @RequestBody StageRequest body) {
        leads.moveStage(id, body.stage(), body.note(), body.lostReason(), CurrentUser.require());
        return leads.detail(id);
    }

    @PreAuthorize("hasAuthority('crm.archive')")
    @PostMapping("/leads/{id}/archive")
    public LeadDetail archive(@PathVariable UUID id) {
        leads.archive(id, true, CurrentUser.require());
        return leads.detail(id);
    }

    @PreAuthorize("hasAuthority('crm.archive')")
    @PostMapping("/leads/{id}/restore")
    public LeadDetail restore(@PathVariable UUID id) {
        leads.archive(id, false, CurrentUser.require());
        return leads.detail(id);
    }

    @Operation(summary = "Registra una interacción (llamada, WhatsApp, correo, reunión o nota)")
    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/leads/{id}/interactions")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadDetail addInteraction(@PathVariable UUID id, @Valid @RequestBody InteractionRequest body) {
        leads.addInteraction(id, body, CurrentUser.require());
        return leads.detail(id);
    }

    @Operation(summary = "Programa una actividad de seguimiento")
    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/leads/{id}/activities")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadDetail addActivity(@PathVariable UUID id, @Valid @RequestBody ActivityRequest body) {
        leads.addActivity(id, body, CurrentUser.require());
        return leads.detail(id);
    }

    @Operation(summary = "Convierte el prospecto en cliente (una sola vez)")
    @PreAuthorize("hasAuthority('crm.convert')")
    @PostMapping("/leads/{id}/convert")
    public ConversionResult convert(@PathVariable UUID id, @Valid @RequestBody(required = false) ConvertRequest body) {
        return conversion.convert(id, body, CurrentUser.require());
    }

    // ---------- Actividades ----------

    @Operation(summary = "Actividades: status=pending|overdue|done; assignee=me|<id> (por defecto, las mías)")
    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/activities")
    public PagedModel<ActivityView> activities(@RequestParam(defaultValue = "pending") String status,
                                               @RequestParam(defaultValue = "me") String assignee,
                                               @PageableDefault(size = 30, sort = "dueAt", direction = Sort.Direction.ASC) Pageable pageable) {
        UUID who = "all".equals(assignee) ? null : Owner.parse(assignee).id();
        return new PagedModel<>(leads.activities(new LeadService.ActivityFilter(who, status), pageable));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/activities/{id}")
    public void updateActivity(@PathVariable UUID id, @Valid @RequestBody ActivityRequest body) {
        leads.updateActivity(id, body, CurrentUser.require());
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PatchMapping("/activities/{id}/done")
    public void setDone(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean done) {
        leads.setActivityDone(id, done, CurrentUser.require());
    }

    /** "me" = el usuario actual, "none" = sin responsable, o un UUID. */
    record Owner(UUID id, boolean unassigned) {
        static Owner parse(String value) {
            if (value == null || value.isBlank()) return new Owner(null, false);
            if ("me".equals(value)) return new Owner(CurrentUser.require().id(), false);
            if ("none".equals(value)) return new Owner(null, true);
            try {
                return new Owner(UUID.fromString(value), false);
            } catch (IllegalArgumentException e) {
                throw new co.dabliu.api.common.BusinessRuleException("Responsable no válido.");
            }
        }
    }
}
