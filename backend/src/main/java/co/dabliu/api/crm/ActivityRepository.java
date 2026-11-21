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

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findByLeadIdOrderByDueAt(UUID leadId);

    @Query("""
        select a from Activity a
        where (:assignee is null or a.assigneeId = :assignee)
          and ((:done = true and a.completedAt is not null) or (:done = false and a.completedAt is null))
          and (cast(:before as timestamp) is null or a.dueAt < :before)
        """)
    Page<Activity> search(@Param("assignee") UUID assignee, @Param("done") boolean done, @Param("before") Instant before,
                          Pageable pageable);

    long countByAssigneeIdAndCompletedAtIsNullAndDueAtBefore(UUID assigneeId, Instant now);

    long countByCompletedAtIsNullAndDueAtBefore(Instant now);

    /** Próxima actividad pendiente de cada prospecto, para una página completa en una sola consulta. */
    @Query("select a.leadId as leadId, min(a.dueAt) as dueAt from Activity a "
        + "where a.leadId in :leadIds and a.completedAt is null group by a.leadId")
    List<NextActivity> nextPendingByLead(@Param("leadIds") Collection<UUID> leadIds);

    @Query("select a from Activity a where a.completedAt is null and a.assigneeId = :assignee and a.dueAt < :until order by a.dueAt")
    List<Activity> upcomingFor(@Param("assignee") UUID assignee, @Param("until") Instant until, Pageable pageable);

    interface NextActivity {
        UUID getLeadId();
        Instant getDueAt();
    }
}
