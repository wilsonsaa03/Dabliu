package co.dabliu.api.crm;

import co.dabliu.api.audit.ActivityLogService;
import co.dabliu.api.auth.AuthenticatedUser;
import co.dabliu.api.clients.ClientRepository;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.common.ConflictException;
import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.crm.dto.CrmDtos.CompanyDetail;
import co.dabliu.api.crm.dto.CrmDtos.CompanyRequest;
import co.dabliu.api.crm.dto.CrmDtos.CompanyView;
import co.dabliu.api.crm.dto.CrmDtos.ContactRequest;
import co.dabliu.api.crm.dto.CrmDtos.ContactView;
import co.dabliu.api.crm.dto.CrmDtos.LeadSummary;
import co.dabliu.api.users.UserDirectory;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Empresas y contactos del CRM. */
@Service
public class CompanyContactService {

    private final CompanyRepository companies;
    private final ContactRepository contacts;
    private final LeadRepository leads;
    private final ClientRepository clients;
    private final UserDirectory directory;
    private final ActivityLogService audit;
    private final Clock clock;

    public CompanyContactService(CompanyRepository companies, ContactRepository contacts, LeadRepository leads,
                                 ClientRepository clients, UserDirectory directory, ActivityLogService audit, Clock clock) {
        this.companies = companies;
        this.contacts = contacts;
        this.leads = leads;
        this.clients = clients;
        this.directory = directory;
        this.audit = audit;
        this.clock = clock;
    }

    // ---------- Empresas ----------

    @Transactional(readOnly = true)
    public Page<CompanyView> searchCompanies(String q, boolean includeArchived, Pageable pageable) {
        return companies.search(norm(q), includeArchived, pageable).map(CompanyView::from);
    }

    @Transactional(readOnly = true)
    public CompanyDetail companyDetail(UUID id) {
        Company c = company(id);
        List<ContactView> people = contacts.findByCompanyIdAndArchivedAtIsNullOrderByFullName(id).stream()
            .map(ct -> ContactView.from(ct, c.getName())).toList();
        List<Lead> related = leads.findByCompanyIdOrderByCreatedAtDesc(id);
        Map<UUID, String> names = directory.names(related.stream().map(Lead::getOwnerId).toList());
        Instant now = Instant.now(clock);
        return new CompanyDetail(CompanyView.from(c), people,
            related.stream().map(l -> LeadSummary.from(l, names, null, now)).toList(),
            clients.findByCompanyId(id).map(cl -> cl.getId()).orElse(null));
    }

    @Transactional
    public Company createCompany(CompanyRequest in, AuthenticatedUser actor) {
        String taxId = blankToNull(in.taxId());
        if (taxId != null && companies.existsByTaxId(taxId)) throw new ConflictException("Ya existe una empresa con ese NIT.");
        Instant now = Instant.now(clock);
        Company c = new Company(actor.id(), now);
        c.update(in.name().strip(), taxId, in.sector(), blankToNull(in.city()), blankToNull(in.website()), blankToNull(in.phone()),
            blankToNull(in.notes()), actor.id(), now);
        companies.save(c);
        audit.record(actor.id(), "company.created", "COMPANY", c.getId(), "Registró la empresa «" + c.getName() + "»", null);
        return c;
    }

    @Transactional
    public Company updateCompany(UUID id, CompanyRequest in, AuthenticatedUser actor) {
        Company c = company(id);
        String taxId = blankToNull(in.taxId());
        if (taxId != null && companies.existsByTaxIdAndIdNot(taxId, id)) throw new ConflictException("Ya existe una empresa con ese NIT.");
        c.update(in.name().strip(), taxId, in.sector(), blankToNull(in.city()), blankToNull(in.website()), blankToNull(in.phone()),
            blankToNull(in.notes()), actor.id(), Instant.now(clock));
        audit.record(actor.id(), "company.updated", "COMPANY", id, "Actualizó la empresa «" + c.getName() + "»", null);
        return c;
    }

    @Transactional
    public Company archiveCompany(UUID id, boolean archived, AuthenticatedUser actor) {
        Company c = company(id);
        if (archived && clients.findByCompanyId(id).isPresent()) {
            throw new BusinessRuleException("La empresa es cliente: no se archiva desde el CRM.");
        }
        Instant now = Instant.now(clock);
        if (archived) c.archive(actor.id(), now); else c.restore(actor.id(), now);
        audit.record(actor.id(), archived ? "company.archived" : "company.restored", "COMPANY", id,
            (archived ? "Archivó" : "Restauró") + " la empresa «" + c.getName() + "»", null);
        return c;
    }

    Company company(UUID id) {
        return companies.findById(id).orElseThrow(() -> new NotFoundException("No existe la empresa"));
    }

    // ---------- Contactos ----------

    @Transactional(readOnly = true)
    public Page<ContactView> searchContacts(String q, UUID companyId, boolean includeArchived, Pageable pageable) {
        Page<Contact> page = contacts.search(norm(q), companyId, includeArchived, pageable);
        Map<UUID, String> companyNames = new HashMap<>();
        companies.findAllById(page.getContent().stream().map(Contact::getCompanyId).filter(java.util.Objects::nonNull).toList())
            .forEach(c -> companyNames.put(c.getId(), c.getName()));
        return page.map(c -> ContactView.from(c, companyNames.get(c.getCompanyId())));
    }

    @Transactional(readOnly = true)
    public ContactView contactView(UUID id) {
        Contact c = contact(id);
        return ContactView.from(c, c.getCompanyId() == null ? null : companies.findById(c.getCompanyId()).map(Company::getName).orElse(null));
    }

    @Transactional
    public Contact createContact(ContactRequest in, AuthenticatedUser actor) {
        if (in.companyId() != null) company(in.companyId());
        Instant now = Instant.now(clock);
        Contact c = new Contact(actor.id(), now);
        c.update(in.companyId(), in.fullName().strip(), lower(in.email()), blankToNull(in.phone()), blankToNull(in.position()),
            blankToNull(in.notes()), actor.id(), now);
        contacts.save(c);
        audit.record(actor.id(), "contact.created", "CONTACT", c.getId(), "Registró el contacto «" + c.getFullName() + "»", null);
        return c;
    }

    @Transactional
    public Contact updateContact(UUID id, ContactRequest in, AuthenticatedUser actor) {
        Contact c = contact(id);
        if (in.companyId() != null) company(in.companyId());
        c.update(in.companyId(), in.fullName().strip(), lower(in.email()), blankToNull(in.phone()), blankToNull(in.position()),
            blankToNull(in.notes()), actor.id(), Instant.now(clock));
        audit.record(actor.id(), "contact.updated", "CONTACT", id, "Actualizó el contacto «" + c.getFullName() + "»", null);
        return c;
    }

    @Transactional
    public Contact archiveContact(UUID id, boolean archived, AuthenticatedUser actor) {
        Contact c = contact(id);
        Instant now = Instant.now(clock);
        if (archived) c.archive(actor.id(), now); else c.restore(actor.id(), now);
        return c;
    }

    Contact contact(UUID id) {
        return contacts.findById(id).orElseThrow(() -> new NotFoundException("No existe el contacto"));
    }

    private static String norm(String q) {
        return q == null ? "" : q.strip().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.strip();
    }

    private static String lower(String v) {
        String s = blankToNull(v);
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }
}
