import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap, throwError } from 'rxjs';
import type { Me } from '../models';

/**
 * Sesión del usuario.
 * - Los tokens viven en cookies HttpOnly: este servicio nunca los ve ni los guarda (nada en localStorage).
 * - El backend es la autoridad: los permisos de aquí solo sirven para mostrar u ocultar opciones.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** undefined = aún no se sabe (cargando); null = sin sesión. */
  private readonly state = signal<Me | null | undefined>(undefined);
  readonly user = this.state.asReadonly();
  readonly isAuthenticated = computed(() => !!this.state());
  private readonly permissions = computed(() => new Set(this.state()?.permissions ?? []));

  private refreshing$?: Observable<boolean>;

  can(permission: string): boolean {
    return this.permissions().has(permission);
  }

  canAny(permissions: string[]): boolean {
    return permissions.some((p) => this.can(p));
  }

  /** Al arrancar: obtiene la cookie CSRF y averigua si ya hay una sesión (renovándola si hace falta). */
  async init(): Promise<void> {
    try {
      await firstValueFrom(this.http.get('/api/v1/auth/csrf'));
    } catch {
      // Sin servidor: la pantalla de login mostrará el error al intentar entrar.
    }
    try {
      this.state.set(await firstValueFrom(this.http.get<Me>('/api/v1/auth/me')));
    } catch {
      const renewed = await firstValueFrom(this.refresh());
      if (!renewed) this.state.set(null);
    }
  }

  login(email: string, password: string): Observable<Me> {
    return this.http.post<Me>('/api/v1/auth/login', { email, password }).pipe(tap((me) => this.state.set(me)));
  }

  /**
   * Renueva la sesión una sola vez aunque varias solicitudes la pidan a la vez.
   * Un 409 (REFRESH_RACE) significa que otra pestaña ya la renovó: las cookies nuevas ya están.
   */
  refresh(): Observable<boolean> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<Me>('/api/v1/auth/refresh', {}).pipe(
        tap((me) => this.state.set(me)),
        map(() => true),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 409) return of(true);
          this.state.set(null);
          return of(false);
        }),
        finalize(() => (this.refreshing$ = undefined)),
        shareReplay(1),
      );
    }
    return this.refreshing$;
  }

  /** Vuelve a leer el usuario (tras cambiar el perfil o los roles). */
  reload(): Observable<Me> {
    return this.http.get<Me>('/api/v1/auth/me').pipe(tap((me) => this.state.set(me)));
  }

  logout(): void {
    this.http.post('/api/v1/auth/logout', {}).pipe(catchError(() => of(null))).subscribe(() => {
      this.state.set(null);
      void this.router.navigate(['/login']);
    });
  }

  /** La sesión venció del lado del servidor: limpiar y enviar al login conservando a dónde iba. */
  expire(returnUrl?: string): void {
    this.state.set(null);
    void this.router.navigate(['/login'], { queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {} });
  }

  /** Página por defecto según los permisos. */
  homePath(): string {
    return this.can('dashboard.read') ? '/panel' : '/perfil';
  }

  /** Errores que se propagan sin reintentos. */
  static rethrow(err: unknown) {
    return throwError(() => err);
  }
}
