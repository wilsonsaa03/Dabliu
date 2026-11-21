import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, ArrowLeft, Pencil, Archive, ArchiveRestore, BadgeCheck, Phone, Mail, MessageCircle, Building2,
  CalendarPlus, CalendarClock, Check, Globe, ArrowRightLeft, StickyNote, Users, Video, CircleDot,
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage, toProblem } from '../../core/api-error';
import { SECTOR } from '../../core/labels';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { Avatar, EmptyState } from '../../shared/ui';
import { CrmApi } from './crm.api';
import { ACTIVITY, CopPipe, INTERACTION, SERVICE_LABEL, SOURCE, STAGE, STAGES, TEMPERATURE } from './crm.labels';
import type { ActivityType, InteractionType, LeadDetail, LeadStage, Person } from './crm.models';
import { LeadForm } from './lead-form';

type TimelineItem =
  | { kind: 'interaction'; at: string; id: string; type: InteractionType; summary: string; who: string | null }
  | { kind: 'stage'; at: string; id: string; from: LeadStage | null; to: LeadStage; note: string | null; who: string };

@Component({
  selector: 'app-lead-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule, Avatar, EmptyState, CopPipe, LeadForm],
  templateUrl: './lead-detail.html',
})
export class LeadDetailPage {
  private api = inject(CrmApi);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(NonNullableFormBuilder);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  readonly icons = {
    ArrowLeft, Pencil, Archive, ArchiveRestore, BadgeCheck, Phone, Mail, MessageCircle, Building2, CalendarPlus, CalendarClock,
    Check, Globe, ArrowRightLeft, StickyNote, Users, Video, CircleDot,
  };
  readonly stage = STAGE;
  readonly stages = STAGES;
  readonly temps = TEMPERATURE;
  readonly sources = SOURCE;
  readonly sectors = SECTOR;
  readonly serviceLabel = SERVICE_LABEL;
  readonly interactionLabel = INTERACTION;
  readonly interactionTypes = Object.entries(INTERACTION) as [InteractionType, string][];
  readonly activityLabel = ACTIVITY;
  readonly activityTypes = Object.entries(ACTIVITY) as [ActivityType, string][];

  readonly lead = signal<LeadDetail | null>(null);
  readonly error = signal<string | null>(null);
  readonly owners = signal<Person[]>([]);
  readonly busy = signal(false);

  readonly canWrite = computed(() => this.auth.can('crm.write') && !this.lead()?.archived);
  readonly canAssign = computed(() => this.auth.can('crm.assign'));
  readonly canConvert = computed(() => {
    const l = this.lead();
    return this.auth.can('crm.convert') && !!l && !l.clientId && !l.archived && l.stage !== 'PERDIDO';
  });

  /** Interacciones y cambios de etapa en una sola línea de tiempo, lo más reciente primero. */
  readonly timeline = computed<TimelineItem[]>(() => {
    const l = this.lead();
    if (!l) return [];
    const items: TimelineItem[] = [
      ...l.interactions.map((i) => ({ kind: 'interaction' as const, at: i.occurredAt, id: i.id, type: i.type, summary: i.summary, who: i.authorName })),
      ...l.stageHistory.map((s) => ({ kind: 'stage' as const, at: s.changedAt, id: s.id, from: s.fromStage, to: s.toStage, note: s.note, who: s.changedByName })),
    ];
    // Orden estable: la API ya entrega cada lista en orden; se mezcla por fecha.
    return items.sort((a, b) => b.at.localeCompare(a.at));
  });
  readonly pendingActivities = computed(() => (this.lead()?.activities ?? []).filter((a) => !a.completedAt));
  readonly doneActivities = computed(() => (this.lead()?.activities ?? []).filter((a) => a.completedAt).reverse());

  readonly noteForm = this.fb.group({ type: ['CALL' as InteractionType], summary: ['', [Validators.required, Validators.maxLength(2000)]] });
  readonly activityForm = this.fb.group({
    type: ['FOLLOW_UP' as ActivityType], title: ['', [Validators.required, Validators.maxLength(160)]],
    dueAt: ['', Validators.required], assigneeId: [''],
  });
  readonly convertForm = this.fb.group({ clientName: ['', Validators.maxLength(160)], taxId: ['', Validators.pattern(/^[0-9.\-]*$/)], joinedAt: [''] });
  readonly lostReason = new FormControl('', { nonNullable: true });

