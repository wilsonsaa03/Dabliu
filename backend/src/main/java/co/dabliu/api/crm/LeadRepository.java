package co.dabliu.api.crm;

import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.LeadHistory.Activity;
import co.dabliu.api.crm.LeadHistory.Interaction;
import co.dabliu.api.crm.LeadHistory.StageChange;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {
    /** Con bloqueo: dos conversiones simultáneas del mismo prospecto no pueden crear dos clientes. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Lead l where l.id = :id")
    Optional<Lead> findForUpdate(@Param("id") UUID id);

    boolean existsByDiagnosticRequestId(UUID diagnosticRequestId);

    Optional<Lead> findByDiagnosticRequestId(UUID diagnosticRequestId);

    List<Lead> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant from, Instant to);

    long countByStageInAndArchivedAtIsNull(Collection<LeadStage> stages);

    @Query("select coalesce(sum(l.estimatedBudget), 0) from Lead l where l.stage in :stages and l.archivedAt is null")
    BigDecimal sumBudgetByStages(@Param("stages") Collection<LeadStage> stages);

    @Query("select l.stage as stage, count(l) as total, coalesce(sum(l.estimatedBudget), 0) as value "
        + "from Lead l where l.archivedAt is null group by l.stage")
    List<StageSummary> summarizeByStage();

    interface StageSummary {
        LeadStage getStage();
        long getTotal();
        BigDecimal getValue();
    }
}
