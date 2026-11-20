import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, X, Phone, Mail, MessageCircle, Building2, Trash2, Inbox } from 'lucide-angular';
import { DiagnosticsApi } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage } from '../../core/api-error';
import { BUDGET, DIAGNOSTIC_STATUS, SECTOR } from '../../core/labels';
import type { DiagnosticRequest, DiagnosticStatus, Page } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';

/** Bandeja de solicitudes del diagnóstico gratuito (llegan desde la landing). */
@Component({
  selector: 'app-diagnostics',
  imports: [DatePipe, ReactiveFormsModule, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton],
  templateUrl: './diagnostics.html',
})
export class DiagnosticsPage {
  private api = inject(DiagnosticsApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly auth = inject(AuthService);

  /** Filtro por estado desde la URL (?estado=NEW), así se puede compartir el enlace. */
  readonly estado = input<string>();
  readonly pagina = input<string>();

  readonly icons = { X, Phone, Mail, MessageCircle, Building2, Trash2, Inbox };
  readonly statusLabels = DIAGNOSTIC_STATUS;
  readonly statuses = Object.keys(DIAGNOSTIC_STATUS) as DiagnosticStatus[];
  readonly sectors = SECTOR;
  readonly budgets = BUDGET;

  readonly data = signal<Page<DiagnosticRequest> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<DiagnosticRequest | null>(null);
  readonly saving = signal(false);
  readonly canManage = computed(() => this.auth.can('diagnostics.manage'));

  readonly status = computed<DiagnosticStatus | ''>(() => (this.statuses.includes(this.estado() as DiagnosticStatus) ? (this.estado() as DiagnosticStatus) : ''));
  readonly page = computed(() => Math.max(0, Number(this.pagina() ?? 0) || 0));

  readonly form = inject(NonNullableFormBuilder).group({
    status: ['NEW' as DiagnosticStatus, Validators.required],
    internalNotes: ['', Validators.maxLength(2000)],
  });

  constructor() {
    effect(() => {
      const status = this.status();
      const page = this.page();
      untracked(() => this.load(status, page));
    });
  }

  load(status = this.status(), page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ status, page, size: 20, sort: 'createdAt,desc' }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(problemMessage(err)); this.loading.set(false); },
    });
  }

  filter(status: DiagnosticStatus | ''): void {
    void this.router.navigate([], { queryParams: { estado: status || null, pagina: null }, queryParamsHandling: 'merge' });
  }

  goTo(page: number): void {
    void this.router.navigate([], { queryParams: { pagina: page || null }, queryParamsHandling: 'merge' });
  }

  open(item: DiagnosticRequest): void {
    this.selected.set(item);
    this.form.reset({ status: item.status, internalNotes: item.internalNotes ?? '' });
    if (!this.canManage()) this.form.disable(); else this.form.enable();
  }

  close(): void {
    this.selected.set(null);
  }

  save(): void {
    const item = this.selected();
    if (!item || this.form.invalid) return;
    this.saving.set(true);
    const { status, internalNotes } = this.form.getRawValue();
    this.api.update(item.id, status, internalNotes.trim() || null).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.selected.set(updated);
        this.form.markAsPristine();
        this.data.update((d) => d && { ...d, content: d.content.map((r) => (r.id === updated.id ? updated : r)) });
        this.toast.success('Solicitud actualizada.');
      },
      error: (err) => { this.saving.set(false); this.toast.error(problemMessage(err)); },
    });
  }

  async remove(): Promise<void> {
    const item = this.selected();
    if (!item) return;
    const ok = await this.confirm.ask({
      title: 'Eliminar solicitud',
      message: `Se borrarán de forma permanente los datos personales de ${item.fullName}. Úsalo cuando la persona pida la supresión de sus datos. No se puede deshacer.`,
      confirmLabel: 'Eliminar definitivamente',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(item.id).subscribe({
      next: () => { this.close(); this.toast.success('Solicitud eliminada.'); this.load(); },
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }

  /** Enlace de WhatsApp con el número normalizado (solo dígitos; agrega 57 si es un celular colombiano sin indicativo). */
  whatsapp(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) digits = '57' + digits;
    return `https://wa.me/${digits}`;
  }
}
