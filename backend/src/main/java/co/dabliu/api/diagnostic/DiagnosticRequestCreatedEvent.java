package co.dabliu.api.diagnostic;

import java.util.UUID;

/** Se publica al guardar una solicitud nueva; lo escucha el aviso por correo. */
public record DiagnosticRequestCreatedEvent(
    UUID id,
    String fullName,
    String company,
    String phone,
    String email,
    Sector sector,
    String need
) {
    static DiagnosticRequestCreatedEvent of(DiagnosticRequest r) {
        return new DiagnosticRequestCreatedEvent(
            r.getId(), r.getFullName(), r.getCompany(), r.getPhone(), r.getEmail(), r.getSector(), r.getNeed());
    }
}
