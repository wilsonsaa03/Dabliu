import { Pipe, PipeTransform } from '@angular/core';
import type { ActivityType, InteractionType, LeadSource, LeadStage, Temperature } from './crm.models';

/** Etapas en orden, con su tono visual. */
export const STAGES: { code: LeadStage; label: string; tone: string }[] = [
  { code: 'NUEVO', label: 'Nuevo', tone: 'badge-info' },
  { code: 'CONTACTADO', label: 'Contactado', tone: 'badge-brand' },
  { code: 'CALIFICADO', label: 'Calificado', tone: 'badge-brand' },
  { code: 'REUNION_PROGRAMADA', label: 'Reunión programada', tone: 'badge-warn' },
  { code: 'PROPUESTA_ENVIADA', label: 'Propuesta enviada', tone: 'badge-warn' },
  { code: 'NEGOCIACION', label: 'Negociación', tone: 'badge-warn' },
  { code: 'GANADO', label: 'Ganado', tone: 'badge-ok' },
  { code: 'PERDIDO', label: 'Perdido', tone: 'badge-danger' },
];
export const STAGE: Record<LeadStage, { label: string; tone: string }> =
  Object.fromEntries(STAGES.map((s) => [s.code, { label: s.label, tone: s.tone }])) as Record<LeadStage, { label: string; tone: string }>;

export const SOURCE: Record<LeadSource, string> = {
  WEB_FORM: 'Formulario web', WHATSAPP: 'WhatsApp', REFERRAL: 'Referido', SOCIAL: 'Redes sociales',
  EVENT: 'Evento', DIRECT: 'Contacto directo', OTHER: 'Otro',
};

export const TEMPERATURE: Record<Temperature, { label: string; color: string }> = {
  HOT: { label: 'Caliente', color: 'var(--danger)' },
  WARM: { label: 'Tibio', color: 'var(--warn)' },
  COLD: { label: 'Frío', color: 'var(--info)' },
};

export const INTERACTION: Record<InteractionType, string> = {
  CALL: 'Llamada', WHATSAPP: 'WhatsApp', EMAIL: 'Correo', MEETING: 'Reunión', NOTE: 'Nota',
};

export const ACTIVITY: Record<ActivityType, string> = {
  CALL: 'Llamar', MEETING: 'Reunión', FOLLOW_UP: 'Seguimiento', TASK: 'Tarea',
};

/** Catálogo de servicios de DABLIU (los mismos de la landing). */
export const SERVICES: { code: string; label: string }[] = [
  { code: 'SOFTWARE_A_MEDIDA', label: 'Software a medida' },
  { code: 'APPS_MOVILES', label: 'Apps móviles' },
  { code: 'SOLUCIONES_WEB', label: 'Soluciones web' },
  { code: 'AUTOMATIZACION', label: 'Automatización' },
  { code: 'DATOS_IA', label: 'Datos e IA' },
  { code: 'SEGURIDAD', label: 'Seguridad digital' },
  { code: 'CLOUD', label: 'Cloud e infraestructura' },
  { code: 'INTEGRACIONES', label: 'Integraciones' },
];
export const SERVICE_LABEL: Record<string, string> = Object.fromEntries(SERVICES.map((s) => [s.code, s.label]));

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const COP_SHORT = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 });

/** Pesos colombianos: "$ 12.000.000" o, compacto, "$ 12 M". */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(value: number | null | undefined, compact = false): string {
    if (value === null || value === undefined) return '—';
    return (compact ? COP_SHORT : COP).format(value);
  }
}
