package co.dabliu.api.auth;

import co.dabliu.api.config.DabliuProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Correos de invitación y recuperación de contraseña.
 * Sin servidor de correo configurado no se envía nada; en desarrollo (dabliu.auth.log-links=true)
 * el enlace se escribe en el log para poder probar el flujo. Nunca activar log-links en producción.
 */
@Component
public class AuthMailer {

    private static final Logger log = LoggerFactory.getLogger(AuthMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final DabliuProperties properties;

    public AuthMailer(ObjectProvider<JavaMailSender> mailSender, DabliuProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Async
    public void sendInvitation(String email, String fullName, String token) {
        String link = properties.appUrl() + "/activar?token=" + token;
        send(email, "Te invitaron a DABLIU SaaS", """
            Hola %s:

            Te crearon una cuenta en DABLIU SaaS, la plataforma interna de DABLIU SOLUCIONES.
            Para activarla y crear tu contraseña, abre este enlace (vence en %d horas):

            %s

            Si no esperabas este correo, ignóralo.
            """.formatted(fullName, properties.auth().invitationTtl().toHours(), link), link);
    }

    @Async
    public void sendPasswordReset(String email, String fullName, String token) {
        String link = properties.appUrl() + "/restablecer?token=" + token;
        send(email, "Restablece tu contraseña de DABLIU SaaS", """
            Hola %s:

            Recibimos una solicitud para restablecer tu contraseña. Abre este enlace (vence en %d minutos):

            %s

            Si no la pediste, ignora este correo: tu contraseña no cambia.
            """.formatted(fullName, properties.auth().passwordResetTtl().toMinutes(), link), link);
    }

    private void send(String to, String subject, String body, String link) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            if (properties.auth().logLinks()) {
                log.warn("[SOLO DESARROLLO] Correo no configurado. Enlace para {}: {}", to, link);
            } else {
                log.warn("Correo no configurado: no se pudo enviar '{}'", subject);
            }
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        if (properties.notifications() != null && properties.notifications().emailFrom() != null
                && !properties.notifications().emailFrom().isBlank()) {
            message.setFrom(properties.notifications().emailFrom());
        }
        message.setSubject(subject);
        message.setText(body);
        try {
            sender.send(message);
        } catch (MailException e) {
            log.warn("No se pudo enviar '{}': {}", subject, e.getMessage());
        }
    }
}
