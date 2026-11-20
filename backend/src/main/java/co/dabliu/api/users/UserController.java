package co.dabliu.api.users;

import co.dabliu.api.auth.AccessLogService;
import co.dabliu.api.auth.CurrentUser;
import co.dabliu.api.users.dto.UserDtos.AccessLogView;
import co.dabliu.api.users.dto.UserDtos.InviteUserRequest;
import co.dabliu.api.users.dto.UserDtos.RoleView;
import co.dabliu.api.users.dto.UserDtos.UpdateRolesRequest;
import co.dabliu.api.users.dto.UserDtos.UpdateStatusRequest;
import co.dabliu.api.users.dto.UserDtos.UpdateUserRequest;
import co.dabliu.api.users.dto.UserDtos.UserView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Usuarios", description = "Usuarios internos, roles y perfil propio")
@RestController
@RequestMapping("/api/v1")
public class UserController {

    private final UserService service;
    private final AccessLogService accessLog;
    private final Clock clock;

    public UserController(UserService service, AccessLogService accessLog, Clock clock) {
        this.service = service;
        this.accessLog = accessLog;
        this.clock = clock;
    }

    @Operation(summary = "Busca usuarios (texto en nombre o correo, estado y rol)")
    @PreAuthorize("hasAuthority('users.read')")
    @GetMapping("/users")
    public PagedModel<UserView> list(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) UserStatus status,
                                     @RequestParam(required = false) String role,
                                     @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Instant now = Instant.now(clock);
        return new PagedModel<>(service.search(q, status, role, pageable).map(u -> UserView.from(u, now)));
    }

    @PreAuthorize("hasAuthority('users.read')")
    @GetMapping("/users/{id}")
    public UserView get(@PathVariable UUID id) {
        return view(service.get(id));
    }

    @Operation(summary = "Invita a un usuario: recibe un correo para crear su contraseña")
    @PreAuthorize("hasAuthority('users.manage')")
    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserView invite(@Valid @RequestBody InviteUserRequest body) {
        return view(service.invite(body, CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('users.manage')")
    @PostMapping("/users/{id}/invitation")
    public UserView resendInvitation(@PathVariable UUID id) {
        return view(service.resendInvitation(id, CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('users.manage')")
    @PatchMapping("/users/{id}")
    public UserView update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest body) {
        return view(service.update(id, body.fullName(), body.phone(), CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('users.manage')")
    @PutMapping("/users/{id}/roles")
    public UserView setRoles(@PathVariable UUID id, @Valid @RequestBody UpdateRolesRequest body) {
        return view(service.setRoles(id, body.roles(), CurrentUser.require()));
    }

    @Operation(summary = "Activa o desactiva un usuario (desactivar cierra todas sus sesiones)")
    @PreAuthorize("hasAuthority('users.manage')")
    @PatchMapping("/users/{id}/status")
    public UserView setStatus(@PathVariable UUID id, @Valid @RequestBody UpdateStatusRequest body) {
        return view(service.setStatus(id, body.status(), CurrentUser.require()));
    }

    @Operation(summary = "Historial de acceso de un usuario")
    @PreAuthorize("hasAuthority('audit.read')")
    @GetMapping("/users/{id}/access-log")
    public PagedModel<AccessLogView> accessLog(@PathVariable UUID id,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return new PagedModel<>(accessLog.forUser(id, pageable).map(AccessLogView::from));
    }

    @Operation(summary = "Mi perfil")
    @GetMapping("/users/me")
    public UserView me() {
        return view(service.get(CurrentUser.require().id()));
    }

    @Operation(summary = "Actualiza mi nombre y teléfono")
    @PatchMapping("/users/me")
    public UserView updateMe(@Valid @RequestBody UpdateUserRequest body) {
        return view(service.updateOwnProfile(CurrentUser.require(), body.fullName(), body.phone()));
    }

    @Operation(summary = "Mi historial de acceso")
    @GetMapping("/users/me/access-log")
    public PagedModel<AccessLogView> myAccessLog(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return new PagedModel<>(accessLog.forUser(CurrentUser.require().id(), pageable).map(AccessLogView::from));
    }

    @Operation(summary = "Roles y sus permisos")
    @PreAuthorize("hasAuthority('roles.read') or hasAuthority('users.manage')")
    @GetMapping("/roles")
    public List<RoleView> roles() {
        return service.roles().stream().map(RoleView::from).toList();
    }

    private UserView view(User user) {
        return UserView.from(user, Instant.now(clock));
    }
}
