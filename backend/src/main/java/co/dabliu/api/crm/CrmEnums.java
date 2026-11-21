package co.dabliu.api.crm;

import java.util.EnumSet;
import java.util.Set;

/** Catálogos del CRM. Los valores deben coincidir con las restricciones CHECK de V4__crm.sql. */
public final class CrmEnums {

    private CrmEnums() {
    }

    /** Etapas del embudo comercial, en orden. */
    public enum LeadStage {
        NUEVO("Nuevo"),
        CONTACTADO("Contactado"),
        CALIFICADO("Calificado"),
        REUNION_PROGRAMADA("Reunión programada"),
        PROPUESTA_ENVIADA("Propuesta enviada"),
        NEGOCIACION("Negociación"),
        GANADO("Ganado"),
        PERDIDO("Perdido");

        private final String label;

        LeadStage(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }

        public boolean isClosed() {
            return this == GANADO || this == PERDIDO;
        }

        /** Etapas abiertas (cuentan para el valor del embudo). */
        public static Set<LeadStage> open() {
            return EnumSet.complementOf(EnumSet.of(GANADO, PERDIDO));
        }
    }

    public enum LeadSource { WEB_FORM, WHATSAPP, REFERRAL, SOCIAL, EVENT, DIRECT, OTHER }

    /** Clasificación de la oportunidad según su probabilidad. */
    public enum Temperature { COLD, WARM, HOT }

    public enum InteractionType { CALL, WHATSAPP, EMAIL, MEETING, NOTE }

    public enum ActivityType { CALL, MEETING, FOLLOW_UP, TASK }
}
