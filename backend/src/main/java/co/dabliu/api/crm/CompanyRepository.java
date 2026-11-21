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

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    @Query("""
        select c from Company c
        where (:archived = true or c.archivedAt is null)
          and (:q = '' or lower(c.name) like concat('%', :q, '%') or coalesce(c.taxId, '') like concat('%', :q, '%'))
        """)
    Page<Company> search(@Param("q") String q, @Param("archived") boolean includeArchived, Pageable pageable);

    boolean existsByTaxId(String taxId);
    boolean existsByTaxIdAndIdNot(String taxId, UUID id);
}
