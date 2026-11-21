import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, X } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { toProblem } from '../../core/api-error';
import { SECTOR } from '../../core/labels';
import type { Sector } from '../../core/models';
import { CrmApi } from './crm.api';
import { SERVICES, SOURCE, TEMPERATURE } from './crm.labels';
import type { CompanyView, LeadDetail, LeadSource, Person, Temperature } from './crm.models';

/** Diálogo para crear o editar un prospecto. Se abre con open() / open(lead). */
@Component({
  selector: 'app-lead-form',
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <dialog #dialog class="m-auto w-[min(680px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-2)] backdrop:bg-[var(--overlay)]" aria-labelledby="lead-form-title">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="flex max-h-[90vh] flex-col">
        <header class="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <h2 id="lead-form-title" class="text-[17px] font-bold">{{ editing() ? 'Editar prospecto' : 'Nuevo prospecto' }}</h2>
            <p class="mt-1 text-[13px] text-fg-3">Una oportunidad comercial: quién, qué necesita y cuánto podría valer.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="close()" aria-label="Cerrar"><lucide-icon [img]="x" [size]="18" /></button>
        </header>

        <div class="grid flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="label" for="l-title">Oportunidad</label>
            <input id="l-title" class="input" formControlName="title" placeholder="Ej.: Sistema de inventario para la tienda" [attr.aria-invalid]="bad('title')">
            @if (bad('title')) { <p class="field-error">Escribe un título.</p> }
          </div>

          <div>
            <label class="label" for="l-contact">Persona de contacto</label>
            <input id="l-contact" class="input" formControlName="contactName" autocomplete="off" [attr.aria-invalid]="bad('contactName')">
            @if (bad('contactName')) { <p class="field-error">Escribe el nombre.</p> }
          </div>
          <div>
            <label class="label" for="l-company">Empresa</label>
            <input id="l-company" class="input" formControlName="companyName" list="l-companies" autocomplete="off" placeholder="Nombre o elige una registrada">
            <datalist id="l-companies">@for (c of companies(); track c.id) { <option [value]="c.name"></option> }</datalist>
            @if (linkedCompany()) { <p class="hint">Vinculada a la empresa registrada «{{ linkedCompany()!.name }}».</p> }
          </div>
          <div>
            <label class="label" for="l-email">Correo</label>
            <input id="l-email" class="input" type="email" formControlName="contactEmail" [attr.aria-invalid]="bad('contactEmail')">
            @if (bad('contactEmail')) { <p class="field-error">Escribe un correo válido.</p> }
          </div>
          <div>
            <label class="label" for="l-phone">Teléfono / WhatsApp</label>
            <input id="l-phone" class="input" type="tel" formControlName="contactPhone" [attr.aria-invalid]="bad('contactPhone')">
            @if (bad('contactPhone')) { <p class="field-error">Escribe un teléfono válido.</p> }
          </div>

          <div class="sm:col-span-2">
            <label class="label" for="l-need">Necesidad</label>
            <textarea id="l-need" class="input" formControlName="need" rows="3" maxlength="2000" placeholder="Qué quiere resolver y por qué ahora"></textarea>
          </div>

          <div>
            <label class="label" for="l-budget">Presupuesto estimado (COP)</label>
            <input id="l-budget" class="input" type="number" min="0" step="100000" formControlName="estimatedBudget" placeholder="Opcional" [attr.aria-invalid]="bad('estimatedBudget')">
            @if (bad('estimatedBudget')) { <p class="field-error">Escribe un valor positivo.</p> }
          </div>
          <div>
            <label class="label" for="l-sector">Sector</label>
            <select id="l-sector" class="input" formControlName="sector">
              <option value="">Sin definir</option>
              @for (s of sectorList; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }
            </select>
          </div>
          <div>
            <label class="label" for="l-source">Origen</label>
            <select id="l-source" class="input" formControlName="source">
              @for (s of sourceList; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }
            </select>
          </div>
          <div>
            <span class="label">Temperatura</span>
            <div class="flex gap-1.5" role="radiogroup" aria-label="Temperatura">
              @for (t of temperatureList; track t[0]) {
                <label class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2 text-[13px] font-semibold transition-colors has-checked:border-brand has-checked:bg-brand-soft">
                  <input type="radio" class="sr-only" formControlName="temperature" [value]="t[0]">
                  <span class="size-2 rounded-full" [style.background]="t[1].color"></span>{{ t[1].label }}
                </label>
              }
            </div>
          </div>

          <fieldset class="sm:col-span-2">
            <legend class="label">Servicios de interés</legend>
            <div class="flex flex-wrap gap-1.5">
              @for (s of services; track s.code) {
                <button type="button" class="btn btn-sm" [class.btn-secondary]="hasService(s.code)" [class.btn-ghost]="!hasService(s.code)"
                        [attr.aria-pressed]="hasService(s.code)" (click)="toggleService(s.code)">{{ s.label }}</button>
              }
            </div>
          </fieldset>

          @if (canAssign() && owners().length) {
            <div class="sm:col-span-2">
              <label class="label" for="l-owner">Responsable comercial</label>
              <select id="l-owner" class="input" formControlName="ownerId">
                <option value="">Sin asignar</option>
                @for (o of owners(); track o.id) { <option [value]="o.id">{{ o.fullName }}</option> }
              </select>
            </div>
          }

          @if (error()) { <p class="rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger sm:col-span-2" role="alert">{{ error() }}</p> }
        </div>

        <footer class="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
          <button type="button" class="btn btn-secondary" (click)="close()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : editing() ? 'Guardar cambios' : 'Crear prospecto' }}</button>
        </footer>
      </form>
    </dialog>
  `,
})
export class LeadForm {
  private api = inject(CrmApi);
  private auth = inject(AuthService);
  private fb = inject(NonNullableFormBuilder);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly saved = output<LeadDetail>();
  readonly x = X;
  readonly services = SERVICES;
  readonly sectorList = Object.entries(SECTOR) as [Sector, string][];
  readonly sourceList = (Object.entries(SOURCE) as [LeadSource, string][]).filter(([code]) => code !== 'WEB_FORM');
  readonly temperatureList = Object.entries(TEMPERATURE) as [Temperature, { label: string; color: string }][];

  readonly editing = signal<LeadDetail | null>(null);
  readonly owners = signal<Person[]>([]);
  readonly companies = signal<CompanyView[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canAssign = computed(() => this.auth.can('crm.assign'));
  private readonly companyName = signal('');
  readonly linkedCompany = computed(() => {
    const name = this.companyName().trim().toLowerCase();
    return name ? this.companies().find((c) => c.name.toLowerCase() === name) ?? null : null;
  });

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    contactName: ['', [Validators.required, Validators.maxLength(120)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(160)]],
    contactPhone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
    companyName: ['', Validators.maxLength(160)],
    sector: ['' as Sector | ''],
    need: ['', Validators.maxLength(2000)],
    estimatedBudget: [null as number | null, Validators.min(0)],
    services: [[] as string[]],
    source: ['DIRECT' as LeadSource],
    temperature: ['WARM' as Temperature],
    ownerId: [''],
  });

  constructor() {
    this.form.controls.companyName.valueChanges.subscribe((v) => this.companyName.set(v));
  }

  open(lead?: LeadDetail): void {
    this.error.set(null);
    this.editing.set(lead ?? null);
    this.form.reset({
      title: lead?.title ?? '', contactName: lead?.contactName ?? '', contactEmail: lead?.contactEmail ?? '',
      contactPhone: lead?.contactPhone ?? '', companyName: lead?.companyName ?? '', sector: lead?.sector ?? '',
      need: lead?.need ?? '', estimatedBudget: lead?.estimatedBudget ?? null, services: lead?.services ?? [],
      source: lead && lead.source !== 'WEB_FORM' ? lead.source : 'DIRECT', temperature: lead?.temperature ?? 'WARM',
      ownerId: lead ? lead.ownerId ?? '' : this.auth.user()?.id ?? '',
    });
    if (lead?.source === 'WEB_FORM') this.form.controls.source.disable(); else this.form.controls.source.enable();
    if (lead) this.form.controls.ownerId.disable(); else this.form.controls.ownerId.enable();
    this.api.companies({ size: 200 }).subscribe((p) => this.companies.set(p.content));
    if (this.canAssign()) this.api.owners().subscribe((o) => this.owners.set(o));
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  hasService(code: string): boolean {
    return this.form.controls.services.value.includes(code);
  }

  toggleService(code: string): void {
    const list = this.form.controls.services.value;
    this.form.controls.services.setValue(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const lead = this.editing();
    const company = this.linkedCompany();
    const body = {
      title: v.title.trim(), contactName: v.contactName.trim(), contactEmail: v.contactEmail.trim() || null,
      contactPhone: v.contactPhone.trim() || null, companyName: company ? null : v.companyName.trim() || null,
      companyId: company?.id ?? null, contactId: lead?.contactId ?? null, sector: v.sector || null, need: v.need.trim() || null,
      estimatedBudget: v.estimatedBudget === null || (v.estimatedBudget as unknown) === '' ? null : Number(v.estimatedBudget),
      services: v.services, source: lead?.source === 'WEB_FORM' ? 'WEB_FORM' as LeadSource : v.source, temperature: v.temperature,
      ownerId: lead ? lead.ownerId : v.ownerId || null,
    };
    this.saving.set(true);
    this.error.set(null);
    (lead ? this.api.update(lead.id, body) : this.api.create(body)).subscribe({
      next: (d) => { this.saving.set(false); this.close(); this.saved.emit(d); },
      error: (err) => {
        this.saving.set(false);
        const p = toProblem(err);
        this.error.set(p.errors ? Object.values(p.errors)[0]! : (p.detail ?? 'No se pudo guardar.'));
      },
    });
  }
}
