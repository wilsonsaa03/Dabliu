import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { authGuard, permissionGuard } from './auth/guards';
import { describeAgent, initials } from './labels';
import { matching, passwordChecks, strongPassword } from '../shared/password-rules';

describe('Reglas de contraseña (mismas que el backend)', () => {
  it('exige 10 caracteres con letras y números', () => {
    expect(strongPassword(new FormControl('corta1'))).toEqual({ weakPassword: true });
    expect(strongPassword(new FormControl('solo-letras-largas'))).toEqual({ weakPassword: true });
    expect(strongPassword(new FormControl('1234567890'))).toEqual({ weakPassword: true });
    expect(strongPassword(new FormControl('clave-segura-2026'))).toBeNull();
    expect(passwordChecks('ñandú-2026-xx').every((c) => c.ok)).toBeTrue();
  });

  it('detecta confirmaciones distintas', () => {
    const group = new FormGroup({ a: new FormControl('uno'), b: new FormControl('dos') }, { validators: matching('a', 'b') });
    expect(group.hasError('mismatch')).toBeTrue();
    group.controls.b.setValue('uno');
    expect(group.hasError('mismatch')).toBeFalse();
  });
});

describe('Textos', () => {
  it('describe el navegador y el sistema', () => {
    expect(describeAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/140 Safari/537')).toBe('Chrome en Windows');
    expect(describeAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18) AppleWebKit Version/18 Safari/604')).toBe('Safari en iOS');
    expect(describeAgent(null)).toBe('Dispositivo desconocido');
  });

  it('calcula iniciales', () => {
    expect(initials('Laura Gómez Ruiz')).toBe('LG');
  });
});

describe('Guards', () => {
  const user = signal<{ permissions: string[] } | null>(null);
  const fakeAuth = {
    isAuthenticated: () => !!user(),
    can: (p: string) => user()?.permissions.includes(p) ?? false,
    homePath: () => '/panel',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: fakeAuth }],
    });
  });

  const run = (guard: typeof authGuard, data: Record<string, unknown> = {}, url = '/usuarios') =>
    TestBed.runInInjectionContext(() => guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

  it('sin sesión envía al login conservando la ruta', () => {
    user.set(null);
    const result = run(authGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fusuarios');
  });

  it('sin el permiso de la ruta envía a "sin permiso"', () => {
    user.set({ permissions: ['dashboard.read'] });
    const denied = run(permissionGuard, { permission: 'users.read' }) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(denied)).toBe('/sin-permiso');
    expect(run(permissionGuard, { permission: 'dashboard.read' })).toBeTrue();
  });
});
