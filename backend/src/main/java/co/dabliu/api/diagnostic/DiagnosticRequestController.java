package co.dabliu.api.diagnostic;

import co.dabliu.api.diagnostic.dto.CreateDiagnosticRequest;
import co.dabliu.api.diagnostic.dto.DiagnosticRequestCreated;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** Endpoint público que usa el formulario de la landing. */
@RestController
@RequestMapping("/api/v1/diagnostic-requests")
public class DiagnosticRequestController {

    private final DiagnosticRequestService service;

    public DiagnosticRequestController(DiagnosticRequestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<DiagnosticRequestCreated> create(@Valid @RequestBody CreateDiagnosticRequest body) {
        DiagnosticRequest created = service.create(body);
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
            .path("/api/v1/admin/diagnostic-requests/{id}")
            .buildAndExpand(created.getId())
            .toUri();
        return ResponseEntity.created(location).body(DiagnosticRequestCreated.from(created));
    }
}
