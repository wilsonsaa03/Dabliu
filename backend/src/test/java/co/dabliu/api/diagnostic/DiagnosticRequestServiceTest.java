package co.dabliu.api.diagnostic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import co.dabliu.api.diagnostic.dto.CreateDiagnosticRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class DiagnosticRequestServiceTest {

    private final DiagnosticRequestRepository repository = mock(DiagnosticRequestRepository.class);
    private final Instant now = Instant.parse("2026-10-30T15:00:00Z");
    private final DiagnosticRequestService service =
        new DiagnosticRequestService(repository, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void normalizesInputAndRecordsConsent() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DiagnosticRequest saved = service.create(new CreateDiagnosticRequest(
            "  Ana Pérez ", "   ", " 3150000000 ", " Ana@Ejemplo.CO ",
            Sector.COMMERCE_SERVICES, null, "  Necesito ordenar los pedidos de mi tienda.  ", true));

        assertThat(saved.getFullName()).isEqualTo("Ana Pérez");
        assertThat(saved.getCompany()).isNull();
        assertThat(saved.getPhone()).isEqualTo("3150000000");
        assertThat(saved.getEmail()).isEqualTo("ana@ejemplo.co");
        assertThat(saved.getBudget()).isEqualTo(Budget.UNKNOWN);
        assertThat(saved.getNeed()).isEqualTo("Necesito ordenar los pedidos de mi tienda.");
        assertThat(saved.isDataConsent()).isTrue();
        assertThat(saved.getConsentAcceptedAt()).isEqualTo(now);
        assertThat(saved.getStatus()).isEqualTo(DiagnosticStatus.NEW);
    }
}
