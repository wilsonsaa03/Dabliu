import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Page } from '../../core/models';
import type {
  ActivityType, BoardColumn, ClientView, CompanyDetail, CompanyView, ContactView, ConversionResult, InteractionType, LeadDetail,
  LeadRequest, LeadStage, LeadSummary, Person, ActivityView,
} from './crm.models';

function params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(values)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
}

@Injectable({ providedIn: 'root' })
export class CrmApi {
  private http = inject(HttpClient);
  private base = '/api/v1/crm';

  board(q: { q?: string; owner?: string }) { return this.http.get<BoardColumn[]>(`${this.base}/leads/board`, { params: params(q) }); }
  leads(q: { q?: string; stage?: string; owner?: string; source?: string; temperature?: string; archived?: boolean; page?: number; size?: number; sort?: string }) {
    return this.http.get<Page<LeadSummary>>(`${this.base}/leads`, { params: params(q) });
  }
  lead(id: string) { return this.http.get<LeadDetail>(`${this.base}/leads/${id}`); }
  create(body: LeadRequest) { return this.http.post<LeadDetail>(`${this.base}/leads`, body); }
  update(id: string, body: LeadRequest) { return this.http.put<LeadDetail>(`${this.base}/leads/${id}`, body); }
  assign(id: string, ownerId: string | null) { return this.http.put<LeadDetail>(`${this.base}/leads/${id}/owner`, { ownerId }); }
  moveStage(id: string, stage: LeadStage, note?: string | null, lostReason?: string | null) {
    return this.http.post<LeadDetail>(`${this.base}/leads/${id}/stage`, { stage, note, lostReason });
  }
  archive(id: string, archived: boolean) { return this.http.post<LeadDetail>(`${this.base}/leads/${id}/${archived ? 'archive' : 'restore'}`, {}); }
  addInteraction(id: string, body: { type: InteractionType; summary: string; occurredAt?: string | null }) {
    return this.http.post<LeadDetail>(`${this.base}/leads/${id}/interactions`, body);
  }
  addActivity(id: string, body: { type: ActivityType; title: string; dueAt: string; assigneeId?: string | null }) {
    return this.http.post<LeadDetail>(`${this.base}/leads/${id}/activities`, body);
  }
  convert(id: string, body: { clientName?: string | null; taxId?: string | null; joinedAt?: string | null }) {
    return this.http.post<ConversionResult>(`${this.base}/leads/${id}/convert`, body);
  }
  activities(q: { status: string; assignee: string; page?: number; size?: number }) {
    return this.http.get<Page<ActivityView>>(`${this.base}/activities`, { params: params(q) });
  }
  setActivityDone(id: string, done: boolean) { return this.http.patch<void>(`${this.base}/activities/${id}/done`, null, { params: params({ done }) }); }
  owners() { return this.http.get<Person[]>(`${this.base}/owners`); }

  companies(q: { q?: string; archived?: boolean; page?: number; size?: number }) { return this.http.get<Page<CompanyView>>(`${this.base}/companies`, { params: params(q) }); }
  company(id: string) { return this.http.get<CompanyDetail>(`${this.base}/companies/${id}`); }
  createCompany(body: Partial<CompanyView>) { return this.http.post<CompanyView>(`${this.base}/companies`, body); }
  updateCompany(id: string, body: Partial<CompanyView>) { return this.http.put<CompanyView>(`${this.base}/companies/${id}`, body); }
  contacts(q: { q?: string; companyId?: string; page?: number; size?: number }) { return this.http.get<Page<ContactView>>(`${this.base}/contacts`, { params: params(q) }); }
  createContact(body: Partial<ContactView>) { return this.http.post<ContactView>(`${this.base}/contacts`, body); }
  updateContact(id: string, body: Partial<ContactView>) { return this.http.put<ContactView>(`${this.base}/contacts/${id}`, body); }

  clients(q: { q?: string; page?: number; size?: number }) { return this.http.get<Page<ClientView>>('/api/v1/clients', { params: params(q) }); }
}
