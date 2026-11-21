import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideAngularModule, Plus, Search, Building2, ArrowLeft, Pencil, UserPlus, BadgeCheck, X } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage, toProblem } from '../../core/api-error';
import { SECTOR } from '../../core/labels';
import type { Page, Sector } from '../../core/models';
import { ToastService } from '../../shared/toast';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';
import { CrmApi } from './crm.api';
import { CopPipe, STAGE } from './crm.labels';
import type { CompanyDetail, CompanyView, ContactView } from './crm.models';

/** Formulario de empresa (crear y editar) como diálogo reutilizable. */
@Component({
  selector: 'app-company-form',
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <dialog #dialog class="m-auto w-[min(560px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-2)] backdrop:bg-[var(--overlay)]" aria-labelledby="co-title">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <header class="flex items-start justify-between border-b border-line px-6 py-5">
          <h2 id="co-title" class="text-[17px] font-bold">{{ editing() ? 'Editar empresa' : 'Nueva empresa' }}</h2>
          <button type="button" class="btn btn-ghost btn-icon" (click)="close()" aria-label="Cerrar"><lucide-icon [img]="x" [size]="18" /></button>
        </header>
        <div class="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="label" for="co-name">Nombre o razón social</label>
            <input id="co-name" class="input" formControlName="name" [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched">
            @if (form.controls.name.invalid && form.controls.name.touched) { <p class="field-error">Escribe el nombre.</p> }
          </div>
          <div>
            <label class="label" for="co-nit">NIT</label>
            <input id="co-nit" class="input" formControlName="taxId" placeholder="900.123.456-7" [attr.aria-invalid]="form.controls.taxId.invalid">
            @if (form.controls.taxId.invalid) { <p class="field-error">Solo números, puntos y guion.</p> }
          </div>
          <div>
            <label class="label" for="co-sector">Sector</label>
            <select id="co-sector" class="input" formControlName="sector">
              <option value="">Sin definir</option>
              @for (s of sectors; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }
            </select>
          </div>
          <div><label class="label" for="co-city">Ciudad</label><input id="co-city" class="input" formControlName="city"></div>
          <div>
            <label class="label" for="co-phone">Teléfono</label>
            <input id="co-phone" class="input" type="tel" formControlName="phone" [attr.aria-invalid]="form.controls.phone.invalid">
            @if (form.controls.phone.invalid) { <p class="field-error">Escribe un teléfono válido.</p> }
          </div>
          <div class="sm:col-span-2"><label class="label" for="co-web">Sitio web</label><input id="co-web" class="input" formControlName="website" placeholder="https://"></div>
          <div class="sm:col-span-2"><label class="label" for="co-notes">Notas internas</label><textarea id="co-notes" class="input" rows="3" formControlName="notes" maxlength="2000"></textarea></div>
          @if (error()) { <p class="rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger sm:col-span-2" role="alert">{{ error() }}</p> }
        </div>
        <footer class="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
          <button type="button" class="btn btn-secondary" (click)="close()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
        </footer>
      </form>
    </dialog>
  `,
})
export class CompanyForm {
  private api = inject(CrmApi);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly x = X;
  readonly sectors = Object.entries(SECTOR) as [Sector, string][];
  readonly editing = signal<CompanyView | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal<CompanyView | null>(null);
  onSaved: (c: CompanyView) => void = () => {};

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    taxId: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9.\-]*$/)]],
    sector: ['' as Sector | ''],
    city: ['', Validators.maxLength(80)],
    phone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
    website: ['', Validators.maxLength(200)],
    notes: ['', Validators.maxLength(2000)],
  });

  open(c: CompanyView | null, onSaved: (c: CompanyView) => void): void {
    this.onSaved = onSaved;
    this.editing.set(c);
    this.error.set(null);
    this.form.reset({ name: c?.name ?? '', taxId: c?.taxId ?? '', sector: c?.sector ?? '', city: c?.city ?? '', phone: c?.phone ?? '', website: c?.website ?? '', notes: c?.notes ?? '' });
    this.dialog().nativeElement.showModal();
  }

  close(): void { this.dialog().nativeElement.close(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), taxId: v.taxId.trim() || null, sector: (v.sector || null) as Sector | null, city: v.city.trim() || null,
      phone: v.phone.trim() || null, website: v.website.trim() || null, notes: v.notes.trim() || null };
    this.saving.set(true);
    const c = this.editing();
    (c ? this.api.updateCompany(c.id, body) : this.api.createCompany(body)).subscribe({
      next: (r) => { this.saving.set(false); this.close(); this.onSaved(r); },
      error: (err) => { this.saving.set(false); const p = toProblem(err); this.error.set(p.errors ? Object.values(p.errors)[0]! : (p.detail ?? 'No se pudo guardar.')); },
    });
  }
}

@Component({
  selector: 'app-companies',
  imports: [ReactiveFormsModule, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton, CompanyForm],
  template: `
    <app-page-header title="Empresas" description="Organizaciones con las que DABLIU tiene o tuvo relación comercial.">
      @if (auth.can('crm.write')) { <button type="button" class="btn btn-primary" (click)="create()"><lucide-icon [img]="icons.Plus" [size]="16" />Nueva empresa</button> }
    </app-page-header>
    <label class="relative mb-4 block">
      <span class="sr-only">Buscar empresas</span>
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3" aria-hidden="true"><lucide-icon [img]="icons.Search" [size]="16" /></span>
      <input class="input pl-10" type="search" [formControl]="search" placeholder="Buscar por nombre o NIT">
    </label>
    <section class="card overflow-hidden">
      @if (!data()) { <app-table-skeleton /> }
      @else if (data()!.content.length === 0) { <app-empty-state [icon]="icons.Building2" title="No hay empresas" message="Regístralas aquí o se crean solas al convertir un prospecto en cliente." /> }
      @else {
        <div class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Empresa</th><th class="hidden sm:table-cell">NIT</th><th class="hidden md:table-cell">Sector</th><th class="hidden lg:table-cell">Ciudad</th></tr></thead>
            <tbody>
              @for (c of data()!.content; track c.id) {
                <tr class="clickable" tabindex="0" (click)="open(c)" (keydown.enter)="open(c)">
                  <td class="font-semibold text-fg">{{ c.name }}</td>
                  <td class="hidden font-mono text-[12.5px] text-fg-2 sm:table-cell">{{ c.taxId || '—' }}</td>
                  <td class="hidden text-fg-2 md:table-cell">{{ c.sector ? sectors[c.sector] : '—' }}</td>
                  <td class="hidden text-fg-2 lg:table-cell">{{ c.city || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [page]="data()!.page.number" [size]="data()!.page.size" [total]="data()!.page.totalElements" (pageChange)="page.set($event); load()" />
      }
    </section>
    <app-company-form />
  `,
})
export class CompaniesPage {
  private api = inject(CrmApi);
  private router = inject(Router);
  readonly auth = inject(AuthService);
  readonly icons = { Plus, Search, Building2 };
  readonly sectors = SECTOR;
  readonly data = signal<Page<CompanyView> | null>(null);
  readonly page = signal(0);
  readonly search = new FormControl('', { nonNullable: true });
  private formRef = viewChild.required(CompanyForm);

  constructor() {
    this.load();
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => { this.page.set(0); this.load(); });
  }

  load(): void {
    this.api.companies({ q: this.search.value.trim(), page: this.page(), size: 25 }).subscribe((d) => this.data.set(d));
  }

  create(): void {
    this.formRef().open(null, (c) => void this.router.navigate(['/crm/empresas', c.id]));
  }

  open(c: CompanyView): void {
    void this.router.navigate(['/crm/empresas', c.id]);
  }
}

@Component({
  selector: 'app-company-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule, EmptyState, CompanyForm, CopPipe],
  template: `
    <a routerLink="/crm/empresas" class="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-fg-3 no-underline hover:text-fg"><lucide-icon [img]="icons.ArrowLeft" [size]="15" />Empresas</a>
    @if (error()) {
      <div class="card"><app-empty-state title="No se pudo cargar la empresa" [message]="error()!" /></div>
    } @else if (detail(); as d) {
      <header class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[22px] font-bold">{{ d.company.name }}</h1>
          <p class="mt-1 text-[13px] text-fg-3">{{ d.company.taxId ? 'NIT ' + d.company.taxId + ' · ' : '' }}{{ d.company.sector ? sectors[d.company.sector] : 'Sector sin definir' }}{{ d.company.city ? ' · ' + d.company.city : '' }}</p>
          @if (d.clientId) { <span class="badge badge-ok mt-2"><lucide-icon [img]="icons.BadgeCheck" [size]="11" />Cliente</span> }
        </div>
        @if (auth.can('crm.write')) { <button type="button" class="btn btn-secondary" (click)="edit(d.company)"><lucide-icon [img]="icons.Pencil" [size]="15" />Editar</button> }
      </header>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="card" aria-labelledby="t-cont">
          <div class="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="t-cont" class="text-[15px] font-bold">Contactos</h2>
          </div>
          @if (d.contacts.length === 0) { <p class="px-5 py-4 text-[13px] text-fg-3">Sin contactos registrados.</p> }
          <ul>
            @for (c of d.contacts; track c.id) {
              <li class="border-b border-line px-5 py-3 last:border-b-0">
                <p class="text-[13.5px] font-semibold">{{ c.fullName }} @if (c.position) { <span class="font-normal text-fg-3">· {{ c.position }}</span> }</p>
                <p class="text-[12.5px] text-fg-3">{{ c.email || 'sin correo' }} · {{ c.phone || 'sin teléfono' }}</p>
              </li>
            }
          </ul>
          @if (auth.can('crm.write')) {
            <form [formGroup]="contactForm" (ngSubmit)="addContact(d.company.id)" class="grid gap-2 border-t border-line px-5 py-4 sm:grid-cols-2">
              <input class="input sm:col-span-2" formControlName="fullName" placeholder="Nombre del contacto" aria-label="Nombre del contacto">
              <input class="input" formControlName="position" placeholder="Cargo" aria-label="Cargo">
              <input class="input" type="tel" formControlName="phone" placeholder="Teléfono" aria-label="Teléfono">
              <input class="input" type="email" formControlName="email" placeholder="Correo" aria-label="Correo">
              <button type="submit" class="btn btn-secondary" [disabled]="contactForm.invalid"><lucide-icon [img]="icons.UserPlus" [size]="15" />Agregar contacto</button>
            </form>
          }
        </section>

        <section class="card" aria-labelledby="t-opp">
          <h2 id="t-opp" class="border-b border-line px-5 py-4 text-[15px] font-bold">Oportunidades</h2>
          @if (d.leads.length === 0) { <p class="px-5 py-4 text-[13px] text-fg-3">Sin oportunidades vinculadas.</p> }
          <ul>
            @for (l of d.leads; track l.id) {
              <li class="border-b border-line last:border-b-0">
                <a [routerLink]="['/crm/prospectos', l.id]" class="flex items-center gap-3 px-5 py-3 no-underline hover:bg-[var(--surface-hover)]">
                  <span class="flex-1">
                    <span class="block text-[13.5px] font-semibold text-fg">{{ l.title }}</span>
                    <span class="block text-[12.5px] text-fg-3">{{ l.estimatedBudget | cop }} · {{ l.createdAt | date: 'd MMM y' }}</span>
                  </span>
                  <span class="badge {{ stage[l.stage].tone }}">{{ stage[l.stage].label }}</span>
                </a>
              </li>
            }
          </ul>
        </section>
      </div>
      @if (d.company.notes) { <section class="card card-pad mt-4"><h2 class="mb-2 text-[15px] font-bold">Notas internas</h2><p class="whitespace-pre-line text-[13.5px] text-fg-2">{{ d.company.notes }}</p></section> }
    } @else {
      <div class="card card-pad"><div class="skeleton h-8 w-64"></div><div class="skeleton mt-6 h-40 w-full"></div></div>
    }
    <app-company-form />
  `,
})
export class CompanyDetailPage {
  private api = inject(CrmApi);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly id = input.required<string>();
  readonly icons = { ArrowLeft, Pencil, UserPlus, BadgeCheck };
  readonly sectors = SECTOR;
  readonly stage = STAGE;
  readonly detail = signal<CompanyDetail | null>(null);
  readonly error = signal<string | null>(null);
  private formRef = viewChild.required(CompanyForm);

  readonly contactForm = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    position: ['', Validators.maxLength(80)],
    phone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
    email: ['', Validators.email],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  load(id = this.id()): void {
    this.api.company(id).subscribe({ next: (d) => this.detail.set(d), error: (err) => this.error.set(problemMessage(err)) });
  }

  edit(c: CompanyView): void {
    this.formRef().open(c, () => { this.toast.success('Empresa actualizada.'); this.load(); });
  }

  addContact(companyId: string): void {
    const v = this.contactForm.getRawValue();
    this.api.createContact({ companyId, fullName: v.fullName.trim(), position: v.position.trim() || null, phone: v.phone.trim() || null, email: v.email.trim() || null })
      .subscribe({
        next: () => { this.contactForm.reset(); this.toast.success('Contacto agregado.'); this.load(); },
        error: (err) => this.toast.error(problemMessage(err)),
      });
  }
}

@Component({
  selector: 'app-contacts',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton],
  template: `
    <app-page-header title="Contactos" description="Personas de las empresas con las que trabaja DABLIU." />
    <label class="relative mb-4 block">
      <span class="sr-only">Buscar contactos</span>
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3" aria-hidden="true"><lucide-icon [img]="search" [size]="16" /></span>
      <input class="input pl-10" type="search" [formControl]="q" placeholder="Buscar por nombre o correo">
    </label>
    <section class="card overflow-hidden">
      @if (!data()) { <app-table-skeleton /> }
      @else if (data()!.content.length === 0) { <app-empty-state title="No hay contactos" message="Se agregan desde la ficha de cada empresa o al convertir un prospecto." /> }
      @else {
        <div class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Contacto</th><th>Empresa</th><th class="hidden md:table-cell">Correo</th><th class="hidden lg:table-cell">Teléfono</th></tr></thead>
            <tbody>
              @for (c of data()!.content; track c.id) {
                <tr>
                  <td><p class="font-semibold text-fg">{{ c.fullName }}</p>@if (c.position) { <p class="text-[12.5px] text-fg-3">{{ c.position }}</p> }</td>
                  <td>@if (c.companyId) { <a [routerLink]="['/crm/empresas', c.companyId]" class="text-accent no-underline hover:underline">{{ c.companyName }}</a> } @else { <span class="text-fg-3">—</span> }</td>
                  <td class="hidden text-fg-2 md:table-cell">@if (c.email) { <a [href]="'mailto:' + c.email" class="text-fg-2">{{ c.email }}</a> } @else { — }</td>
                  <td class="hidden text-fg-2 lg:table-cell">{{ c.phone || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [page]="data()!.page.number" [size]="data()!.page.size" [total]="data()!.page.totalElements" (pageChange)="page.set($event); load()" />
      }
    </section>
  `,
})
export class ContactsPage {
  private api = inject(CrmApi);
  readonly search = Search;
  readonly data = signal<Page<ContactView> | null>(null);
  readonly page = signal(0);
  readonly q = new FormControl('', { nonNullable: true });

  constructor() {
    this.load();
    this.q.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => { this.page.set(0); this.load(); });
  }

  load(): void {
    this.api.contacts({ q: this.q.value.trim(), page: this.page(), size: 25 }).subscribe((d) => this.data.set(d));
  }
}
