package co.dabliu.api.audit;

import co.dabliu.api.auth.AccessLogService;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import co.dabliu.api.users.dto.UserDtos.AccessLogView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auditoría", description = "Bitácora de actividad e historial de acceso")
@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasAuthority('audit.read')")
public class AuditController {

    private final ActivityLogService activity;
    private final AccessLogService accessLog;
    private final UserRepository users;

    public AuditController(ActivityLogService activity, AccessLogService accessLog, UserRepository users) {
        this.activity = activity;
        this.accessLog = accessLog;
        this.users = users;
    }

    public record ActivityView(UUID id, UUID actorId, String actorName, String action, String entityType, UUID entityId,
                               String summary, String details, Instant createdAt) {}

    @Operation(summary = "Bitácora de actividad (filtrable por tipo y registro)")
    @GetMapping("/activity")
    public PagedModel<ActivityView> activity(@RequestParam(required = false) String entityType,
                                             @RequestParam(required = false) UUID entityId,
                                             @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ActivityLog> page = activity.list(entityType, entityId, pageable);
        Map<UUID, String> names = actorNames(page.map(ActivityLog::getActorId).toSet());
        return new PagedModel<>(page.map(a -> new ActivityView(a.getId(), a.getActorId(),
            a.getActorId() == null ? "Sistema" : names.getOrDefault(a.getActorId(), "Usuario eliminado"),
            a.getAction(), a.getEntityType(), a.getEntityId(), a.getSummary(), a.getDetails(), a.getCreatedAt())));
    }

    @Operation(summary = "Historial de acceso de todos los usuarios")
    @GetMapping("/access")
    public PagedModel<AccessLogView> access(
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return new PagedModel<>(accessLog.all(pageable).map(AccessLogView::from));
    }

    /** Nombres de los actores en una sola consulta (evita N+1). */
    private Map<UUID, String> actorNames(Set<UUID> ids) {
        ids.remove(null);
        if (ids.isEmpty()) return Map.of();
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
    }
}
