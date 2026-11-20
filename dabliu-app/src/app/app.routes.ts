import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirect, permissionGuard } from './core/auth/guards';
import { Shell } from './core/layout/shell';

/**
 * Rutas. Cada módulo se carga solo cuando se visita (lazy loading).
 * data.permission oculta la navegación sin permiso; el backend vuelve a verificar cada solicitud.
 */
export const routes: Routes = [
  // ---------- Públicas ----------
  { path: 'login', canActivate: [guestGuard], title: 'Iniciar sesión · DABLIU SaaS',
    loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage) },
  { path: 'recuperar', canActivate: [guestGuard], title: 'Recuperar contraseña · DABLIU SaaS',
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPasswordPage) },
  { path: 'restablecer', title: 'Nueva contraseña · DABLIU SaaS', data: { mode: 'reset' },
    loadComponent: () => import('./features/auth/set-password').then((m) => m.SetPasswordPage) },
  { path: 'activar', title: 'Activar cuenta · DABLIU SaaS', data: { mode: 'invitation' },
    loadComponent: () => import('./features/auth/set-password').then((m) => m.SetPasswordPage) },

  // ---------- Privadas (con barra lateral) ----------
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirect], children: [] },
      { path: 'panel', title: 'Panel · DABLIU SaaS', data: { permission: 'dashboard.read' },
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'solicitudes', title: 'Solicitudes web · DABLIU SaaS', data: { permission: 'diagnostics.read' },
        loadComponent: () => import('./features/diagnostics/diagnostics').then((m) => m.DiagnosticsPage) },
      { path: 'usuarios', title: 'Usuarios · DABLIU SaaS', data: { permission: 'users.read' },
        loadComponent: () => import('./features/users/users').then((m) => m.UsersPage) },
      { path: 'usuarios/:id', title: 'Usuario · DABLIU SaaS', data: { permission: 'users.read' },
        loadComponent: () => import('./features/users/user-detail').then((m) => m.UserDetailPage) },
      { path: 'auditoria', title: 'Auditoría · DABLIU SaaS', data: { permission: 'audit.read' },
        loadComponent: () => import('./features/audit/audit').then((m) => m.AuditPage) },
      { path: 'perfil', title: 'Mi perfil · DABLIU SaaS',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfilePage) },
      { path: 'sin-permiso', title: 'Sin permiso · DABLIU SaaS',
        loadComponent: () => import('./features/errors/errors').then((m) => m.ForbiddenPage) },
    ],
  },
  { path: '**', title: 'Página no encontrada · DABLIU SaaS',
    loadComponent: () => import('./features/errors/errors').then((m) => m.NotFoundPage) },
];
