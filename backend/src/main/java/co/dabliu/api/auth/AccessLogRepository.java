package co.dabliu.api.auth;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessLogRepository extends JpaRepository<AccessLogEntry, UUID> {

    Page<AccessLogEntry> findByUserId(UUID userId, Pageable pageable);
}
