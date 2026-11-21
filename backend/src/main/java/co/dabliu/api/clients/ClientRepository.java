package co.dabliu.api.clients;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientRepository extends JpaRepository<Client, UUID> {

    Optional<Client> findByCompanyId(UUID companyId);

    @Query("""
        select c from Client c
        where (:q = '' or lower(c.name) like concat('%', :q, '%') or lower(coalesce(c.email, '')) like concat('%', :q, '%'))
        """)
    Page<Client> search(@Param("q") String q, Pageable pageable);

    long countByStatus(Client.Status status);
}
