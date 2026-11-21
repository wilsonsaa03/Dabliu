package co.dabliu.api.crm;

import co.dabliu.api.audit.ActivityLogService;
import co.dabliu.api.auth.AuthenticatedUser;
import co.dabliu.api.clients.Client;
import co.dabliu.api.clients.ClientRepository;
import co.dabliu.api.common.BusinessRuleException;
import co.dabliu.api.common.ConflictException;
import co.dabliu.api.common.NotFoundException;
import co.dabliu.api.crm.CrmEnums.LeadStage;
import co.dabliu.api.crm.LeadHistory.StageChange;
import co.dabliu.api.crm.dto.CrmDtos.ConversionResult;
import co.dabliu.api.crm.dto.CrmDtos.ConvertRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Convierte un prospecto en cliente, todo en una transacción:
 * 1. Bloquea el prospecto y valida que no esté convertido (sin conversiones duplicadas).
 * 2. Asegura la empresa y el contacto (los crea con los datos del prospecto si no existen).
 * 3. Crea el cliente, o reutiliza el de la empresa si esa empresa ya era cliente.
 * 4. Deja el prospecto en Ganado con historial. El prospecto nunca se borra.
 */
@Service
public class ConversionService {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    private final LeadRepository leads;
    private final CompanyRepository companies;
    private final ContactRepository contacts;
    private final StageChangeRepository stageChanges;
    private final ClientRepository clients;
    private final ActivityLogService audit;
    private final Clock clock;

    public ConversionService(LeadRepository leads, CompanyRepository companies, ContactRepository contacts,
                             StageChangeRepository stageChanges, ClientRepository clients, ActivityLogService audit, Clock clock) {
        this.leads = leads;
        this.companies = companies;
        this.contacts = contacts;
        this.stageChanges = stageChanges;
        this.clients = clients;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional
    public ConversionResult convert(UUID leadId, ConvertRequest in, AuthenticatedUser actor) {
        Lead lead = leads.findForUpdate(leadId).orElseThrow(() -> new NotFoundException("No existe el prospecto"));
        lead.requireNotArchived();
        if (lead.isConverted()) throw new ConflictException("Este prospecto ya se convirtió en cliente.");
        if (lead.getStage() == LeadStage.PERDIDO) throw new BusinessRuleException("Un prospecto perdido no se convierte. Reábrelo primero.");

        Instant now = Instant.now(clock);
        String requestedName = in == null ? null : in.clientName();
        String clientName = blank(requestedName)
            ? (lead.getCompanyName() != null ? lead.getCompanyName() : lead.getContactName())
            : requestedName.strip();
        String taxId = in == null || blank(in.taxId()) ? null : in.taxId().strip();

        // Empresa: la vinculada al prospecto, o una nueva con el nombre del cliente.
        Company company = lead.getCompanyId() == null ? null : companies.findById(lead.getCompanyId()).orElse(null);
        if (company == null) {
            if (taxId != null && companies.existsByTaxId(taxId)) {
                throw new ConflictException("Ya existe una empresa con ese NIT; vincúlala al prospecto antes de convertir.");
            }
            company = new Company(actor.id(), now);
            company.update(clientName, taxId, lead.getSector(), null, null, lead.getContactPhone(), null, actor.id(), now);
            companies.save(company);
        }

        // Contacto: el vinculado, o uno nuevo con los datos del prospecto.
        Contact contact = lead.getContactId() == null ? null : contacts.findById(lead.getContactId()).orElse(null);
        if (contact == null) {
            contact = new Contact(actor.id(), now);
            contact.update(company.getId(), lead.getContactName(), lead.getContactEmail(), lead.getContactPhone(), null, null, actor.id(), now);
            contacts.save(contact);
        }
        lead.link(company.getId(), contact.getId(), actor.id(), now);

        // Cliente: si la empresa ya es cliente se reutiliza su expediente (no se duplica).
        boolean created = false;
        Client client = clients.findByCompanyId(company.getId()).orElse(null);
        if (client == null) {
            LocalDate joined = in != null && in.joinedAt() != null ? in.joinedAt() : LocalDate.now(clock.withZone(BOGOTA));
            client = new Client(clientName, company.getId(), contact.getId(), joined, actor.id(), now);
            client.contactData(taxId != null ? taxId : company.getTaxId(), lead.getContactEmail(), lead.getContactPhone(),
                company.getCity(), lead.getSector(), lead.getOwnerId() != null ? lead.getOwnerId() : actor.id());
            clients.save(client);
            created = true;
        }

        if (lead.getStage() != LeadStage.GANADO) {
            LeadStage previous = lead.moveTo(LeadStage.GANADO, null, actor.id(), now);
            stageChanges.save(new StageChange(lead.getId(), previous, LeadStage.GANADO, "Convertido en cliente", actor.id(), now));
        }
        lead.markConverted(client.getId(), actor.id(), now);

        audit.record(actor.id(), "lead.converted", "LEAD", lead.getId(),
            "Convirtió «" + lead.getTitle() + "» en cliente (" + client.getName() + ")",
            Map.of("clientId", client.getId().toString(), "clientCreated", created));
        return new ConversionResult(client.getId(), client.getName(), created, company.getId(), contact.getId());
    }

    private static boolean blank(String v) {
        return v == null || v.isBlank();
    }
}
