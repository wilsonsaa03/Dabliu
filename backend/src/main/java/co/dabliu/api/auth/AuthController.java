package co.dabliu.api.auth;

import co.dabliu.api.auth.dto.AuthDtos.ChangePasswordRequest;
import co.dabliu.api.auth.dto.AuthDtos.CsrfResponse;
import co.dabliu.api.auth.dto.AuthDtos.ForgotPasswordRequest;
import co.dabliu.api.auth.dto.AuthDtos.LoginRequest;
import co.dabliu.api.auth.dto.AuthDtos.Me;
import co.dabliu.api.auth.dto.AuthDtos.ResetPasswordRequest;
import co.dabliu.api.common.ClientInfo;
import co.dabliu.api.users.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Autenticación", description = "Sesión con cookies HttpOnly, renovación, contraseña e invitaciones")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final AuthCookies cookies;
    private final UserRepository users;

    public AuthController(AuthService auth, AuthCookies cookies, UserRepository users) {
        this.auth = auth;
        this.cookies = cookies;
        this.users = users;
    }

    @Operation(summary = "Entrega el token CSRF en la cookie XSRF-TOKEN (llamar al cargar la aplicación)")
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        token.getToken(); // fuerza a que la cookie se escriba
        return new CsrfResponse(token.getHeaderName());
    }

    @Operation(summary = "Inicia sesión y escribe las cookies de acceso y renovación")
    @PostMapping("/login")
    public Me login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        AuthService.Session session = auth.login(body.email(), body.password(), ClientInfo.from(request));
        cookies.write(response, session.accessToken(), session.refreshToken());
        // Se recarga con roles y permisos: fuera de la transacción no se pueden leer de forma perezosa.
        return Me.from(users.findWithAuthoritiesById(session.user().getId()).orElseThrow());
    }

    @Operation(summary = "Renueva la sesión (rota el refresh token)")
    @PostMapping("/refresh")
    public Me refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            AuthService.Session session = auth.refresh(cookies.readRefresh(request), ClientInfo.from(request));
            cookies.write(response, session.accessToken(), session.refreshToken());
            return Me.from(users.findWithAuthoritiesById(session.user().getId()).orElseThrow());
        } catch (AuthException e) {
            if (!"REFRESH_RACE".equals(e.code())) cookies.clear(response);
            throw e;
        }
    }

    @Operation(summary = "Cierra la sesión actual")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        auth.logout(cookies.readRefresh(request), ClientInfo.from(request));
        cookies.clear(response);
    }

    @Operation(summary = "Usuario autenticado, con roles y permisos")
    @GetMapping("/me")
    public Me me() {
        return Me.from(users.findWithAuthoritiesById(CurrentUser.require().id()).orElseThrow());
    }

    @Operation(summary = "Sesiones activas del usuario (dispositivos)")
    @GetMapping("/sessions")
    public List<AuthService.SessionInfo> sessions(HttpServletRequest request) {
        return auth.sessions(CurrentUser.require().id(), cookies.readRefresh(request));
    }

    @Operation(summary = "Cierra una sesión del usuario (otro dispositivo)")
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> revokeSession(@PathVariable UUID id, HttpServletRequest request) {
        auth.revokeSession(CurrentUser.require().id(), id, ClientInfo.from(request));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cambia la contraseña y cierra las demás sesiones")
    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest body, HttpServletRequest request,
                               HttpServletResponse response) {
        String access = auth.changePassword(CurrentUser.require().id(), body.currentPassword(), body.newPassword(),
            cookies.readRefresh(request), ClientInfo.from(request));
        cookies.writeAccess(response, access);
    }

    @Operation(summary = "Envía un enlace para restablecer la contraseña (responde igual exista o no el correo)")
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest body) {
        auth.forgotPassword(body.email());
    }

    @Operation(summary = "Restablece la contraseña con el enlace recibido por correo")
    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        auth.resetPassword(body.token(), body.password(), ClientInfo.from(request));
    }

    @Operation(summary = "Activa la cuenta invitada creando la contraseña")
    @PostMapping("/accept-invitation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acceptInvitation(@Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        auth.acceptInvitation(body.token(), body.password(), ClientInfo.from(request));
    }

    @Operation(summary = "Datos para saludar en la página de un enlace vigente")
    @GetMapping("/link-info")
    public AuthService.LinkInfo linkInfo(@RequestParam String token, @RequestParam UserToken.Purpose purpose) {
        return auth.linkInfo(token, purpose);
    }
}
