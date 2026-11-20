package co.dabliu.api.audit;

import co.dabliu.api.auth.CurrentUser;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Escribe la bitácora. Corre dentro de la transacción de la operación: si la operación
 * falla, su registro tampoco queda (la bitácora nunca dice que pasó algo que no pasó).
 */
@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;
    private final JsonMapper json;
    private final Clock clock;

    public ActivityLogService(ActivityLogRepository repository, JsonMapper json, Clock clock) {
        this.repository = repository;
        this.json = json;
        this.clock = clock;
    }

    /** Registra una acción hecha por el usuario autenticado (o por el sistema si no hay sesión). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String entityType, UUID entityId, String summary, Map<String, ?> details) {
        record(CurrentUser.idOrNull(), action, entityType, entityId, summary, details);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, String action, String entityType, UUID entityId, String summary, Map<String, ?> details) {
        String detailsJson = details == null || details.isEmpty() ? null : json.writeValueAsString(details);
        repository.save(new ActivityLog(actorId, action, entityType, entityId, summary, detailsJson, Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    public Page<ActivityLog> list(String entityType, UUID entityId, Pageable pageable) {
        if (entityType != null && entityId != null) return repository.findByEntityTypeAndEntityId(entityType, entityId, pageable);
        if (entityType != null) return repository.findByEntityType(entityType, pageable);
        return repository.findAll(pageable);
    }
}
