import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Rutas de autenticación: sus 401 son respuestas normales (credenciales), no sesiones vencidas. */
const AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout', '/api/v1/auth/me', '/api/v1/auth/csrf'];

/**
 * Si una solicitud recibe 401 porque venció el token de acceso (15 min), renueva la sesión
 * una vez y repite la solicitud. Si no se puede renovar, envía al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthCall = AUTH_PATHS.some((p) => req.url.startsWith(p));
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthCall) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((ok) => {
          if (ok) return next(req);
          auth.expire(router.url);
          return throwError(() => error);
        }),
      );
    }),
  );
};
