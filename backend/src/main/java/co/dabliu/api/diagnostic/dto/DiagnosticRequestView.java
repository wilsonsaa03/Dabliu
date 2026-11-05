package co.dabliu.api.diagnostic.dto;

import co.dabliu.api.diagnostic.Budget;
import co.dabliu.api.diagnostic.DiagnosticRequest;
import co.dabliu.api.diagnostic.DiagnosticStatus;
import co.dabliu.api.diagnostic.Sector;
import java.time.Instant;
import java.util.UUID;

/** Vista completa para el administrador. */
public record DiagnosticRequestView(
    UUID id,
    String fullName,
    String company,
    String phone,
    String email,
    Sector sector,
    Budget budget,
    String need,
    Instant consentAcceptedAt,
    DiagnosticStatus status,
    String internalNotes,
    Instant createdAt,
    Instant updatedAt
) {

    public static DiagnosticRequestView from(DiagnosticRequest r) {
        return new DiagnosticRequestView(r.getId(), r.getFullName(), r.getCompany(), r.getPhone(), r.getEmail(),
            r.getSector(), r.getBudget(), r.getNeed(), r.getConsentAcceptedAt(), r.getStatus(),
            r.getInternalNotes(), r.getCreatedAt(), r.getUpdatedAt());
    }
}
