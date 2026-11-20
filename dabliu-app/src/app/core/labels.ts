import type { DiagnosticStatus, Sector, UserStatus } from './models';

/** Textos en español para los valores que llegan de la API. */

export const DIAGNOSTIC_STATUS: Record<DiagnosticStatus, { label: string; tone: string }> = {
  NEW: { label: 'Nueva', tone: 'badge-info' },
  CONTACTED: { label: 'Contactada', tone: 'badge-brand' },
  SCHEDULED: { label: 'Agendada', tone: 'badge-warn' },
  COMPLETED: { label: 'Atendida', tone: 'badge-ok' },
  DISCARDED: { label: 'Descartada', tone: '' },
};

export const SECTOR: Record<Sector, string> = {
  TRANSPORT_LOGISTICS: 'Transporte y logística',
  COMMERCE_SERVICES: 'Comercio y servicios',
  AUTOMOTIVE_WORKSHOPS: 'Automotriz y talleres',
  OTHER: 'Otro sector',
};

export const BUDGET: Record<string, string> = {
  UNKNOWN: 'Sin definir',
  UNDER_5M: 'Menos de $5 millones',
  FROM_5M_TO_15M: '$5 a $15 millones',
  FROM_15M_TO_40M: '$15 a $40 millones',
  OVER_40M: 'Más de $40 millones',
};

export const USER_STATUS: Record<UserStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Activo', tone: 'badge-ok' },
  INVITED: { label: 'Invitado', tone: 'badge-warn' },
  INACTIVE: { label: 'Inactivo', tone: '' },
};

export const ACCESS_EVENT: Record<string, { label: string; tone: string }> = {
  LOGIN_SUCCESS: { label: 'Inicio de sesión', tone: 'badge-ok' },
  LOGIN_FAILED: { label: 'Intento fallido', tone: 'badge-danger' },
  LOGIN_LOCKED: { label: 'Cuenta bloqueada', tone: 'badge-danger' },
  LOGOUT: { label: 'Cierre de sesión', tone: '' },
  REFRESH_REUSE: { label: 'Token reutilizado', tone: 'badge-danger' },
  PASSWORD_CHANGED: { label: 'Cambio de contraseña', tone: 'badge-info' },
  PASSWORD_RESET: { label: 'Contraseña restablecida', tone: 'badge-info' },
  INVITATION_ACCEPTED: { label: 'Cuenta activada', tone: 'badge-ok' },
  SESSION_REVOKED: { label: 'Sesión cerrada', tone: '' },
};

/** Describe un navegador a partir del user-agent, sin librerías (suficiente para reconocer el dispositivo). */
export function describeAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} en ${os}` : browser;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}
