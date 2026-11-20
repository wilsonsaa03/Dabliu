import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff, LogIn, CircleAlert, CircleCheck } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { toProblem } from '../../core/api-error';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayout],
  template: `
    <app-auth-layout title="Inicia sesión" subtitle="Accede con el correo de tu cuenta de DABLIU.">
      @if (notice()) {
        <p class="mb-5 flex items-start gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[13.5px] text-ok" role="status">
          <lucide-icon [img]="icons.CircleCheck" [size]="17" class="mt-0.5 shrink-0" />{{ notice() }}
        </p>
      }
      @if (error()) {
        <p class="mb-5 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger" role="alert">
          <lucide-icon [img]="icons.CircleAlert" [size]="17" class="mt-0.5 shrink-0" />{{ error() }}
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <div>
          <label class="label" for="email">Correo</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="username" autofocus
                 [attr.aria-invalid]="invalid('email')" placeholder="tu@empresa.co">
          @if (invalid('email')) { <p class="field-error">Escribe un correo válido.</p> }
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="label" for="password">Contraseña</label>
            <a routerLink="/recuperar" class="mb-1.5 text-[12.5px] font-semibold text-accent no-underline hover:underline">¿La olvidaste?</a>
          </div>
          <div class="relative">
            <input id="password" class="input pr-11" [type]="showPassword() ? 'text' : 'password'" formControlName="password"
                   autocomplete="current-password" [attr.aria-invalid]="invalid('password')">
            <button type="button" class="btn btn-ghost btn-icon btn-sm absolute right-1.5 top-1/2 -translate-y-1/2"
                    (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <lucide-icon [img]="showPassword() ? icons.EyeOff : icons.Eye" [size]="16" />
            </button>
          </div>
          @if (invalid('password')) { <p class="field-error">Escribe tu contraseña.</p> }
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
          @if (loading()) { <span class="spinner" aria-hidden="true"></span> Entrando… } @else { <lucide-icon [img]="icons.LogIn" [size]="17" /> Entrar }
        </button>
      </form>
      <p class="mt-8 text-center text-[12.5px] text-fg-3">¿No tienes cuenta? Las cuentas las crea un administrador de DABLIU.</p>
    </app-auth-layout>
  `,
  styles: `
    .spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class LoginPage {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Ruta a la que volver después de entrar (la pone el guard). */
  readonly returnUrl = input<string>();
  /** Mensaje tras activar la cuenta o restablecer la contraseña. */
  readonly done = input<string>();

  readonly icons = { Eye, EyeOff, LogIn, CircleAlert, CircleCheck };
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly notice = () => this.done() === 'activada' ? 'Tu cuenta quedó activa. Ya puedes iniciar sesión.'
    : this.done() === 'restablecida' ? 'Tu contraseña se actualizó. Inicia sesión con la nueva.' : null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const target = this.returnUrl()?.startsWith('/') && !this.returnUrl()!.startsWith('//') ? this.returnUrl()! : this.auth.homePath();
        void this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.loading.set(false);
        const p = toProblem(err);
        this.error.set(p.detail ?? 'No se pudo iniciar sesión.');
        if (p.code === 'INVALID_CREDENTIALS') this.form.controls.password.reset();
      },
    });
  }
}
