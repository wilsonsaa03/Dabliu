package co.dabliu.api.clients;

import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.diagnostic.Sector;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consulta de clientes. En la fase 2 los clientes nacen al convertir prospectos;
 * la edición del expediente completo llega con el módulo de clientes (fase 3).
 */
@Tag(name = "Clientes")
@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {

    private final ClientRepository clients;

    public ClientController(ClientRepository clients) {
        this.clients = clients;
    }

    public record ClientView(UUID id, String name, String taxId, UUID companyId, UUID contactId, String email, String phone,
                             String city, Sector sector, Client.Status status, LocalDate joinedAt, Instant createdAt) {
        static ClientView from(Client c) {
            return new ClientView(c.getId(), c.getName(), c.getTaxId(), c.getCompanyId(), c.getContactId(), c.getEmail(),
                c.getPhone(), c.getCity(), c.getSector(), c.getStatus(), c.getJoinedAt(), c.getCreatedAt());
        }
    }

    @PreAuthorize("hasAuthority('clients.read')")
    @GetMapping
    @Transactional(readOnly = true)
    public PagedModel<ClientView> list(@RequestParam(required = false) String q,
                                       @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        String term = q == null ? "" : q.strip().toLowerCase(Locale.ROOT);
        return new PagedModel<>(clients.search(term, pageable).map(ClientView::from));
    }

    @PreAuthorize("hasAuthority('clients.read')")
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ClientView get(@PathVariable UUID id) {
        return ClientView.from(clients.findById(id).orElseThrow(() -> new NotFoundException("No existe el cliente")));
    }
}
