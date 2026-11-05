package co.dabliu.api.diagnostic;

import co.dabliu.api.diagnostic.dto.DiagnosticRequestView;
import co.dabliu.api.diagnostic.dto.UpdateDiagnosticTracking;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Gestión interna de las solicitudes. Requiere el usuario administrador (HTTP Basic). */
@RestController
@RequestMapping("/api/v1/admin/diagnostic-requests")
public class AdminDiagnosticRequestController {

    private final DiagnosticRequestService service;

    public AdminDiagnosticRequestController(DiagnosticRequestService service) {
        this.service = service;
    }

    @GetMapping
    public PagedModel<DiagnosticRequestView> list(
            @RequestParam(required = false) DiagnosticStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return new PagedModel<>(service.list(status, pageable).map(DiagnosticRequestView::from));
    }

    @GetMapping("/{id}")
    public DiagnosticRequestView get(@PathVariable UUID id) {
        return DiagnosticRequestView.from(service.get(id));
    }

    @PatchMapping("/{id}")
    public DiagnosticRequestView updateTracking(@PathVariable UUID id,
                                                @Valid @RequestBody UpdateDiagnosticTracking body) {
        return DiagnosticRequestView.from(service.updateTracking(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
