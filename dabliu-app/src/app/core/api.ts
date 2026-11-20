import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AccessLogView, ActivityView, DashboardSummary, DiagnosticRequest, DiagnosticStatus, Page, RoleView, SessionInfo,
  UserStatus, UserView,
} from './models';

/** Convierte un objeto de filtros en parámetros, omitiendo vacíos. */
function params(values: Record<string, string | number | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(values)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
}

export interface PageQuery { page?: number; size?: number; sort?: string }

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private http = inject(HttpClient);

  list(q: PageQuery & { q?: string; status?: UserStatus | ''; role?: string }) {
    return this.http.get<Page<UserView>>('/api/v1/users', { params: params({ ...q }) });
  }
  get(id: string) { return this.http.get<UserView>(`/api/v1/users/${id}`); }
  invite(body: { email: string; fullName: string; phone: string | null; roles: string[] }) {
    return this.http.post<UserView>('/api/v1/users', body);
  }
  update(id: string, body: { fullName: string; phone: string | null }) { return this.http.patch<UserView>(`/api/v1/users/${id}`, body); }
  setRoles(id: string, roles: string[]) { return this.http.put<UserView>(`/api/v1/users/${id}/roles`, { roles }); }
  setStatus(id: string, status: UserStatus) { return this.http.patch<UserView>(`/api/v1/users/${id}/status`, { status }); }
  resendInvitation(id: string) { return this.http.post<UserView>(`/api/v1/users/${id}/invitation`, {}); }
  accessLog(id: string, q: PageQuery) { return this.http.get<Page<AccessLogView>>(`/api/v1/users/${id}/access-log`, { params: params({ ...q }) }); }
  roles() { return this.http.get<RoleView[]>('/api/v1/roles'); }
}

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private http = inject(HttpClient);

  me() { return this.http.get<UserView>('/api/v1/users/me'); }
  update(body: { fullName: string; phone: string | null }) { return this.http.patch<UserView>('/api/v1/users/me', body); }
  accessLog(q: PageQuery) { return this.http.get<Page<AccessLogView>>('/api/v1/users/me/access-log', { params: params({ ...q }) }); }
  sessions() { return this.http.get<SessionInfo[]>('/api/v1/auth/sessions'); }
  revokeSession(id: string) { return this.http.delete<void>(`/api/v1/auth/sessions/${id}`); }
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<void>('/api/v1/auth/change-password', { currentPassword, newPassword });
  }
}

@Injectable({ providedIn: 'root' })
export class PublicAuthApi {
  private http = inject(HttpClient);

  forgotPassword(email: string) { return this.http.post<void>('/api/v1/auth/forgot-password', { email }); }
  resetPassword(token: string, password: string) { return this.http.post<void>('/api/v1/auth/reset-password', { token, password }); }
  acceptInvitation(token: string, password: string) { return this.http.post<void>('/api/v1/auth/accept-invitation', { token, password }); }
  linkInfo(token: string, purpose: 'INVITATION' | 'PASSWORD_RESET') {
    return this.http.get<{ fullName: string; email: string; purpose: string }>('/api/v1/auth/link-info', { params: params({ token, purpose }) });
  }
}

@Injectable({ providedIn: 'root' })
export class DiagnosticsApi {
  private http = inject(HttpClient);
  private base = '/api/v1/admin/diagnostic-requests';

  list(q: PageQuery & { status?: DiagnosticStatus | '' }) { return this.http.get<Page<DiagnosticRequest>>(this.base, { params: params({ ...q }) }); }
  get(id: string) { return this.http.get<DiagnosticRequest>(`${this.base}/${id}`); }
  update(id: string, status: DiagnosticStatus, internalNotes: string | null) {
    return this.http.patch<DiagnosticRequest>(`${this.base}/${id}`, { status, internalNotes });
  }
  delete(id: string) { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private http = inject(HttpClient);
  summary(from?: string, to?: string) { return this.http.get<DashboardSummary>('/api/v1/dashboard/summary', { params: params({ from, to }) }); }
}

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private http = inject(HttpClient);
  activity(q: PageQuery & { entityType?: string }) { return this.http.get<Page<ActivityView>>('/api/v1/audit/activity', { params: params({ ...q }) }); }
  access(q: PageQuery) { return this.http.get<Page<AccessLogView>>('/api/v1/audit/access', { params: params({ ...q }) }); }
}