  private form = viewChild.required(LeadForm);
  private convertDialog = viewChild<ElementRef<HTMLDialogElement>>('convertDialog');
  private lostDialog = viewChild<ElementRef<HTMLDialogElement>>('lostDialog');

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
    if (this.canAssign()) this.api.owners().subscribe((o) => this.owners.set(o));
  }

  load(id = this.id()): void {
    this.api.lead(id).subscribe({
      next: (l) => this.apply(l),
      error: (err) => this.error.set(problemMessage(err)),
    });
  }

  private apply(l: LeadDetail): void {
    this.lead.set(l);
    this.activityForm.reset({ type: 'FOLLOW_UP', title: '', dueAt: defaultDue(), assigneeId: this.auth.user()?.id ?? '' });
  }

  edit(): void {
    this.form().open(this.lead()!);
  }

  saved(l: LeadDetail): void {
    this.apply(l);
    this.toast.success('Prospecto actualizado.');
  }

  changeStage(target: LeadStage): void {
    const l = this.lead();
    if (!l || l.stage === target) return;
    if (target === 'PERDIDO') {
      this.lostReason.setValue('');
      this.lostDialog()?.nativeElement.showModal();
      return;
    }
    this.run(this.api.moveStage(l.id, target), `Etapa: ${STAGE[target].label}.`);
  }

  confirmLost(): void {
    const reason = this.lostReason.value.trim();
    if (!reason) return;
    this.lostDialog()?.nativeElement.close();
    this.run(this.api.moveStage(this.lead()!.id, 'PERDIDO', null, reason), 'Marcado como perdido.');
  }

  cancelLost(): void {
    this.lostDialog()?.nativeElement.close();
  }

  assign(ownerId: string): void {
    this.run(this.api.assign(this.lead()!.id, ownerId || null), 'Responsable actualizado.');
  }

  takeOwnership(): void {
    this.run(this.api.assign(this.lead()!.id, this.auth.user()!.id), 'Ahora eres el responsable.');
  }

  addNote(): void {
    if (this.noteForm.invalid) { this.noteForm.markAllAsTouched(); return; }
    const v = this.noteForm.getRawValue();
    this.run(this.api.addInteraction(this.lead()!.id, { type: v.type, summary: v.summary.trim() }), 'Interacción registrada.',
      () => this.noteForm.reset({ type: v.type, summary: '' }));
  }

  addActivity(): void {
    if (this.activityForm.invalid) { this.activityForm.markAllAsTouched(); return; }
    const v = this.activityForm.getRawValue();
    this.run(this.api.addActivity(this.lead()!.id, {
      type: v.type, title: v.title.trim(), dueAt: new Date(v.dueAt).toISOString(), assigneeId: v.assigneeId || null,
    }), 'Actividad programada.');
  }

  toggleActivity(id: string, done: boolean): void {
    this.api.setActivityDone(id, done).subscribe({
      next: () => { this.toast.success(done ? 'Actividad completada.' : 'Actividad reabierta.'); this.load(); },
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }

  async archive(archived: boolean): Promise<void> {
    if (archived) {
      const ok = await this.confirm.ask({
        title: 'Archivar prospecto',
        message: 'Sale del embudo y queda de solo lectura. Su historial se conserva y se puede restaurar.',
        confirmLabel: 'Archivar',
      });
      if (!ok) return;
    }
    this.run(this.api.archive(this.lead()!.id, archived), archived ? 'Prospecto archivado.' : 'Prospecto restaurado.');
  }

  openConvert(): void {
    const l = this.lead()!;
    this.convertForm.reset({ clientName: l.companyName ?? l.contactName, taxId: '', joinedAt: todayBogota() });
    this.convertDialog()?.nativeElement.showModal();
  }

  convert(): void {
    if (this.convertForm.invalid) { this.convertForm.markAllAsTouched(); return; }
    const v = this.convertForm.getRawValue();
    this.busy.set(true);
    this.api.convert(this.lead()!.id, { clientName: v.clientName.trim() || null, taxId: v.taxId.trim() || null, joinedAt: v.joinedAt || null }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.convertDialog()?.nativeElement.close();
        this.toast.success(r.clientCreated ? `Nuevo cliente: ${r.clientName}.` : `Vinculado al cliente existente ${r.clientName}.`);
        this.load();
      },
      error: (err) => { this.busy.set(false); this.toast.error(toProblem(err).detail ?? 'No se pudo convertir.'); },
    });
  }

  closeConvert(): void {
    this.convertDialog()?.nativeElement.close();
  }

  whatsapp(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) digits = '57' + digits;
    return `https://wa.me/${digits}`;
  }

  private run(call: ReturnType<CrmApi['lead']>, message: string, after?: () => void): void {
    this.busy.set(true);
    call.subscribe({
      next: (l) => { this.busy.set(false); this.apply(l); this.toast.success(message); after?.(); },
      error: (err) => { this.busy.set(false); this.toast.error(problemMessage(err)); },
    });
  }
}

/** Mañana a las 9:00 (hora local), en formato de <input type="datetime-local">. */
function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function todayBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}
