package co.dabliu.api.auth;

import co.dabliu.api.config.DabliuProperties;
import co.dabliu.api.users.User;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Emite el JWT de acceso (corta duración). Solo lleva el id y la versión de token del usuario:
 * roles y permisos se leen de la base de datos en cada solicitud, así un cambio de rol o una
 * desactivación aplican de inmediato.
 */
@Service
public class AccessTokenService {

    static final String VERSION_CLAIM = "ver";

    private final JwtEncoder encoder;
    private final DabliuProperties.Auth config;
    private final Clock clock;

    public AccessTokenService(JwtEncoder encoder, DabliuProperties properties, Clock clock) {
        this.encoder = encoder;
        this.config = properties.auth();
        this.clock = clock;
    }

    public String issue(User user) {
        Instant now = Instant.now(clock);
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer(JwtConfig.ISSUER)
            .subject(user.getId().toString())
            .id(UUID.randomUUID().toString())
            .issuedAt(now)
            .expiresAt(now.plus(config.accessTokenTtl()))
            .claim(VERSION_CLAIM, user.getTokenVersion())
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
