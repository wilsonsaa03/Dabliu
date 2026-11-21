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

public interface InteractionRepository extends JpaRepository<Interaction, UUID> {
    List<Interaction> findByLeadIdOrderByOccurredAtDesc(UUID leadId);
}
