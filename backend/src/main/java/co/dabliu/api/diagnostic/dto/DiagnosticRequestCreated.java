package co.dabliu.api.diagnostic.dto;

import co.dabliu.api.diagnostic.DiagnosticRequest;
import co.dabliu.api.diagnostic.DiagnosticStatus;
import java.time.Instant;
import java.util.UUID;

/** Respuesta pública: no devuelve datos personales. */
public record DiagnosticRequestCreated(UUID id, DiagnosticStatus status, Instant createdAt) {

    public static DiagnosticRequestCreated from(DiagnosticRequest request) {
        return new DiagnosticRequestCreated(request.getId(), request.getStatus(), request.getCreatedAt());
    }
}
