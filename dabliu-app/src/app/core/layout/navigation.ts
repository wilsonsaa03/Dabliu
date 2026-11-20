import { LayoutDashboard, Inbox, Users, ScrollText, LucideIconData } from 'lucide-angular';

export interface NavItem { label: string; path: string; icon: LucideIconData; permission: string }
export interface NavGroup { label: string; items: NavItem[] }

/**
 * Menú lateral. Solo aparecen los módulos que existen y que el usuario puede usar:
 * los módulos de fases siguientes (CRM, proyectos, finanzas…) se agregan aquí cuando se construyan.
 */
export const NAVIGATION: NavGroup[] = [
  { label: 'General', items: [
    { label: 'Panel', path: '/panel', icon: LayoutDashboard, permission: 'dashboard.read' },
  ] },
  { label: 'Comercial', items: [
    { label: 'Solicitudes web', path: '/solicitudes', icon: Inbox, permission: 'diagnostics.read' },
  ] },
  { label: 'Administración', items: [
    { label: 'Usuarios', path: '/usuarios', icon: Users, permission: 'users.read' },
    { label: 'Auditoría', path: '/auditoria', icon: ScrollText, permission: 'audit.read' },
  ] },
];
