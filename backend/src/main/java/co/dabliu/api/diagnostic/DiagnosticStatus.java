package co.dabliu.api.diagnostic;

/** Seguimiento comercial interno de cada solicitud. */
public enum DiagnosticStatus {
    NEW,
    CONTACTED,
    SCHEDULED,
    COMPLETED,
    DISCARDED
}
