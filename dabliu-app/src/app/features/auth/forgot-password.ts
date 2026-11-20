import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, MailCheck } from 'lucide-angular';
import { PublicAuthApi } from '../../core/api';
import { problemMessage } from '../../core/api-error';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayout],
  template: `
    <app-auth-layout title="Recupera tu acceso" subtitle="Te enviaremos un enlace para crear una contraseña nueva.">
      @if (sent()) {
        <div class="card card-pad flex gap-3" role="status">
          <lucide-icon [img]="icons.MailCheck" [size]="22" class="shrink-0 text-ok" />
          <div>
            <p class="font-semibold">Revisa tu correo</p>
            <p class="mt-1 text-[13.5px] text-fg-2">Si {{ form.controls.email.value }} tiene una cuenta activa, recibirás un enlace que vence en 30 minutos. Revisa también la carpeta de spam.</p>
          </div>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <div>
            <label class="label" for="email">Correo de tu cuenta</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" autofocus
                   [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched">
            @if (form.controls.email.invalid && form.controls.email.touched) { <p class="field-error">Escribe un correo válido.</p> }
          </div>
          @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
          <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">{{ loading() ? 'Enviando…' : 'Enviar enlace' }}</button>
        </form>
      }
      <a routerLink="/login" class="mt-6 inline-flex items-center gap-2 text-[13.5px] font-semibold text-fg-2 no-underline hover:text-fg">
        <lucide-icon [img]="icons.ArrowLeft" [size]="16" /> Volver a iniciar sesión
      </a>
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private api = inject(PublicAuthApi);
  readonly icons = { ArrowLeft, MailCheck };
  readonly form = inject(NonNullableFormBuilder).group({ email: ['', [Validators.required, Validators.email]] });
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.api.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: (err) => { this.loading.set(false); this.error.set(problemMessage(err)); },
    });
  }
}
