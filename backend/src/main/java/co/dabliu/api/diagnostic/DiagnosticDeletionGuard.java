package co.dabliu.api.diagnostic;

import java.util.UUID;

/**
 * Permite que otros módulos impidan borrar una solicitud (p. ej. el CRM, si ya se convirtió en cliente).
 * El módulo de diagnóstico no conoce al CRM: solo consulta las implementaciones que existan.
 */
public interface DiagnosticDeletionGuard {

    /** Lanza una excepción si la solicitud no se puede borrar. */
    void checkCanDelete(UUID diagnosticRequestId);
}
