package co.dabliu.api.diagnostic;

/** Seguimiento comercial interno de cada solicitud. */
public enum DiagnosticStatus {
    NEW("Nueva"),
    CONTACTED("Contactada"),
    SCHEDULED("Agendada"),
    COMPLETED("Atendida"),
    DISCARDED("Descartada");

    private final String label;

    DiagnosticStatus(String label) {
        this.label = label;
    }

    /** Nombre en español para textos visibles (bitácora). */
    public String label() {
        return label;
    }
}
