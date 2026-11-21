package co.dabliu.api.crm;

import co.dabliu.api.auth.CurrentUser;
import co.dabliu.api.crm.dto.CrmDtos.CompanyDetail;
import co.dabliu.api.crm.dto.CrmDtos.CompanyRequest;
import co.dabliu.api.crm.dto.CrmDtos.CompanyView;
import co.dabliu.api.crm.dto.CrmDtos.ContactRequest;
import co.dabliu.api.crm.dto.CrmDtos.ContactView;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "CRM · Empresas y contactos")
@RestController
@RequestMapping("/api/v1/crm")
public class CompanyContactController {

    private final CompanyContactService service;

    public CompanyContactController(CompanyContactService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/companies")
    public PagedModel<CompanyView> companies(@RequestParam(required = false) String q,
                                             @RequestParam(defaultValue = "false") boolean archived,
                                             @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return new PagedModel<>(service.searchCompanies(q, archived, pageable));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/companies/{id}")
    public CompanyDetail company(@PathVariable UUID id) {
        return service.companyDetail(id);
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/companies")
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyView createCompany(@Valid @RequestBody CompanyRequest body) {
        return CompanyView.from(service.createCompany(body, CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/companies/{id}")
    public CompanyView updateCompany(@PathVariable UUID id, @Valid @RequestBody CompanyRequest body) {
        return CompanyView.from(service.updateCompany(id, body, CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('crm.archive')")
    @PostMapping("/companies/{id}/archive")
    public CompanyView archiveCompany(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean archived) {
        return CompanyView.from(service.archiveCompany(id, archived, CurrentUser.require()));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/contacts")
    public PagedModel<ContactView> contacts(@RequestParam(required = false) String q,
                                            @RequestParam(required = false) UUID companyId,
                                            @RequestParam(defaultValue = "false") boolean archived,
                                            @PageableDefault(size = 20, sort = "fullName", direction = Sort.Direction.ASC) Pageable pageable) {
        return new PagedModel<>(service.searchContacts(q, companyId, archived, pageable));
    }

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping("/contacts/{id}")
    public ContactView contact(@PathVariable UUID id) {
        return service.contactView(id);
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping("/contacts")
    @ResponseStatus(HttpStatus.CREATED)
    public ContactView createContact(@Valid @RequestBody ContactRequest body) {
        return service.contactView(service.createContact(body, CurrentUser.require()).getId());
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PutMapping("/contacts/{id}")
    public ContactView updateContact(@PathVariable UUID id, @Valid @RequestBody ContactRequest body) {
        service.updateContact(id, body, CurrentUser.require());
        return service.contactView(id);
    }

    @PreAuthorize("hasAuthority('crm.archive')")
    @PostMapping("/contacts/{id}/archive")
    public ContactView archiveContact(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean archived) {
        service.archiveContact(id, archived, CurrentUser.require());
        return service.contactView(id);
    }
}
