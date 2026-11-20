import { Component, effect, inject, input, signal, untracked, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ScrollText } from 'lucide-angular';
import { AuditApi } from '../../core/api';
import { problemMessage } from '../../core/api-error';
import { ACCESS_EVENT, describeAgent } from '../../core/labels';
import type { AccessLogView, ActivityView, Page } from '../../core/models';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';

type Tab = 'actividad' | 'accesos';

/** Bitácora de actividad e historial de acceso de todo el equipo. */
@Component({
  selector: 'app-audit',
  imports: [DatePipe, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton],
  template: `
    <app-page-header title="Auditoría" description="Quién hizo qué y cuándo. Los registros no se pueden editar ni borrar desde la aplicación." />

    <div class="tabs mb-4" role="tablist">
      <button type="button" role="tab" class="tab" [attr.aria-selected]="tab() === 'actividad'" (click)="go('actividad')">Actividad</button>
      <button type="button" role="tab" class="tab" [attr.aria-selected]="tab() === 'accesos'" (click)="go('accesos')">Accesos</button>
    </div>

    <section class="card overflow-hidden" role="tabpanel">
      @if (loading() && !hasData()) {
        <app-table-skeleton />
      } @else if (error()) {
        <app-empty-state title="No se pudo cargar la auditoría" [message]="error()!" />
      } @else if (tab() === 'actividad' && activity(); as a) {
        @if (a.content.length === 0) {
          <app-empty-state [icon]="icon" title="Sin actividad registrada" message="Las acciones del equipo (invitaciones, cambios de roles, actualizaciones) aparecerán aquí." />
        } @else {
          <ul [class.opacity-60]="loading()">
            @for (e of a.content; track e.id) {
              <li class="flex flex-col gap-1 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                <time class="shrink-0 text-[12px] text-fg-3 sm:w-40" [attr.datetime]="e.createdAt">{{ e.createdAt | date }}</time>
                <p class="flex-1 text-[13.5px]"><span class="font-semibold">{{ e.actorName }}</span> <span class="text-fg-3">·</span> <span class="text-fg-2">{{ e.summary }}</span></p>
                <code class="shrink-0 font-mono text-[11.5px] text-fg-3">{{ e.action }}</code>
              </li>
            }
          </ul>
          <app-pagination [page]="a.page.number" [size]="a.page.size" [total]="a.page.totalElements" (pageChange)="goPage($event)" />
        }
      } @else if (tab() === 'accesos' && access(); as a) {
        @if (a.content.length === 0) {
          <app-empty-state title="Sin accesos registrados" />
        } @else {
          <div class="overflow-x-auto" [class.opacity-60]="loading()">
            <table class="table">
              <thead><tr><th>Evento</th><th>Correo</th><th class="hidden md:table-cell">Dispositivo</th><th class="hidden lg:table-cell">IP</th><th>Fecha</th></tr></thead>
              <tbody>
                @for (e of a.content; track e.id) {
                  <tr>
                    <td><span class="badge {{ events[e.event]?.tone ?? '' }}">{{ events[e.event]?.label ?? e.event }}</span></td>
                    <td class="text-fg-2">{{ e.email ?? '—' }}</td>
                    <td class="hidden text-fg-2 md:table-cell">{{ describeAgent(e.userAgent) }}</td>
                    <td class="hidden font-mono text-[12px] text-fg-3 lg:table-cell">{{ e.ip ?? '—' }}</td>
                    <td class="whitespace-nowrap text-fg-2">{{ e.createdAt | date }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="a.page.number" [size]="a.page.size" [total]="a.page.totalElements" (pageChange)="goPage($event)" />
        }
      }
    </section>
  `,
})
export class AuditPage {
  private api = inject(AuditApi);
  private router = inject(Router);

  readonly vista = input<string>();
  readonly pagina = input<string>();
  readonly tab = computed<Tab>(() => (this.vista() === 'accesos' ? 'accesos' : 'actividad'));
  readonly page = computed(() => Math.max(0, Number(this.pagina() ?? 0) || 0));

  readonly icon = ScrollText;
  readonly events = ACCESS_EVENT;
  readonly describeAgent = describeAgent;
  readonly activity = signal<Page<ActivityView> | null>(null);
  readonly access = signal<Page<AccessLogView> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hasData = computed(() => (this.tab() === 'actividad' ? this.activity() : this.access()) !== null);

  constructor() {
    effect(() => {
      const tab = this.tab();
      const page = this.page();
      untracked(() => this.load(tab, page));
    });
  }

  private load(tab: Tab, page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const q = { page, size: 30, sort: 'createdAt,desc' };
    const done = { error: (err: unknown) => { this.error.set(problemMessage(err)); this.loading.set(false); } };
    if (tab === 'actividad') {
      this.api.activity(q).subscribe({ next: (p) => { this.activity.set(p); this.loading.set(false); }, ...done });
    } else {
      this.api.access(q).subscribe({ next: (p) => { this.access.set(p); this.loading.set(false); }, ...done });
    }
  }

  go(tab: Tab): void {
    void this.router.navigate([], { queryParams: { vista: tab === 'actividad' ? null : tab, pagina: null } });
  }

  goPage(page: number): void {
    void this.router.navigate([], { queryParams: { pagina: page || null }, queryParamsHandling: 'merge' });
  }
}
