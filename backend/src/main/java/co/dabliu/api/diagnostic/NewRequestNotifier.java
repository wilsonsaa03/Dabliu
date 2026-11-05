package co.dabliu.api.diagnostic;

import co.dabliu.api.config.DabliuProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Avisa por correo a DABLIU cuando llega una solicitud nueva, para responder rápido.
 * - Solo actúa si hay servidor de correo (spring.mail.host) y destinatario (NOTIFY_EMAIL_TO).
 * - Corre después del commit y en otro hilo: si el correo falla, la solicitud ya quedó guardada
 *   y el visitante no ve ningún error.
 */
@Component
public class NewRequestNotifier {

    private static final Logger log = LoggerFactory.getLogger(NewRequestNotifier.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final DabliuProperties.Notifications config;

    public NewRequestNotifier(ObjectProvider<JavaMailSender> mailSender, DabliuProperties properties) {
        this.mailSender = mailSender;
        this.config = properties.notifications();
    }

    @Async
    @TransactionalEventListener
    public void onCreated(DiagnosticRequestCreatedEvent event) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || config == null || isBlank(config.emailTo())) {
            log.debug("Aviso por correo desactivado; solicitud {}", event.id());
            return;
        }
        try {
            sender.send(buildMessage(event));
        } catch (MailException e) {
            log.warn("No se pudo enviar el aviso de la solicitud {}: {}", event.id(), e.getMessage());
        }
    }

    SimpleMailMessage buildMessage(DiagnosticRequestCreatedEvent e) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(config.emailTo());
        if (!isBlank(config.emailFrom())) message.setFrom(config.emailFrom());
        message.setSubject("Nueva solicitud de diagnóstico: " + e.fullName());
        message.setText("""
            Llegó una solicitud de diagnóstico desde la página.

            Nombre: %s
            Empresa: %s
            WhatsApp / teléfono: %s
            Correo: %s
            Sector: %s

            Qué quiere resolver:
            %s

            Id de la solicitud: %s
            """.formatted(
                e.fullName(), orDash(e.company()), e.phone(), orDash(e.email()), e.sector(), e.need(), e.id()));
        return message;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String orDash(String value) {
        return isBlank(value) ? "—" : value;
    }
}
