package co.dabliu.api.diagnostic.dto;

import co.dabliu.api.diagnostic.Budget;
import co.dabliu.api.diagnostic.Sector;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/v1/diagnostic-requests. Mismas reglas que el formulario de la landing. */
public record CreateDiagnosticRequest(
    @NotBlank(message = "Escribe tu nombre.")
    @Size(max = 120, message = "Máximo 120 caracteres.")
    String fullName,

    @Size(max = 120, message = "Máximo 120 caracteres.")
    String company,

    @NotBlank(message = "Escribe un número válido.")
    @Pattern(regexp = "^[+\\d\\s()-]{7,20}$", message = "Escribe un número válido.")
    String phone,

    @Email(message = "Revisa el correo.")
    @Size(max = 160, message = "Máximo 160 caracteres.")
    String email,

    @NotNull(message = "Elige un sector.")
    Sector sector,

    /** Opcional: si no llega, se guarda como UNKNOWN. */
    Budget budget,

    @NotBlank(message = "Cuéntanos qué quieres resolver.")
    @Size(min = 15, max = 1500, message = "Entre 15 y 1500 caracteres.")
    String need,

    @NotNull(message = "Necesitamos tu autorización para contactarte.")
    @AssertTrue(message = "Necesitamos tu autorización para contactarte.")
    Boolean dataConsent
) {}
