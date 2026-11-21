import { LayoutDashboard, Inbox, Users, ScrollText, SquareKanban, CalendarCheck, Building2, Contact, BadgeCheck, LucideIconData } from 'lucide-angular';

export interface NavItem { label: string; path: string; icon: LucideIconData; permission: string; exact?: boolean }
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
    { label: 'Prospectos', path: '/crm', icon: SquareKanban, permission: 'crm.read', exact: true },
    { label: 'Actividades', path: '/crm/actividades', icon: CalendarCheck, permission: 'crm.read' },
    { label: 'Empresas', path: '/crm/empresas', icon: Building2, permission: 'crm.read' },
    { label: 'Contactos', path: '/crm/contactos', icon: Contact, permission: 'crm.read' },
    { label: 'Solicitudes web', path: '/solicitudes', icon: Inbox, permission: 'diagnostics.read' },
  ] },
  { label: 'Clientes', items: [
    { label: 'Clientes', path: '/clientes', icon: BadgeCheck, permission: 'clients.read' },
  ] },
  { label: 'Administración', items: [
    { label: 'Usuarios', path: '/usuarios', icon: Users, permission: 'users.read' },
    { label: 'Auditoría', path: '/auditoria', icon: ScrollText, permission: 'audit.read' },
  ] },
];
