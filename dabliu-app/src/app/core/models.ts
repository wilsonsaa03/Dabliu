/**
 * Contratos de la API (espejo de los DTO del backend). Fechas en ISO-8601 UTC.
 */

export interface Me {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
}

/** Respuesta paginada de Spring (PagedModel). */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/** Error RFC 9457 (problem+json). */
export interface Problem {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
}

export type UserStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE';

export interface RoleRef { code: string; name: string }

export interface UserView {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  roles: RoleRef[];
  locked: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionView { code: string; module: string; description: string }
export interface RoleView { code: string; name: string; description: string; permissions: PermissionView[] }

export interface AccessLogView {
  id: string;
  event: string;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  lastActivityAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
}

export interface ActivityView {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  details: string | null;
  createdAt: string;
}

export type DiagnosticStatus = 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'DISCARDED';
export type Sector = 'TRANSPORT_LOGISTICS' | 'COMMERCE_SERVICES' | 'AUTOMOTIVE_WORKSHOPS' | 'OTHER';

export interface DiagnosticRequest {
  id: string;
  fullName: string;
  company: string | null;
  phone: string;
  email: string | null;
  sector: Sector;
  budget: string;
  need: string;
  consentAcceptedAt: string;
  status: DiagnosticStatus;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  period: { from: string; to: string; timezone: string };
  diagnostics: {
    receivedInPeriod: number;
    receivedPreviousPeriod: number;
    pendingNew: number;
    byStatus: Record<DiagnosticStatus, number>;
    perDay: { day: string; total: number }[];
  } | null;
  crm: {
    newLeads: number;
    newLeadsPrevious: number;
    openOpportunities: number;
    pipelineValue: number;
    wonInPeriod: number;
    lostInPeriod: number;
    myOverdueActivities: number;
    funnel: { stage: string; label: string; total: number; value: number }[];
    myUpcoming: { id: string; leadId: string; title: string; dueAt: string; overdue: boolean }[];
  } | null;
  users: { active: number; invited: number; inactive: number } | null;
  recentActivity: {
    id: string; actorName: string; action: string; entityType: string; entityId: string | null; summary: string; createdAt: string;
  }[] | null;
}
