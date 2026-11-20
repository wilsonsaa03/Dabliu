package co.dabliu.api.diagnostic;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiagnosticRequestRepository extends JpaRepository<DiagnosticRequest, UUID> {

    Page<DiagnosticRequest> findByStatus(DiagnosticStatus status, Pageable pageable);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant from, Instant to);

    long countByStatus(DiagnosticStatus status);

    @Query("select d.status as status, count(d) as total from DiagnosticRequest d group by d.status")
    List<StatusCount> countGroupedByStatus();

    /** Solicitudes por día (calendario de Bogotá) dentro del periodo. */
    @Query(value = """
        SELECT CAST((created_at AT TIME ZONE 'America/Bogota') AS date) AS day, COUNT(*) AS total
        FROM diagnostic_requests
        WHERE created_at >= :from AND created_at < :to
        GROUP BY day ORDER BY day""", nativeQuery = true)
    List<DayCount> countPerDay(@Param("from") Instant from, @Param("to") Instant to);

    interface StatusCount {
        DiagnosticStatus getStatus();
        long getTotal();
    }

    interface DayCount {
        java.time.LocalDate getDay();
        long getTotal();
    }
}
