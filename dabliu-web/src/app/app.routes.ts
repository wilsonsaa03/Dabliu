import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';

/**
 * Rutas del sitio. Todas se prerenderizan como HTML estático (ver app.routes.server.ts).
 * La política se carga aparte (lazy) para no sumar peso a la landing.
 */
export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'politica-de-datos', loadComponent: () => import('./pages/privacy/privacy').then((m) => m.PrivacyPage) },
  { path: '**', redirectTo: '' },
];
