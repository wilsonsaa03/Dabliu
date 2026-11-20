package co.dabliu.api.auth;

import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Convierte un JWT válido en el usuario real: lo busca en la base de datos, verifica que siga
 * activo y que el token no haya sido invalidado (versión), y carga sus roles y permisos actuales.
 * Autoridades: "ROLE_<código>" por rol y el código de cada permiso (p. ej. "users.manage").
 */
@Component
public class UserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public UserJwtAuthenticationConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidBearerTokenException("Token sin usuario válido");
        }
        User user = users.findWithAuthoritiesById(id)
            .orElseThrow(() -> new InvalidBearerTokenException("Usuario inexistente"));
        Number version = jwt.getClaim(AccessTokenService.VERSION_CLAIM);
        if (!user.canLogIn() || version == null || version.intValue() != user.getTokenVersion()) {
            throw new InvalidBearerTokenException("Sesión invalidada");
        }

        List<GrantedAuthority> authorities = new ArrayList<>();
        user.roleCodes().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
        user.permissionCodes().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));

        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getFullName(),
            user.roleCodes(), user.permissionCodes());
        return UsernamePasswordAuthenticationToken.authenticated(principal, jwt, authorities);
    }
}
