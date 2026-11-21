package co.dabliu.api.crm;

import co.dabliu.api.audit.ActivityLogService;
import co.dabliu.api.auth.AuthenticatedUser;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.crm.CrmEnums.LeadSource;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.CrmEnums.Temperature;
import co.dabliu.api.crm.LeadHistory.Activity;
import co.dabliu.api.crm.LeadHistory.Interaction;
import co.dabliu.api.crm.LeadHistory.StageChange;
import co.dabliu.api.crm.dto.CrmDtos.ActivityRequest;
import co.dabliu.api.crm.dto.CrmDtos.ActivityView;
import co.dabliu.api.crm.dto.CrmDtos.BoardColumn;
import co.dabliu.api.crm.dto.CrmDtos.InteractionRequest;
import co.dabliu.api.crm.dto.CrmDtos.InteractionView;
import co.dabliu.api.crm.dto.CrmDtos.LeadDetail;
import co.dabliu.api.crm.dto.CrmDtos.LeadRequest;
import co.dabliu.api.crm.dto.CrmDtos.LeadSummary;
import co.dabliu.api.crm.dto.CrmDtos.StageChangeView;
import co.dabliu.api.diagnostic.DiagnosticDeletionGuard;
import co.dabliu.api.diagnostic.DiagnosticRequestCreatedEvent;
import co.dabliu.api.users.UserDirectory;
import jakarta.persistence.criteria.Predicate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Prospectos: búsqueda, embudo, etapas con historial, interacciones y actividades.
 * Reglas de responsables: cualquiera con "crm.write" puede tomar un prospecto para sí;
 * asignarlo a otra persona exige "crm.assign".
 */
@Service
public class LeadService implements DiagnosticDeletionGuard {

    /** En el tablero, las columnas Ganado/Perdido muestran solo lo cerrado en este periodo. */
    private static final Duration CLOSED_WINDOW = Duration.ofDays(90);
    private static final int BOARD_LIMIT = 100;

    private final LeadRepository leads;
    private final StageChangeRepository stageChanges;
    private final InteractionRepository interactions;
    private final ActivityRepository activities;
    private final CompanyRepository companies;
    private final ContactRepository contacts;
    private final UserDirectory directory;
    private final ActivityLogService audit;
    private final Clock clock;

    public LeadService(LeadRepository leads, StageChangeRepository stageChanges, InteractionRepository interactions,
                       ActivityRepository activities, CompanyRepository companies, ContactRepository contacts,
                       UserDirectory directory, ActivityLogService audit, Clock clock) {
        this.leads = leads;
        this.stageChanges = stageChanges;
        this.interactions = interactions;
        this.activities = activities;
        this.companies = companies;
        this.contacts = contacts;
        this.directory = directory;
        this.audit = audit;
        this.clock = clock;
    }

    // ---------- Consultas ----------

    public record LeadFilter(String q, LeadStage stage, UUID ownerId, boolean unassigned, LeadSource source, Temperature temperature,
                             boolean includeArchived) {}

    @Transactional(readOnly = true)
    public Page<LeadSummary> search(LeadFilter filter, Pageable pageable) {
        Page<Lead> page = leads.findAll(spec(filter), pageable);
        Map<UUID, Instant> next = nextActivities(page.getContent());
        Map<UUID, String> names = directory.names(page.getContent().stream().map(Lead::getOwnerId).toList());
        Instant now = Instant.now(clock);
        return page.map(l -> LeadSummary.from(l, names, next.get(l.getId()), now));
    }

