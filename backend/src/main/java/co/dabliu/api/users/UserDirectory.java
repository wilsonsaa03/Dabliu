package co.dabliu.api.users;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Nombres de usuarios para mostrar en otros módulos, en una sola consulta (evita N+1). */
@Component
public class UserDirectory {

    private final UserRepository users;

    public UserDirectory(UserRepository users) {
        this.users = users;
    }

    /** Mapa mutable que admite get(null) (Map.of() lanzaría NullPointerException con ids nulos). */
    @Transactional(readOnly = true)
    public Map<UUID, String> names(Collection<UUID> ids) {
        Map<UUID, String> result = new HashMap<>();
        var wanted = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (wanted.isEmpty()) return result;
        users.findAllById(wanted).forEach(u -> result.put(u.getId(), u.getFullName()));
        return result;
    }

    public record Person(UUID id, String fullName) {}

    /** Personas activas con un permiso, para selectores (sin datos de contacto). */
    @Transactional(readOnly = true)
    public java.util.List<Person> withPermission(String permission) {
        return users.findActiveWithPermission(permission).stream().map(u -> new Person(u.getId(), u.getFullName())).toList();
    }

    /** El usuario existe, está activo y no es cliente (para asignar responsables internos). */
    @Transactional(readOnly = true)
    public boolean isActiveInternal(UUID id) {
        return users.findWithAuthoritiesById(id)
            .filter(u -> u.getStatus() == UserStatus.ACTIVE && !u.hasRole(Role.CLIENT))
            .isPresent();
    }
}
