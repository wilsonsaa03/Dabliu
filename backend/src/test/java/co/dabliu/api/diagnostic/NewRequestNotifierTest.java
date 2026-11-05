package co.dabliu.api.diagnostic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.dabliu.api.config.DabliuProperties;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class NewRequestNotifierTest {

    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final DiagnosticRequestCreatedEvent event = new DiagnosticRequestCreatedEvent(
        UUID.randomUUID(), "Ana Pérez", null, "3150000000", null, Sector.AUTOMOTIVE_WORKSHOPS, "Ordenar las órdenes del taller.");

    @SuppressWarnings("unchecked")
    private NewRequestNotifier notifier(JavaMailSender available, String emailTo) {
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(available);
        DabliuProperties properties = new DabliuProperties(
            new DabliuProperties.Cors(List.of("http://localhost:4200")),
            new DabliuProperties.Admin("admin", "secret"),
            new DabliuProperties.RateLimit(5, Duration.ofMinutes(10)),
            new DabliuProperties.Notifications(emailTo, ""));
        return new NewRequestNotifier(provider, properties);
    }

    @Test
    void sendsEmailWithLeadData() {
        notifier(sender, "ventas@ejemplo.co").onCreated(event);

        SimpleMailMessage message = notifier(sender, "ventas@ejemplo.co").buildMessage(event);
        assertThat(message.getTo()).containsExactly("ventas@ejemplo.co");
        assertThat(message.getSubject()).contains("Ana Pérez");
        assertThat(message.getText()).contains("3150000000", "AUTOMOTIVE_WORKSHOPS", "Ordenar las órdenes del taller.");
        verify(sender).send(any(SimpleMailMessage.class));
    }

    @Test
    void skipsWhenNotConfigured() {
        notifier(sender, "").onCreated(event);
        notifier(null, "ventas@ejemplo.co").onCreated(event);
        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void mailFailureDoesNotPropagate() {
        org.mockito.Mockito.doThrow(new MailSendException("smtp caído")).when(sender).send(any(SimpleMailMessage.class));
        notifier(sender, "ventas@ejemplo.co").onCreated(event);
    }
}
