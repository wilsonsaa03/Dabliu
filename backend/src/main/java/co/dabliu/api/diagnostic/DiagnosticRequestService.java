package co.dabliu.api.diagnostic;

import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.diagnostic.dto.CreateDiagnosticRequest;
import co.dabliu.api.diagnostic.dto.UpdateDiagnosticTracking;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiagnosticRequestService {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticRequestService.class);

    private final DiagnosticRequestRepository repository;
    private final Clock clock;

    public DiagnosticRequestService(DiagnosticRequestRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public DiagnosticRequest create(CreateDiagnosticRequest input) {
        String email = blankToNull(input.email());
        DiagnosticRequest request = new DiagnosticRequest(
            input.fullName().strip(),
            blankToNull(input.company()),
            input.phone().strip(),
            email == null ? null : email.toLowerCase(Locale.ROOT),
            input.sector(),
            input.budget() == null ? Budget.UNKNOWN : input.budget(),
            input.need().strip(),
            Instant.now(clock));

        DiagnosticRequest saved = repository.save(request);
        // Solo el id y el sector: los datos personales no van a los logs.
        log.info("Nueva solicitud de diagnóstico {} (sector {})", saved.getId(), saved.getSector());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<DiagnosticRequest> list(DiagnosticStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable) : repository.findByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public DiagnosticRequest get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("No existe la solicitud " + id));
    }

    @Transactional
    public DiagnosticRequest updateTracking(UUID id, UpdateDiagnosticTracking input) {
        DiagnosticRequest request = get(id);
        request.updateTracking(input.status(), blankToNull(input.internalNotes()));
        return request;
    }

    /** Derecho de supresión (Ley 1581 de 2012): borra la solicitud y sus datos personales. */
    @Transactional
    public void delete(UUID id) {
        repository.delete(get(id));
        log.info("Solicitud de diagnóstico {} eliminada", id);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
