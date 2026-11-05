import { Component, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { COMPANY, CONTACT } from '../../core/contact';
import { DiagnosticService, SECTORS, Sector } from '../../core/diagnostic.service';
import { LeadIntentService } from '../../core/lead-intent.service';
import { WHATSAPP_ICON } from '../../shared/icons';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Sección de contacto: oferta de entrada + formulario corto del diagnóstico gratuito.
 * El presupuesto ya no se pide aquí (se conversa en el diagnóstico); se envía UNKNOWN
 * para conservar el contrato con la API.
 */
@Component({
  selector: 'app-cta',
  imports: [RevealDirective, ReactiveFormsModule],
  templateUrl: './cta.html',
  styleUrl: './cta.scss',
})
export class Cta {
  readonly contact = CONTACT;
  readonly company = COMPANY;
  readonly sectors = SECTORS;
  readonly waIcon = WHATSAPP_ICON;

  private diagnostics = inject(DiagnosticService);
  private intent = inject(LeadIntentService);

  readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d\s()-]{7,20}$/)]],
    sector: ['' as Sector | '', Validators.required],
    need: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(1500)]],
    company: ['', Validators.maxLength(120)],
    email: ['', [Validators.email, Validators.maxLength(160)]],
    dataConsent: [false, Validators.requiredTrue],
    website: [''], // trampa para bots: las personas no ven este campo
  });

  status = signal<Status>('idle');
  submitted = signal(false);

  constructor() {
    // Si el visitante viene de la tarjeta de un sector, se deja marcado.
    effect(() => {
      const sector = this.intent.sector();
      if (sector) this.form.controls.sector.setValue(sector);
    });
  }

  /** Muestra el error de un campo solo después de tocarlo o de intentar enviar. */
  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  /** Campo con valor correcto, para mostrar el check verde. */
  valid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.valid && control.dirty && String(control.value ?? '').trim() !== '';
  }

  submit(formEl: HTMLFormElement): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      formEl.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid')?.focus();
      this.shakeInvalid(formEl);
      return;
    }

    const v = this.form.getRawValue();
    if (v.website) {
      this.status.set('sent');
      return;
    }

    this.status.set('sending');
    this.diagnostics.create({
      fullName: v.fullName.trim(),
      company: v.company.trim() || null,
      phone: v.phone.trim(),
      email: v.email.trim() || null,
      sector: v.sector as Sector,
      budget: 'UNKNOWN',
      need: v.need.trim(),
      dataConsent: true,
    }).subscribe({
      next: () => this.status.set('sent'),
      error: () => this.status.set('error'),
    });
  }

  /** Sacudida breve de los campos con error (se omite si el usuario pidió reducir movimiento). */
  private shakeInvalid(formEl: HTMLFormElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Espera al siguiente cuadro para que Angular ya haya marcado los campos con .is-invalid
    requestAnimationFrame(() => {
      formEl.querySelectorAll<HTMLElement>('.field.is-invalid, .consent.is-invalid').forEach((el) => {
        el.classList.remove('shake');
        void el.offsetWidth; // reinicia la animación
        el.classList.add('shake');
        el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
      });
    });
  }

  reset(): void {
    this.form.reset();
    this.submitted.set(false);
    this.status.set('idle');
  }

  /** Respaldo si la API no responde: la misma solicitud, por WhatsApp. */
  whatsappUrl(): string {
    const v = this.form.getRawValue();
    const sector = SECTORS.find((s) => s.value === v.sector)?.label ?? '';
    const text = [
      'Hola DABLIU, quiero solicitar el diagnóstico tecnológico gratuito.',
      `Nombre: ${v.fullName}`,
      v.company && `Empresa: ${v.company}`,
      sector && `Sector: ${sector}`,
      `Necesidad: ${v.need}`,
    ].filter(Boolean).join('\n');
    return `${this.contact.whatsappUrl}?text=${encodeURIComponent(text)}`;
  }
}
