import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, CalendarCheck } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage } from '../../core/api-error';
import type { Page } from '../../core/models';
import { ToastService } from '../../shared/toast';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';
import { CrmApi } from './crm.api';
import { ACTIVITY } from './crm.labels';
import type { ActivityView } from './crm.models';

type Status = 'pending' | 'overdue' | 'done';

/** Seguimientos comerciales: lo que hay que hacer, lo vencido y lo hecho. */
@Component({
  selector: 'app-activities',
  imports: [DatePipe, RouterLink, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton],
  template: `
    <app-page-header title="Actividades" description="Llamadas, reuniones y seguimientos programados en los prospectos." />

    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div class="tabs flex-1" role="tablist">
        @for (t of tabs; track t.code) {
          <button type="button" role="tab" class="tab" [attr.aria-selected]="status() === t.code" (click)="nav({ estado: t.code === 'pending' ? null : t.code, pagina: null })">{{ t.label }}</button>
        }
      </div>
      <div class="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="De quién">
        <button type="button" class="btn btn-sm" [class.btn-secondary]="scope() === 'me'" [class.btn-ghost]="scope() !== 'me'" (click)="nav({ de: null })">Mías</button>
        <button type="button" class="btn btn-sm" [class.btn-secondary]="scope() === 'all'" [class.btn-ghost]="scope() !== 'all'" (click)="nav({ de: 'all' })">De todos</button>
      </div>
    </div>

    <section class="card overflow-hidden">
      @if (!data() && !error()) {
        <app-table-skeleton />
      } @else if (error()) {
        <app-empty-state title="No se pudieron cargar las actividades" [message]="error()!" />
      } @else if (data()!.content.length === 0) {
        <app-empty-state [icon]="icon" [title]="status() === 'overdue' ? 'Nada vencido. ¡Bien!' : status() === 'done' ? 'Aún no hay actividades completadas' : 'No hay actividades pendientes'"
                         message="Las actividades se programan desde cada prospecto." />
      } @else {
        <ul [class.opacity-60]="loading()">
          @for (a of data()!.content; track a.id) {
            <li class="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
              @if (canWrite()) {
                <button type="button" class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors"
                        [class.border-ok]="a.completedAt" [class.bg-ok-soft]="a.completedAt" [class.border-line-strong]="!a.completedAt"
                        (click)="toggle(a)" [attr.aria-label]="(a.completedAt ? 'Reabrir: ' : 'Completar: ') + a.title">
                  @if (a.completedAt) { <span class="size-2 rounded-sm bg-[var(--ok)]"></span> }
                </button>
              }
              <div class="min-w-0 flex-1">
                <p class="text-[13.5px] font-semibold" [class.line-through]="a.completedAt" [class.text-fg-3]="a.completedAt">{{ labels[a.type] }}: {{ a.title }}</p>
                <p class="mt-0.5 text-[12.5px] text-fg-3">
                  <a [routerLink]="['/crm/prospectos', a.leadId]" class="font-semibold text-accent no-underline hover:underline">{{ a.leadTitle }}</a>
                  · {{ a.assigneeName ?? 'Sin responsable' }}
                </p>
              </div>
              <time class="shrink-0 text-[12.5px]" [class.text-danger]="a.overdue" [class.font-semibold]="a.overdue" [class.text-fg-3]="!a.overdue" [attr.datetime]="a.dueAt">
                {{ a.completedAt ? 'Hecha ' + (a.completedAt | date: 'd MMM') : (a.dueAt | date) }}
              </time>
            </li>
          }
        </ul>
        <app-pagination [page]="data()!.page.number" [size]="data()!.page.size" [total]="data()!.page.totalElements" (pageChange)="nav({ pagina: $event ? '' + $event : null })" />
      }
    </section>
  `,
})
export class ActivitiesPage {
  private api = inject(CrmApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly estado = input<string>();
  readonly de = input<string>();
  readonly pagina = input<string>();

  readonly icon = CalendarCheck;
  readonly labels = ACTIVITY;
  readonly tabs: { code: Status; label: string }[] = [
    { code: 'pending', label: 'Pendientes' }, { code: 'overdue', label: 'Vencidas' }, { code: 'done', label: 'Completadas' },
  ];
  readonly status = computed<Status>(() => (['overdue', 'done'].includes(this.estado() ?? '') ? (this.estado() as Status) : 'pending'));
  readonly scope = computed(() => (this.de() === 'all' ? 'all' : 'me'));
  readonly canWrite = computed(() => this.auth.can('crm.write'));
  readonly data = signal<Page<ActivityView> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const status = this.status();
      const scope = this.scope();
      const page = Number(this.pagina() ?? 0) || 0;
      untracked(() => this.load(status, scope, page));
    });
  }

  load(status = this.status(), scope = this.scope(), page = Number(this.pagina() ?? 0) || 0): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.activities({ status, assignee: scope, page, size: 30 }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(problemMessage(err)); this.loading.set(false); },
    });
  }

  toggle(a: ActivityView): void {
    this.api.setActivityDone(a.id, !a.completedAt).subscribe({
      next: () => { this.toast.success(a.completedAt ? 'Actividad reabierta.' : 'Actividad completada.'); this.load(); },
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }

  nav(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}
