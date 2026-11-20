import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Exige sesión. Sin sesión, al login conservando la ruta pedida. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Pantallas públicas (login, recuperar): si ya hay sesión, a la página de inicio. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).parseUrl(auth.homePath()) : true;
};

/**
 * Exige un permiso (data.permission en la ruta). Es solo para la navegación:
 * el backend vuelve a verificar cada solicitud.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const needed = route.data['permission'] as string | undefined;
  if (!needed || auth.can(needed)) return true;
  return inject(Router).createUrlTree(['/sin-permiso']);
};

/** Redirección de "/" según los permisos. */
export const homeRedirect: CanActivateFn = () => inject(Router).parseUrl(inject(AuthService).homePath());
