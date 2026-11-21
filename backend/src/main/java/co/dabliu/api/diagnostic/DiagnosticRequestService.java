package co.dabliu.api.diagnostic;

import co.dabliu.api.audit.ActivityLogService;

import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.diagnostic.dto.CreateDiagnosticRequest;
import co.dabliu.api.diagnostic.dto.UpdateDiagnosticTracking;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiagnosticRequestService {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticRequestService.class);

    private final DiagnosticRequestRepository repository;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final ActivityLogService activity;
    private final java.util.List<DiagnosticDeletionGuard> deletionGuards;

    public DiagnosticRequestService(DiagnosticRequestRepository repository, Clock clock, ApplicationEventPublisher events,
                                    ActivityLogService activity, java.util.List<DiagnosticDeletionGuard> deletionGuards) {
        this.repository = repository;
        this.clock = clock;
        this.events = events;
        this.activity = activity;
        this.deletionGuards = deletionGuards;
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
        events.publishEvent(DiagnosticRequestCreatedEvent.of(saved));
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
        DiagnosticStatus before = request.getStatus();
        request.updateTracking(input.status(), blankToNull(input.internalNotes()));
        activity.record("diagnostic.updated", "DIAGNOSTIC_REQUEST", id,
            before == input.status() ? "Actualizó las notas de una solicitud" : "Cambió el estado de una solicitud a «" + input.status().label() + "»",
            java.util.Map.of("from", before.name(), "to", input.status().name()));
        return request;
    }

    /** Derecho de supresión (Ley 1581 de 2012): borra la solicitud y sus datos personales. */
    @Transactional
    public void delete(UUID id) {
        DiagnosticRequest request = get(id);
        deletionGuards.forEach(g -> g.checkCanDelete(id));
        // El prospecto creado desde esta solicitud se borra en cascada (FK): la supresión es completa.
        repository.delete(request);
        // Sin datos personales en la bitácora: la supresión debe borrarlos de verdad.
        activity.record("diagnostic.deleted", "DIAGNOSTIC_REQUEST", id, "Eliminó una solicitud (supresión de datos)", null);
        log.info("Solicitud de diagnóstico {} eliminada", id);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
