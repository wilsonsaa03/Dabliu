package co.dabliu.api.diagnostic.dto;

import co.dabliu.api.diagnostic.DiagnosticStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cuerpo de PATCH /api/v1/admin/diagnostic-requests/{id}. */
public record UpdateDiagnosticTracking(
    @NotNull(message = "Indica el estado.")
    DiagnosticStatus status,

    @Size(max = 2000, message = "Máximo 2000 caracteres.")
    String internalNotes
) {}