    /** Embudo por etapas (columnas del Kanban). */
    @Transactional(readOnly = true)
    public List<BoardColumn> board(String q, UUID ownerId, boolean unassigned) {
        Instant now = Instant.now(clock);
        List<BoardColumn> columns = new ArrayList<>();
        List<Lead> all = new ArrayList<>();
        Map<LeadStage, List<Lead>> byStage = new HashMap<>();
        Map<LeadStage, long[]> totals = new HashMap<>();
        for (LeadStage stage : LeadStage.values()) {
            Specification<Lead> spec = spec(new LeadFilter(q, stage, ownerId, unassigned, null, null, false));
            if (stage.isClosed()) {
                Instant since = now.minus(CLOSED_WINDOW);
                spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("stageChangedAt"), since));
            }
            Page<Lead> page = leads.findAll(spec, PageRequest.of(0, BOARD_LIMIT, Sort.by(Sort.Direction.DESC, "stageChangedAt")));
            byStage.put(stage, page.getContent());
            totals.put(stage, new long[] {page.getTotalElements()});
            all.addAll(page.getContent());
        }
        Map<UUID, Instant> next = nextActivities(all);
        Map<UUID, String> names = directory.names(all.stream().map(Lead::getOwnerId).toList());
        for (LeadStage stage : LeadStage.values()) {
            List<LeadSummary> cards = byStage.get(stage).stream().map(l -> LeadSummary.from(l, names, next.get(l.getId()), now)).toList();
            var value = byStage.get(stage).stream().map(Lead::getEstimatedBudget).filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            columns.add(new BoardColumn(stage, stage.label(), totals.get(stage)[0], value, cards));
        }
        return columns;
    }

    @Transactional(readOnly = true)
    public LeadDetail detail(UUID id) {
        Lead l = get(id);
        List<StageChange> history = stageChanges.findByLeadIdOrderByChangedAtDescSeqDesc(id);
        List<Interaction> notes = interactions.findByLeadIdOrderByOccurredAtDesc(id);
        List<Activity> acts = activities.findByLeadIdOrderByDueAt(id);
        Set<UUID> ids = new HashSet<>();
        ids.add(l.getOwnerId());
        ids.add(l.getCreatedBy());
        history.forEach(h -> ids.add(h.getChangedBy()));
        notes.forEach(n -> ids.add(n.getAuthorId()));
        acts.forEach(a -> { ids.add(a.getAssigneeId()); ids.add(a.getCompletedBy()); });
        Map<UUID, String> names = directory.names(ids);
        Instant now = Instant.now(clock);
        return new LeadDetail(l.getId(), l.getTitle(), l.getContactName(), l.getContactEmail(), l.getContactPhone(), l.getCompanyName(),
            l.getCompanyId(), l.getContactId(), l.getSector(), l.getNeed(), l.getEstimatedBudget(), Arrays.asList(l.getServices()),
            l.getSource(), l.getStage(), l.getTemperature(), l.getOwnerId(), names.get(l.getOwnerId()), l.getLostReason(),
            l.getDiagnosticRequestId(), l.getClientId(), l.getConvertedAt(), l.getStageChangedAt(), l.getArchivedAt() != null,
            l.getCreatedAt(), l.getUpdatedAt(), l.getCreatedBy() == null ? "Formulario web" : names.get(l.getCreatedBy()),
            history.stream().map(h -> StageChangeView.from(h, names)).toList(),
            notes.stream().map(n -> InteractionView.from(n, names)).toList(),
            acts.stream().map(a -> ActivityView.from(a, l.getTitle(), names, now)).toList());
    }

    // ---------- Escritura ----------

    @Transactional
    public Lead create(LeadRequest in, AuthenticatedUser actor) {
        Instant now = Instant.now(clock);
        Lead lead = new Lead(in.source() == null ? LeadSource.DIRECT : in.source(), actor.id(), now);
        applyDetails(lead, in, actor.id(), now);
        UUID owner = in.ownerId() == null ? actor.id() : in.ownerId();
        requireCanAssign(actor, owner);
        lead.assignTo(owner, actor.id(), now);
        leads.save(lead);
        stageChanges.save(new StageChange(lead.getId(), null, LeadStage.NUEVO, "Prospecto creado", actor.id(), now));
        audit.record(actor.id(), "lead.created", "LEAD", lead.getId(), "Creó el prospecto «" + lead.getTitle() + "»", null);
        return lead;
    }

    @Transactional
    public Lead update(UUID id, LeadRequest in, AuthenticatedUser actor) {
        Lead lead = get(id);
        lead.requireNotArchived();
        applyDetails(lead, in, actor.id(), Instant.now(clock));
        audit.record(actor.id(), "lead.updated", "LEAD", id, "Actualizó el prospecto «" + lead.getTitle() + "»", null);
        return lead;
    }

    @Transactional
    public Lead assign(UUID id, UUID ownerId, AuthenticatedUser actor) {
        Lead lead = get(id);
        lead.requireNotArchived();
        requireCanAssign(actor, ownerId);
        lead.assignTo(ownerId, actor.id(), Instant.now(clock));
        String who = ownerId == null ? "nadie" : directory.names(List.of(ownerId)).getOrDefault(ownerId, "otro usuario");
        audit.record(actor.id(), "lead.assigned", "LEAD", id, "Asignó «" + lead.getTitle() + "» a " + who, null);
        return lead;
    }

    @Transactional
    public Lead moveStage(UUID id, LeadStage target, String note, String lostReason, AuthenticatedUser actor) {
        Lead lead = get(id);
        if (lead.getStage() == target) return lead;
        Instant now = Instant.now(clock);
        LeadStage previous = lead.moveTo(target, lostReason, actor.id(), now);
        String historyNote = target == LeadStage.PERDIDO ? "Motivo: " + lead.getLostReason() : blankToNull(note);
        stageChanges.save(new StageChange(id, previous, target, historyNote, actor.id(), now));
        audit.record(actor.id(), "lead.stage_changed", "LEAD", id,
            "Movió «" + lead.getTitle() + "» de " + previous.label() + " a " + target.label(),
            Map.of("from", previous.name(), "to", target.name()));
        return lead;
    }

    @Transactional
    public Lead archive(UUID id, boolean archived, AuthenticatedUser actor) {
        Lead lead = get(id);
        Instant now = Instant.now(clock);
        if (archived) lead.archive(actor.id(), now); else lead.restore(actor.id(), now);
        audit.record(actor.id(), archived ? "lead.archived" : "lead.restored", "LEAD", id,
            (archived ? "Archivó" : "Restauró") + " el prospecto «" + lead.getTitle() + "»", null);
        return lead;
    }

    @Transactional
    public Interaction addInteraction(UUID leadId, InteractionRequest in, AuthenticatedUser actor) {
        Lead lead = get(leadId);
        lead.requireNotArchived();
        Instant now = Instant.now(clock);
        Instant when = in.occurredAt() == null ? now : in.occurredAt();
        if (when.isAfter(now.plus(Duration.ofMinutes(5)))) throw new BusinessRuleException("Una interacción no puede tener fecha futura; usa una actividad.");
        Interaction saved = interactions.save(new Interaction(leadId, in.type(), in.summary().strip(), when, actor.id(), now));
        lead.assignTo(lead.getOwnerId(), actor.id(), now); // marca el prospecto como actualizado
        return saved;
    }

    @Transactional
    public Activity addActivity(UUID leadId, ActivityRequest in, AuthenticatedUser actor) {
        Lead lead = get(leadId);
        lead.requireNotArchived();
        UUID assignee = in.assigneeId() == null ? actor.id() : in.assigneeId();
        requireCanAssign(actor, assignee);
        Activity saved = activities.save(new Activity(leadId, in.type(), in.title().strip(), in.dueAt(), assignee, actor.id(), Instant.now(clock)));
        audit.record(actor.id(), "activity.created", "LEAD", leadId, "Programó «" + saved.getTitle() + "»", null);
        return saved;
    }

    @Transactional
    public Activity updateActivity(UUID activityId, ActivityRequest in, AuthenticatedUser actor) {
        Activity a = activities.findById(activityId).orElseThrow(() -> new NotFoundException("No existe la actividad"));
        UUID assignee = in.assigneeId() == null ? a.getAssigneeId() : in.assigneeId();
        requireCanAssign(actor, assignee);
        a.update(in.type(), in.title().strip(), in.dueAt(), assignee);
        return a;
    }

    @Transactional
    public Activity setActivityDone(UUID activityId, boolean done, AuthenticatedUser actor) {
        Activity a = activities.findById(activityId).orElseThrow(() -> new NotFoundException("No existe la actividad"));
        if (done) a.complete(actor.id(), Instant.now(clock)); else a.reopen();
        return a;
    }

    public record ActivityFilter(UUID assigneeId, String status) {}

    @Transactional(readOnly = true)
    public Page<ActivityView> activities(ActivityFilter filter, Pageable pageable) {
        Instant now = Instant.now(clock);
        boolean done = "done".equals(filter.status());
        Instant before = "overdue".equals(filter.status()) ? now : null;
        Page<Activity> page = activities.search(filter.assigneeId(), done, before, pageable);
        Map<UUID, String> titles = new HashMap<>();
        leads.findAllById(page.getContent().stream().map(Activity::getLeadId).toList()).forEach(l -> titles.put(l.getId(), l.getTitle()));
        Map<UUID, String> names = directory.names(page.getContent().stream()
            .flatMap(a -> Stream.of(a.getAssigneeId(), a.getCompletedBy())).toList());
        return page.map(a -> ActivityView.from(a, titles.get(a.getLeadId()), names, now));
    }

    // ---------- Formulario web → prospecto ----------

    /**
     * Cada solicitud del formulario público crea su prospecto en la misma transacción
     * (si falla, la solicitud tampoco se guarda: nunca queda una sin la otra). Idempotente.
     */
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onDiagnosticRequest(DiagnosticRequestCreatedEvent e) {
        if (leads.existsByDiagnosticRequestId(e.id())) return;
        Instant now = Instant.now(clock);
        Lead lead = new Lead(LeadSource.WEB_FORM, null, now);
        lead.updateDetails("Diagnóstico gratuito · " + (e.company() == null ? e.fullName() : e.company()),
            e.fullName(), e.email(), e.phone(), e.company(), e.sector(), e.need(), null, new String[0], Temperature.WARM, null, now);
        lead.fromDiagnostic(e.id());
        leads.save(lead);
        stageChanges.save(new StageChange(lead.getId(), null, LeadStage.NUEVO, "Llegó desde el formulario web", null, now));
    }

    /** Una solicitud cuyo prospecto ya es cliente no se borra: el historial comercial debe conservarse. */
    @Override
    @Transactional(readOnly = true)
    public void checkCanDelete(UUID diagnosticRequestId) {
        leads.findByDiagnosticRequestId(diagnosticRequestId).filter(Lead::isConverted).ifPresent(l -> {
            throw new BusinessRuleException("Esta solicitud ya se convirtió en cliente. Elimina sus datos desde el expediente del cliente.");
        });
    }

    // ---------- Internos ----------

    Lead get(UUID id) {
        return leads.findById(id).orElseThrow(() -> new NotFoundException("No existe el prospecto"));
    }

    private void applyDetails(Lead lead, LeadRequest in, UUID actor, Instant now) {
        UUID companyId = in.companyId();
        String companyName = blankToNull(in.companyName());
        if (companyId != null) {
            Company company = companies.findById(companyId).orElseThrow(() -> new BusinessRuleException("La empresa elegida no existe."));
            companyName = company.getName();
        }
        if (in.contactId() != null) {
            Contact contact = contacts.findById(in.contactId()).orElseThrow(() -> new BusinessRuleException("El contacto elegido no existe."));
            if (companyId != null && contact.getCompanyId() != null && !contact.getCompanyId().equals(companyId)) {
                throw new BusinessRuleException("El contacto no pertenece a la empresa elegida.");
            }
        }
        String[] services = in.services() == null ? new String[0]
            : in.services().stream().map(s -> s.toUpperCase(Locale.ROOT)).distinct().toArray(String[]::new);
        lead.updateDetails(in.title().strip(), in.contactName().strip(), lower(in.contactEmail()), blankToNull(in.contactPhone()),
            companyName, in.sector(), blankToNull(in.need()), in.estimatedBudget(), services, in.temperature(), actor, now);
        lead.link(companyId, in.contactId(), actor, now);
    }

    private void requireCanAssign(AuthenticatedUser actor, UUID target) {
        if (target == null || target.equals(actor.id())) return;
        if (!actor.permissions().contains("crm.assign")) {
            throw new BusinessRuleException("Solo puedes asignarte prospectos y actividades a ti. Para asignarlos a otra persona necesitas el permiso de asignación.");
        }
        if (!directory.isActiveInternal(target)) throw new BusinessRuleException("El responsable elegido no es un usuario interno activo.");
    }

    private Map<UUID, Instant> nextActivities(List<Lead> list) {
        if (list.isEmpty()) return Map.of();
        Map<UUID, Instant> next = new HashMap<>();
        activities.nextPendingByLead(list.stream().map(Lead::getId).toList())
            .forEach(row -> next.put(row.getLeadId(), row.getDueAt()));
        return next;
    }

    private static Specification<Lead> spec(LeadFilter f) {
        return (root, cq, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (!f.includeArchived()) p.add(cb.isNull(root.get("archivedAt")));
            if (f.stage() != null) p.add(cb.equal(root.get("stage"), f.stage()));
            if (f.unassigned()) p.add(cb.isNull(root.get("ownerId")));
            else if (f.ownerId() != null) p.add(cb.equal(root.get("ownerId"), f.ownerId()));
            if (f.source() != null) p.add(cb.equal(root.get("source"), f.source()));
            if (f.temperature() != null) p.add(cb.equal(root.get("temperature"), f.temperature()));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + f.q().strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.or(
                    cb.like(cb.lower(root.get("title")), like, '\\'),
                    cb.like(cb.lower(root.get("contactName")), like, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("companyName"), "")), like, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("contactEmail"), "")), like, '\\'),
                    cb.like(cb.coalesce(root.get("contactPhone"), ""), like, '\\')));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.strip();
    }

    private static String lower(String v) {
        String s = blankToNull(v);
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }
}
