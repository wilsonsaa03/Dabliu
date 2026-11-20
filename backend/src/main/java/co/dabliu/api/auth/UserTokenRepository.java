package co.dabliu.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserTokenRepository extends JpaRepository<UserToken, UUID> {

    Optional<UserToken> findByTokenHash(String tokenHash);

    /** Al emitir un enlace nuevo, los anteriores del mismo tipo dejan de servir. */
    @Modifying
    @Query("update UserToken t set t.usedAt = :now where t.userId = :userId and t.purpose = :purpose and t.usedAt is null")
    int invalidatePending(@Param("userId") UUID userId, @Param("purpose") UserToken.Purpose purpose, @Param("now") Instant now);
}
