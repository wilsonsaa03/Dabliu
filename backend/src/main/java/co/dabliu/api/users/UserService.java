package co.dabliu.api.users;

import co.dabliu.api.audit.ActivityLogService;
import co.dabliu.api.auth.AuthService;
import co.dabliu.api.auth.AuthenticatedUser;
import co.dabliu.api.auth.RefreshTokenRepository;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.common.ConflictException;
import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.users.dto.UserDtos.InviteUserRequest;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Subquery;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administración de usuarios. Reglas de protección:
 * - Solo un SUPER_ADMIN puede crear, modificar o asignar el rol SUPER_ADMIN.
 * - Nadie se desactiva a sí mismo ni se quita su propio rol SUPER_ADMIN.
 * - Siempre debe quedar al menos un SUPER_ADMIN activo.
 */
@Service
public class UserService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final AuthService auth;
    private final ActivityLogService activity;
    private final Clock clock;

    public UserService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       AuthService auth, ActivityLogService activity, Clock clock) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.auth = auth;
        this.activity = activity;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<User> search(String query, UserStatus status, String roleCode, Pageable pageable) {
        Specification<User> spec = (root, cq, cb) -> cb.conjunction();
        if (status != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        if (query != null && !query.isBlank()) {
            String like = "%" + query.strip().toLowerCase(Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                cb.like(cb.lower(root.get("fullName")), like, '\\'),
                cb.like(root.get("email"), like, '\\')));
        }
        if (roleCode != null && !roleCode.isBlank()) {
            // Subconsulta (EXISTS) en vez de JOIN: no duplica filas y la paginación sigue siendo exacta.
            spec = spec.and((root, cq, cb) -> {
                Subquery<UUID> sub = cq.subquery(UUID.class);
                var u = sub.from(User.class);
                var r = u.join("roles", JoinType.INNER);
                sub.select(u.get("id")).where(cb.equal(u.get("id"), root.get("id")), cb.equal(r.get("code"), roleCode));
                return cb.exists(sub);
            });
        }
        Page<User> page = users.findAll(spec, pageable);
        page.forEach(u -> u.getRoles().size()); // carga los roles por lotes (@BatchSize), sin N+1
        return page;
    }

    @Transactional(readOnly = true)
    public User get(UUID id) {
        User user = users.findWithAuthoritiesById(id).orElseThrow(() -> new NotFoundException("No existe el usuario"));
        user.getRoles().size();
        return user;
    }

    @Transactional
    public User invite(InviteUserRequest input, AuthenticatedUser actor) {
        String email = AuthService.normalizeEmail(input.email());
        if (users.existsByEmail(email)) throw new ConflictException("Ya existe un usuario con ese correo.");
        Set<Role> newRoles = resolveRoles(input.roles());
        requireCanGrant(actor, newRoles);
        Instant now = Instant.now(clock);
        User user = users.save(User.invited(email, input.fullName().strip(), blankToNull(input.phone()), newRoles, actor.id(), now));
        auth.sendInvitation(user);
        activity.record(actor.id(), "user.invited", "USER", user.getId(), "Invitó a " + user.getFullName(),
            Map.of("email", email, "roles", codes(newRoles)));
        return user;
    }

    @Transactional
    public User resendInvitation(UUID id, AuthenticatedUser actor) {
        User user = get(id);
        requireCanManage(actor, user);
        if (user.getStatus() != UserStatus.INVITED) throw new BusinessRuleException("Solo se reenvía la invitación a usuarios invitados.");
        auth.sendInvitation(user);
        activity.record(actor.id(), "user.invitation_resent", "USER", id, "Reenvió la invitación a " + user.getFullName(), null);
        return user;
    }

    @Transactional
    public User update(UUID id, String fullName, String phone, AuthenticatedUser actor) {
        User user = get(id);
        requireCanManage(actor, user);
        user.updateProfile(fullName.strip(), blankToNull(phone), actor.id(), Instant.now(clock));
        activity.record(actor.id(), "user.updated", "USER", id, "Actualizó los datos de " + user.getFullName(), null);
        return user;
    }

    /** Perfil propio: cualquier usuario autenticado puede cambiar su nombre y teléfono. */
    @Transactional
    public User updateOwnProfile(AuthenticatedUser actor, String fullName, String phone) {
        User user = get(actor.id());
        user.updateProfile(fullName.strip(), blankToNull(phone), actor.id(), Instant.now(clock));
        activity.record(actor.id(), "user.profile_updated", "USER", actor.id(), "Actualizó su perfil", null);
        return user;
    }

    @Transactional
    public User setRoles(UUID id, Set<String> roleCodes, AuthenticatedUser actor) {
        User user = get(id);
        requireCanManage(actor, user);
        Set<Role> newRoles = resolveRoles(roleCodes);
        requireCanGrant(actor, newRoles);
        boolean losesSuperAdmin = user.hasRole(Role.SUPER_ADMIN) && newRoles.stream().noneMatch(r -> r.getCode().equals(Role.SUPER_ADMIN));
        if (losesSuperAdmin) {
            if (user.getId().equals(actor.id())) throw new BusinessRuleException("No puedes quitarte tu propio rol de superadministrador.");
            requireAnotherActiveSuperAdmin(user);
        }
        Set<String> before = user.roleCodes();
        user.replaceRoles(newRoles, actor.id(), Instant.now(clock));
        activity.record(actor.id(), "user.roles_changed", "USER", id, "Cambió los roles de " + user.getFullName(),
            Map.of("before", before.stream().sorted().toList(), "after", codes(newRoles)));
        return user;
    }

    @Transactional
    public User setStatus(UUID id, UserStatus target, AuthenticatedUser actor) {
        User user = get(id);
        requireCanManage(actor, user);
        Instant now = Instant.now(clock);
        switch (target) {
            case INACTIVE -> {
                if (user.getId().equals(actor.id())) throw new BusinessRuleException("No puedes desactivar tu propia cuenta.");
                if (user.getStatus() == UserStatus.INACTIVE) return user;
                if (user.hasRole(Role.SUPER_ADMIN)) requireAnotherActiveSuperAdmin(user);
                user.deactivate(actor.id(), now);
                refreshTokens.revokeAllForUser(user.getId(), "REVOKED", now);
                activity.record(actor.id(), "user.deactivated", "USER", id, "Desactivó a " + user.getFullName(), null);
            }
            case ACTIVE -> {
                if (user.getStatus() != UserStatus.INACTIVE) return user;
                user.reactivate(actor.id(), now);
                activity.record(actor.id(), "user.reactivated", "USER", id, "Reactivó a " + user.getFullName(), null);
            }
            case INVITED -> throw new BusinessRuleException("El estado 'invitado' se asigna solo al invitar.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public List<Role> roles() {
        return roles.findAllWithPermissions();
    }

    // ---------- Reglas ----------

    private Set<Role> resolveRoles(Set<String> codes) {
        Set<String> wanted = codes.stream().map(c -> c.strip().toUpperCase(Locale.ROOT)).collect(Collectors.toSet());
        Set<Role> found = new HashSet<>(roles.findByCodeIn(wanted));
        if (found.size() != wanted.size()) throw new BusinessRuleException("Uno de los roles no existe.");
        if (found.stream().anyMatch(r -> r.getCode().equals(Role.CLIENT)) && found.size() > 1) {
            throw new BusinessRuleException("Un usuario cliente no puede tener roles internos.");
        }
        return found;
    }

    private static void requireCanGrant(AuthenticatedUser actor, Set<Role> newRoles) {
        boolean grantsSuperAdmin = newRoles.stream().anyMatch(r -> r.getCode().equals(Role.SUPER_ADMIN));
        if (grantsSuperAdmin && !actor.hasRole(Role.SUPER_ADMIN)) {
            throw new BusinessRuleException("Solo un superadministrador puede asignar el rol de superadministrador.");
        }
    }

    private static void requireCanManage(AuthenticatedUser actor, User target) {
        if (target.hasRole(Role.SUPER_ADMIN) && !actor.hasRole(Role.SUPER_ADMIN)) {
            throw new BusinessRuleException("Solo un superadministrador puede modificar a otro superadministrador.");
        }
    }

    private void requireAnotherActiveSuperAdmin(User target) {
        long active = users.countActiveWithRole(Role.SUPER_ADMIN);
        boolean targetCounts = target.getStatus() == UserStatus.ACTIVE;
        if (active - (targetCounts ? 1 : 0) < 1) {
            throw new BusinessRuleException("Debe quedar al menos un superadministrador activo.");
        }
    }

    private static List<String> codes(Set<Role> roles) {
        return roles.stream().map(Role::getCode).sorted().toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
