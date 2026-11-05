import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Scene3d } from '../../shared/scene-3d/scene-3d';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { CONTACT } from '../../core/contact';
import { BUDGETS, Budget, DiagnosticService, SECTORS, Sector } from '../../core/diagnostic.service';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Sección de contacto: oferta de entrada + formulario del diagnóstico gratuito. */
@Component({
  selector: 'app-cta',
  imports: [Scene3d, RevealDirective, ReactiveFormsModule],
  templateUrl: './cta.html',
  styleUrl: './cta.scss',
})
export class Cta {
  readonly contact = CONTACT;
  readonly sectors = SECTORS;
  readonly budgets = BUDGETS;

  private diagnostics = inject(DiagnosticService);

  readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    company: ['', Validators.maxLength(120)],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d\s()-]{7,20}$/)]],
    email: ['', [Validators.email, Validators.maxLength(160)]],
    sector: ['' as Sector | '', Validators.required],
    budget: ['UNKNOWN' as Budget, Validators.required],
    need: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(1500)]],
    dataConsent: [false, Validators.requiredTrue],
    website: [''], // trampa para bots: las personas no ven este campo
  });

  status = signal<Status>('idle');
  submitted = signal(false);

  /** Muestra el error de un campo solo después de tocarlo o de intentar enviar. */
  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  submit(formEl: HTMLFormElement): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      formEl.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')?.focus();
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
      budget: v.budget,
      need: v.need.trim(),
      dataConsent: true,
    }).subscribe({
      next: () => this.status.set('sent'),
      error: () => this.status.set('error'),
    });
  }

  reset(): void {
    this.form.reset();
    this.submitted.set(false);
    this.status.set('idle');
  }

  /** Respaldo mientras la API no responda: la misma solicitud, por WhatsApp. */
  whatsappUrl(): string {
    const v = this.form.getRawValue();
    const sector = SECTORS.find((s) => s.value === v.sector)?.label ?? '';
    const budget = BUDGETS.find((b) => b.value === v.budget)?.label ?? '';
    const text = [
      'Hola DABLIU, quiero solicitar el diagnóstico tecnológico gratuito.',
      `Nombre: ${v.fullName}`,
      v.company && `Empresa: ${v.company}`,
      `Sector: ${sector}`,
      `Presupuesto aproximado: ${budget}`,
      `Necesidad: ${v.need}`,
    ].filter(Boolean).join('\n');
    return `${this.contact.whatsappUrl}?text=${encodeURIComponent(text)}`;
  }
}
