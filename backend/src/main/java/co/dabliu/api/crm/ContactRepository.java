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

public interface ContactRepository extends JpaRepository<Contact, UUID> {
    @Query("""
        select c from Contact c
        where (:archived = true or c.archivedAt is null)
          and (:companyId is null or c.companyId = :companyId)
          and (:q = '' or lower(c.fullName) like concat('%', :q, '%') or lower(coalesce(c.email, '')) like concat('%', :q, '%'))
        """)
    Page<Contact> search(@Param("q") String q, @Param("companyId") UUID companyId, @Param("archived") boolean includeArchived,
                         Pageable pageable);

    List<Contact> findByCompanyIdAndArchivedAtIsNullOrderByFullName(UUID companyId);
}
