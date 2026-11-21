package co.dabliu.api.users;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Usuario con roles y permisos en una sola consulta (se usa en cada solicitud autenticada). */
    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    @Query("select u from User u where u.id = :id")
    Optional<User> findWithAuthoritiesById(@Param("id") UUID id);

    @Query("select count(u) from User u join u.roles r where r.code = :roleCode and u.status = co.dabliu.api.users.UserStatus.ACTIVE")
    long countActiveWithRole(@Param("roleCode") String roleCode);

    long countByStatus(UserStatus status);

    /** Usuarios activos con un permiso (p. ej. responsables comerciales posibles). */
    @Query("select distinct u from User u join u.roles r join r.permissions p "
        + "where u.status = co.dabliu.api.users.UserStatus.ACTIVE and p.code = :permission order by u.fullName")
    java.util.List<User> findActiveWithPermission(@Param("permission") String permission);
}
