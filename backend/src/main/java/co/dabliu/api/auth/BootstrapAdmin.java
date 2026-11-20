package co.dabliu.api.auth;

import co.dabliu.api.config.DabliuProperties;
import co.dabliu.api.users.Role;
import co.dabliu.api.users.RoleRepository;
import co.dabliu.api.users.User;
import co.dabliu.api.users.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea el primer superadministrador al arrancar, solo si la base de datos no tiene usuarios.
 * Datos desde variables de entorno (BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD); nunca en el código.
 * Después de crearlo, conviene borrar BOOTSTRAP_ADMIN_PASSWORD del entorno.
 */
@Component
public class BootstrapAdmin implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdmin.class);

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final DabliuProperties properties;
    private final Clock clock;

    public BootstrapAdmin(UserRepository users, RoleRepository roles, PasswordEncoder encoder,
                          DabliuProperties properties, Clock clock) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        DabliuProperties.Bootstrap config = properties.bootstrap();
        if (config == null || isBlank(config.adminEmail()) || isBlank(config.adminPassword())) {
            log.warn("No hay usuarios. Define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD para crear el primer superadministrador.");
            return;
        }
        String email = AuthService.normalizeEmail(config.adminEmail());
        PasswordPolicy.check(config.adminPassword(), email);
        Role superAdmin = roles.findByCode(Role.SUPER_ADMIN).orElseThrow();
        String name = isBlank(config.adminName()) ? "Administrador DABLIU" : config.adminName().strip();
        users.save(User.active(email, name, encoder.encode(config.adminPassword()), List.of(superAdmin), Instant.now(clock)));
        log.info("Primer superadministrador creado: {}", email);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
