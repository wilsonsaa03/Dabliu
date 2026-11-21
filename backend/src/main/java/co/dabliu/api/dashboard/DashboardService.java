package co.dabliu.api.dashboard;

import co.dabliu.api.audit.ActivityLog;
import co.dabliu.api.audit.ActivityLogRepository;
import co.dabliu.api.auth.AuthenticatedUser;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.diagnostic.DiagnosticRequestRepository;
import co.dabliu.api.diagnostic.DiagnosticStatus;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import co.dabliu.api.users.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Indicadores del panel. Todo sale de la base de datos; un bloque solo se incluye si el usuario
 * tiene permiso para verlo. Los módulos de fases siguientes (CRM, proyectos, finanzas) agregan
 * sus propios bloques cuando existan: aquí no se muestran cifras que aún no se registran.
 */
@Service
public class DashboardService {

    public static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final int MAX_DAYS = 366;

    private final DiagnosticRequestRepository diagnostics;
    private final UserRepository users;
    private final ActivityLogRepository activity;
    private final co.dabliu.api.crm.LeadRepository leads;
    private final co.dabliu.api.crm.StageChangeRepository stageChanges;
    private final co.dabliu.api.crm.ActivityRepository crmActivities;
    private final Clock clock;

    public DashboardService(DiagnosticRequestRepository diagnostics, UserRepository users, ActivityLogRepository activity,
                            co.dabliu.api.crm.LeadRepository leads, co.dabliu.api.crm.StageChangeRepository stageChanges,
                            co.dabliu.api.crm.ActivityRepository crmActivities, Clock clock) {
        this.diagnostics = diagnostics;
        this.users = users;
        this.activity = activity;
        this.leads = leads;
        this.stageChanges = stageChanges;
        this.crmActivities = crmActivities;
        this.clock = clock;
    }

    public record Period(LocalDate from, LocalDate to, String timezone) {}
    public record DayPoint(LocalDate day, long total) {}
    public record DiagnosticsBlock(long receivedInPeriod, long receivedPreviousPeriod, long pendingNew,
                                   Map<DiagnosticStatus, Long> byStatus, List<DayPoint> perDay) {}
    public record UsersBlock(long active, long invited, long inactive) {}
    public record ActivityItem(UUID id, String actorName, String action, String entityType, UUID entityId,
                               String summary, Instant createdAt) {}
    public record FunnelStage(LeadStage stage, String label, long total, java.math.BigDecimal value) {}
    public record UpcomingActivity(UUID id, UUID leadId, String title, Instant dueAt, boolean overdue) {}
    public record CrmBlock(long newLeads, long newLeadsPrevious, long openOpportunities, java.math.BigDecimal pipelineValue,
                           long wonInPeriod, long lostInPeriod, long myOverdueActivities, List<FunnelStage> funnel,
                           List<UpcomingActivity> myUpcoming) {}
    public record Summary(Period period, DiagnosticsBlock diagnostics, CrmBlock crm, UsersBlock users, List<ActivityItem> recentActivity) {}

    @Transactional(readOnly = true)
    public Summary summary(LocalDate from, LocalDate to, AuthenticatedUser user) {
        LocalDate today = LocalDate.now(clock.withZone(ZONE));
        LocalDate end = to == null ? today : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) throw new BusinessRuleException("La fecha inicial no puede ser posterior a la final.");
        if (ChronoUnit.DAYS.between(start, end) >= MAX_DAYS) throw new BusinessRuleException("El periodo máximo es de un año.");

        Instant fromInstant = start.atStartOfDay(ZONE).toInstant();
        Instant toInstant = end.plusDays(1).atStartOfDay(ZONE).toInstant();
        long days = ChronoUnit.DAYS.between(start, end) + 1;

        DiagnosticsBlock diagnosticsBlock = null;
        if (user.permissions().contains("diagnostics.read")) {
            Map<DiagnosticStatus, Long> byStatus = new EnumMap<>(DiagnosticStatus.class);
            for (DiagnosticStatus s : DiagnosticStatus.values()) byStatus.put(s, 0L);
            diagnostics.countGroupedByStatus().forEach(c -> byStatus.put(c.getStatus(), c.getTotal()));

            Map<LocalDate, Long> counts = new HashMap<>();
            diagnostics.countPerDay(fromInstant, toInstant).forEach(d -> counts.put(d.getDay(), d.getTotal()));
            List<DayPoint> perDay = new ArrayList<>();
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) perDay.add(new DayPoint(d, counts.getOrDefault(d, 0L)));

            diagnosticsBlock = new DiagnosticsBlock(
                diagnostics.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(fromInstant, toInstant),
                diagnostics.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(fromInstant.minus(days, ChronoUnit.DAYS), fromInstant),
                byStatus.get(DiagnosticStatus.NEW),
                byStatus, perDay);
        }

        CrmBlock crmBlock = null;
        if (user.permissions().contains("crm.read")) {
            Instant now = Instant.now(clock);
            Map<LeadStage, co.dabliu.api.crm.LeadRepository.StageSummary> byStage = new EnumMap<>(LeadStage.class);
            leads.summarizeByStage().forEach(r -> byStage.put(r.getStage(), r));
            List<FunnelStage> funnel = new ArrayList<>();
            for (LeadStage st : LeadStage.values()) {
                var r = byStage.get(st);
                funnel.add(new FunnelStage(st, st.label(), r == null ? 0 : r.getTotal(), r == null ? java.math.BigDecimal.ZERO : r.getValue()));
            }
            List<UpcomingActivity> upcoming = crmActivities
                .upcomingFor(user.id(), now.plus(7, ChronoUnit.DAYS), org.springframework.data.domain.PageRequest.of(0, 6)).stream()
                .map(a -> new UpcomingActivity(a.getId(), a.getLeadId(), a.getTitle(), a.getDueAt(), a.isOverdue(now))).toList();
            crmBlock = new CrmBlock(
                leads.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(fromInstant, toInstant),
                leads.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(fromInstant.minus(days, ChronoUnit.DAYS), fromInstant),
                leads.countByStageInAndArchivedAtIsNull(LeadStage.open()),
                leads.sumBudgetByStages(LeadStage.open()),
                stageChanges.countByToStageAndChangedAtGreaterThanEqualAndChangedAtLessThan(LeadStage.GANADO, fromInstant, toInstant),
                stageChanges.countByToStageAndChangedAtGreaterThanEqualAndChangedAtLessThan(LeadStage.PERDIDO, fromInstant, toInstant),
                crmActivities.countByAssigneeIdAndCompletedAtIsNullAndDueAtBefore(user.id(), now),
                funnel, upcoming);
        }

        UsersBlock usersBlock = user.permissions().contains("users.read")
            ? new UsersBlock(users.countByStatus(UserStatus.ACTIVE), users.countByStatus(UserStatus.INVITED), users.countByStatus(UserStatus.INACTIVE))
            : null;

        List<ActivityItem> recent = null;
        if (user.permissions().contains("audit.read")) {
            List<ActivityLog> logs = activity.findTop8ByOrderByCreatedAtDesc();
            Map<UUID, String> names = users.findAllById(logs.stream().map(ActivityLog::getActorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, User::getFullName));
            recent = logs.stream().map(a -> new ActivityItem(a.getId(),
                a.getActorId() == null ? "Sistema" : names.getOrDefault(a.getActorId(), "Usuario eliminado"),
                a.getAction(), a.getEntityType(), a.getEntityId(), a.getSummary(), a.getCreatedAt())).toList();
        }

        return new Summary(new Period(start, end, ZONE.getId()), diagnosticsBlock, crmBlock, usersBlock, recent);
    }
}
