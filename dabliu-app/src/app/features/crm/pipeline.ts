import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideAngularModule, Plus, Search, LayoutGrid, List, CalendarClock, Building2, Inbox } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage } from '../../core/api-error';
import type { Page } from '../../core/models';
import { ToastService } from '../../shared/toast';
import { Avatar, EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';
import { CrmApi } from './crm.api';
import { CopPipe, SOURCE, STAGE, STAGES, TEMPERATURE } from './crm.labels';
import type { BoardColumn, LeadDetail, LeadStage, LeadSummary } from './crm.models';
import { LeadForm } from './lead-form';

/** Embudo comercial: tablero Kanban (arrastrar entre etapas) o lista. */
@Component({
  selector: 'app-pipeline',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPlaceholder, LucideAngularModule,
            PageHeader, EmptyState, Pagination, TableSkeleton, Avatar, CopPipe, LeadForm],
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.css',
})
export class PipelinePage {
  private api = inject(CrmApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  /** Estado en la URL para poder compartir el enlace: ?vista=lista&responsable=me&q=… */
  readonly vista = input<string>();
  readonly responsable = input<string>();
  readonly q = input<string>();
  readonly pagina = input<string>();

  readonly icons = { Plus, Search, LayoutGrid, List, CalendarClock, Building2, Inbox };
  readonly stage = STAGE;
  readonly stages = STAGES;
  readonly sources = SOURCE;
  readonly temps = TEMPERATURE;
  readonly canWrite = computed(() => this.auth.can('crm.write'));

  readonly view = computed(() => (this.vista() === 'lista' ? 'lista' : 'tablero'));
  readonly owner = computed(() => this.responsable() ?? '');
  readonly search = new FormControl('', { nonNullable: true });

  readonly board = signal<BoardColumn[] | null>(null);
  readonly list = signal<Page<LeadSummary> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly totalValue = computed(() => (this.board() ?? []).filter((c) => c.stage !== 'GANADO' && c.stage !== 'PERDIDO').reduce((a, c) => a + c.value, 0));

  // Diálogo "motivo de pérdida" al soltar en Perdido
  private lostDialog = viewChild<ElementRef<HTMLDialogElement>>('lostDialog');
  readonly lostReason = new FormControl('', { nonNullable: true });
  private pendingLost: { lead: LeadSummary; from: LeadStage } | null = null;

  private leadForm = viewChild.required(LeadForm);

  constructor() {
    effect(() => {
      const view = this.view();
      const owner = this.owner();
      const q = this.q() ?? '';
      const page = Number(this.pagina() ?? 0) || 0;
      untracked(() => {
        if (this.search.value !== q) this.search.setValue(q, { emitEvent: false });
        this.load(view, owner, q, page);
      });
    });
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.nav({ q: q.trim() || null, pagina: null }));
  }

  load(view = this.view(), owner = this.owner(), q = this.q() ?? '', page = Number(this.pagina() ?? 0) || 0): void {
    this.loading.set(true);
    this.error.set(null);
    const done = { error: (err: unknown) => { this.error.set(problemMessage(err)); this.loading.set(false); } };
    if (view === 'tablero') {
      this.api.board({ q, owner }).subscribe({ next: (b) => { this.board.set(b); this.loading.set(false); }, ...done });
    } else {
      this.api.leads({ q, owner, page, size: 25, sort: 'updatedAt,desc' }).subscribe({ next: (l) => { this.list.set(l); this.loading.set(false); }, ...done });
    }
  }

  nav(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  newLead(): void {
    this.leadForm().open();
  }

  created(d: LeadDetail): void {
    this.toast.success('Prospecto creado.');
    void this.router.navigate(['/crm/prospectos', d.id]);
  }

  /** Soltar una tarjeta en otra columna: se mueve al instante y, si la API falla, vuelve a su lugar. */
  drop(event: CdkDragDrop<LeadSummary[], LeadSummary[], LeadSummary>, target: LeadStage): void {
    if (event.previousContainer === event.container) return;
    const lead = event.item.data;
    const from = lead.stage;
    if (!this.canWrite() || lead.converted) {
      this.toast.info(lead.converted ? 'Este prospecto ya es cliente: su etapa queda en Ganado.' : 'Solo puedes consultar el embudo.');
      return;
    }
    if (target === 'PERDIDO') {
      this.pendingLost = { lead, from };
      this.lostReason.setValue('');
      this.lostDialog()?.nativeElement.showModal();
      return;
    }
    this.move(lead, from, target);
  }

  confirmLost(): void {
    const reason = this.lostReason.value.trim();
    if (!reason || !this.pendingLost) return;
    const { lead, from } = this.pendingLost;
    this.lostDialog()?.nativeElement.close();
    this.move(lead, from, 'PERDIDO', reason);
    this.pendingLost = null;
  }

  cancelLost(): void {
    this.pendingLost = null;
    this.lostDialog()?.nativeElement.close();
  }

  private move(lead: LeadSummary, from: LeadStage, to: LeadStage, lostReason?: string): void {
    const snapshot = this.board();
    this.board.update((cols) => cols && cols.map((c) => {
      if (c.stage === from) return { ...c, total: c.total - 1, value: c.value - (lead.estimatedBudget ?? 0), leads: c.leads.filter((l) => l.id !== lead.id) };
      if (c.stage === to) return { ...c, total: c.total + 1, value: c.value + (lead.estimatedBudget ?? 0), leads: [{ ...lead, stage: to }, ...c.leads] };
      return c;
    }));
    this.api.moveStage(lead.id, to, null, lostReason ?? null).subscribe({
      next: () => this.toast.success(`«${lead.title}» pasó a ${STAGE[to].label}.`),
      error: (err) => { this.board.set(snapshot); this.toast.error(problemMessage(err)); },
    });
  }

  open(lead: LeadSummary): void {
    void this.router.navigate(['/crm/prospectos', lead.id]);
  }
}
