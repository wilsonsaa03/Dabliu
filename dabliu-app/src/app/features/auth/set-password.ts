import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, CircleAlert } from 'lucide-angular';
import { PublicAuthApi } from '../../core/api';
import { problemMessage } from '../../core/api-error';
import { PasswordRules, matching, strongPassword } from '../../shared/password-rules';
import { AuthLayout } from './auth-layout';

/** Crear contraseña: activa una cuenta invitada (/activar) o restablece la contraseña (/restablecer). */
@Component({
  selector: 'app-set-password',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayout, PasswordRules],
  template: `
    <app-auth-layout [title]="isInvitation() ? 'Activa tu cuenta' : 'Crea una contraseña nueva'"
                     [subtitle]="greeting()">
      @if (linkError()) {
        <div class="card card-pad flex gap-3" role="alert">
          <lucide-icon [img]="alertIcon" [size]="22" class="shrink-0 text-danger" />
          <div>
            <p class="font-semibold">El enlace no sirve</p>
            <p class="mt-1 text-[13.5px] text-fg-2">{{ linkError() }}</p>
            <a [routerLink]="isInvitation() ? '/login' : '/recuperar'" class="btn btn-secondary btn-sm mt-4">
              {{ isInvitation() ? 'Ir a iniciar sesión' : 'Pedir un enlace nuevo' }}
            </a>
          </div>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <div>
            <label class="label" for="password">Contraseña</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" autofocus
                   [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched">
            <app-password-rules [value]="password()" />
          </div>
          <div>
            <label class="label" for="confirm">Confirma la contraseña</label>
            <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password"
                   [attr.aria-invalid]="form.hasError('mismatch') && form.controls.confirm.touched">
            @if (form.hasError('mismatch') && form.controls.confirm.touched) { <p class="field-error">Las contraseñas no coinciden.</p> }
          </div>
          @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
          <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
            {{ loading() ? 'Guardando…' : isInvitation() ? 'Activar cuenta' : 'Guardar contraseña' }}
          </button>
        </form>
      }
    </app-auth-layout>
  `,
})
export class SetPasswordPage implements OnInit {
  private api = inject(PublicAuthApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly token = input<string>();
  readonly alertIcon = CircleAlert;
  readonly isInvitation = computed(() => this.route.snapshot.data['mode'] === 'invitation');
  readonly name = signal<string | null>(null);
  readonly greeting = computed(() => this.name()
    ? `Hola, ${this.name()}. ${this.isInvitation() ? 'Crea tu contraseña para entrar a DABLIU SaaS.' : 'Escribe tu nueva contraseña.'}`
    : this.isInvitation() ? 'Crea tu contraseña para entrar a DABLIU SaaS.' : 'Escribe tu nueva contraseña.');
  readonly linkError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(NonNullableFormBuilder).group(
    { password: ['', [Validators.required, strongPassword]], confirm: ['', Validators.required] },
    { validators: matching('password', 'confirm') },
  );
  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  ngOnInit(): void {
    const token = this.token();
    if (!token) { this.linkError.set('Falta el código del enlace. Ábrelo de nuevo desde el correo.'); return; }
    this.api.linkInfo(token, this.isInvitation() ? 'INVITATION' : 'PASSWORD_RESET').subscribe({
      next: (info) => this.name.set(info.fullName.split(' ')[0] ?? info.fullName),
      error: (err) => this.linkError.set(problemMessage(err)),
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    const password = this.form.getRawValue().password;
    const call = this.isInvitation() ? this.api.acceptInvitation(this.token()!, password) : this.api.resetPassword(this.token()!, password);
    call.subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { done: this.isInvitation() ? 'activada' : 'restablecida' } }),
      error: (err) => { this.loading.set(false); this.error.set(problemMessage(err)); },
    });
  }
}
