package co.dabliu.api.auth;

import co.dabliu.api.common.ClientInfo;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Historial de acceso. Se escribe en su propia transacción: un intento fallido queda
 * registrado aunque la operación que lo produjo termine en error.
 */
@Service
public class AccessLogService {

    private final AccessLogRepository repository;
    private final Clock clock;

    public AccessLogService(AccessLogRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID userId, String email, AccessLogEntry.Event event, ClientInfo client) {
        repository.save(new AccessLogEntry(userId, email, event,
            client == null ? null : client.ip(), client == null ? null : client.userAgent(), Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    public Page<AccessLogEntry> forUser(UUID userId, Pageable pageable) {
        return repository.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AccessLogEntry> all(Pageable pageable) {
        return repository.findAll(pageable);
    }
}
