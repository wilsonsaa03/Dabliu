package co.dabliu.api.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    Page<ActivityLog> findByEntityTypeAndEntityId(String entityType, UUID entityId, Pageable pageable);

    Page<ActivityLog> findByEntityType(String entityType, Pageable pageable);

    List<ActivityLog> findTop8ByOrderByCreatedAtDesc();
}
