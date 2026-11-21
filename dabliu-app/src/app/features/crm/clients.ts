import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideAngularModule, Search, BadgeCheck } from 'lucide-angular';
import { SECTOR } from '../../core/labels';
import type { Page } from '../../core/models';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';
import { CrmApi } from './crm.api';
import type { ClientView } from './crm.models';

const STATUS: Record<ClientView['status'], { label: string; tone: string }> = {
  ACTIVO: { label: 'Activo', tone: 'badge-ok' }, POTENCIAL: { label: 'Potencial', tone: 'badge-info' },
  INACTIVO: { label: 'Inactivo', tone: '' }, SUSPENDIDO: { label: 'Suspendido', tone: 'badge-danger' },
};

/** Clientes (consulta). Nacen al convertir prospectos; el expediente completo llega en la fase 3. */
@Component({
  selector: 'app-clients',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton],
  template: `
    <app-page-header title="Clientes" description="Empresas y personas que ya contrataron a DABLIU." />
    <label class="relative mb-4 block">
      <span class="sr-only">Buscar clientes</span>
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3" aria-hidden="true"><lucide-icon [img]="icons.Search" [size]="16" /></span>
      <input class="input pl-10" type="search" [formControl]="q" placeholder="Buscar por nombre o correo">
    </label>
    <section class="card overflow-hidden">
      @if (!data()) { <app-table-skeleton /> }
      @else if (data()!.content.length === 0) {
        <app-empty-state [icon]="icons.BadgeCheck" title="Todavía no hay clientes" message="Cuando conviertas un prospecto ganado en cliente, aparecerá aquí." >
          <a routerLink="/crm" class="btn btn-secondary btn-sm">Ir a prospectos</a>
        </app-empty-state>
      } @else {
        <div class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Cliente</th><th class="hidden sm:table-cell">NIT</th><th class="hidden md:table-cell">Sector</th><th>Estado</th><th class="hidden lg:table-cell">Cliente desde</th></tr></thead>
            <tbody>
              @for (c of data()!.content; track c.id) {
                <tr>
                  <td>
                    @if (c.companyId) { <a [routerLink]="['/crm/empresas', c.companyId]" class="font-semibold text-fg no-underline hover:underline">{{ c.name }}</a> }
                    @else { <span class="font-semibold">{{ c.name }}</span> }
                    <p class="text-[12.5px] text-fg-3">{{ c.email || c.phone || '' }}</p>
                  </td>
                  <td class="hidden font-mono text-[12.5px] text-fg-2 sm:table-cell">{{ c.taxId || '—' }}</td>
                  <td class="hidden text-fg-2 md:table-cell">{{ c.sector ? sectors[c.sector] : '—' }}</td>
                  <td><span class="badge {{ status[c.status].tone }}">{{ status[c.status].label }}</span></td>
                  <td class="hidden whitespace-nowrap text-fg-2 lg:table-cell">{{ c.joinedAt | date: 'd MMM y' : 'UTC' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [page]="data()!.page.number" [size]="data()!.page.size" [total]="data()!.page.totalElements" (pageChange)="page.set($event); load()" />
      }
    </section>
    <p class="mt-3 text-[12px] text-fg-3">El expediente completo del cliente (proyectos, documentos, pagos) llega con el módulo de clientes y proyectos.</p>
  `,
})
export class ClientsPage {
  private api = inject(CrmApi);
  readonly icons = { Search, BadgeCheck };
  readonly sectors = SECTOR;
  readonly status = STATUS;
  readonly data = signal<Page<ClientView> | null>(null);
  readonly page = signal(0);
  readonly q = new FormControl('', { nonNullable: true });

  constructor() {
    this.load();
    this.q.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => { this.page.set(0); this.load(); });
  }

  load(): void {
    this.api.clients({ q: this.q.value.trim(), page: this.page(), size: 25 }).subscribe((d) => this.data.set(d));
  }
}
