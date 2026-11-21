import type { Sector } from '../../core/models';

/** Contratos de /api/v1/crm (espejo de CrmDtos). Montos en COP enteros. */

export type LeadStage = 'NUEVO' | 'CONTACTADO' | 'CALIFICADO' | 'REUNION_PROGRAMADA' | 'PROPUESTA_ENVIADA' | 'NEGOCIACION' | 'GANADO' | 'PERDIDO';
export type LeadSource = 'WEB_FORM' | 'WHATSAPP' | 'REFERRAL' | 'SOCIAL' | 'EVENT' | 'DIRECT' | 'OTHER';
export type Temperature = 'COLD' | 'WARM' | 'HOT';
export type InteractionType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE';
export type ActivityType = 'CALL' | 'MEETING' | 'FOLLOW_UP' | 'TASK';

export interface LeadSummary {
  id: string;
  title: string;
  contactName: string;
  companyName: string | null;
  stage: LeadStage;
  temperature: Temperature;
  estimatedBudget: number | null;
  source: LeadSource;
  ownerId: string | null;
  ownerName: string | null;
  nextActivityAt: string | null;
  overdue: boolean;
  converted: boolean;
  archived: boolean;
  stageChangedAt: string;
  createdAt: string;
}

export interface BoardColumn { stage: LeadStage; label: string; total: number; value: number; leads: LeadSummary[] }

export interface StageChangeView { id: string; fromStage: LeadStage | null; toStage: LeadStage; note: string | null; changedByName: string; changedAt: string }
export interface InteractionView { id: string; type: InteractionType; summary: string; occurredAt: string; authorName: string | null }
export interface ActivityView {
  id: string; leadId: string; leadTitle: string | null; type: ActivityType; title: string; dueAt: string;
  assigneeId: string | null; assigneeName: string | null; completedAt: string | null; completedByName: string | null; overdue: boolean;
}

export interface LeadDetail {
  id: string; title: string; contactName: string; contactEmail: string | null; contactPhone: string | null; companyName: string | null;
  companyId: string | null; contactId: string | null; sector: Sector | null; need: string | null; estimatedBudget: number | null;
  services: string[]; source: LeadSource; stage: LeadStage; temperature: Temperature; ownerId: string | null; ownerName: string | null;
  lostReason: string | null; diagnosticRequestId: string | null; clientId: string | null; convertedAt: string | null;
  stageChangedAt: string; archived: boolean; createdAt: string; updatedAt: string; createdByName: string | null;
  stageHistory: StageChangeView[]; interactions: InteractionView[]; activities: ActivityView[];
}

export interface LeadRequest {
  title: string; contactName: string; contactEmail: string | null; contactPhone: string | null; companyName: string | null;
  companyId: string | null; contactId: string | null; sector: Sector | null; need: string | null; estimatedBudget: number | null;
  services: string[]; source: LeadSource; temperature: Temperature; ownerId: string | null;
}

export interface CompanyView {
  id: string; name: string; taxId: string | null; sector: Sector | null; city: string | null; website: string | null;
  phone: string | null; notes: string | null; archived: boolean; createdAt: string; updatedAt: string;
}
export interface ContactView {
  id: string; companyId: string | null; companyName: string | null; fullName: string; email: string | null; phone: string | null;
  position: string | null; notes: string | null; archived: boolean; createdAt: string;
}
export interface CompanyDetail { company: CompanyView; contacts: ContactView[]; leads: LeadSummary[]; clientId: string | null }
export interface ConversionResult { clientId: string; clientName: string; clientCreated: boolean; companyId: string; contactId: string }
export interface Person { id: string; fullName: string }

export interface ClientView {
  id: string; name: string; taxId: string | null; companyId: string | null; contactId: string | null; email: string | null;
  phone: string | null; city: string | null; sector: Sector | null; status: 'ACTIVO' | 'INACTIVO' | 'POTENCIAL' | 'SUSPENDIDO';
  joinedAt: string; createdAt: string;
}
