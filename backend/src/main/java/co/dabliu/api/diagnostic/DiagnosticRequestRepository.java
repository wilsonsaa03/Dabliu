package co.dabliu.api.diagnostic;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagnosticRequestRepository extends JpaRepository<DiagnosticRequest, UUID> {

    Page<DiagnosticRequest> findByStatus(DiagnosticStatus status, Pageable pageable);
}
