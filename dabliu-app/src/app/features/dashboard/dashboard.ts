import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Inbox, BellDot, UsersRound, MailPlus, TrendingUp, TrendingDown, Minus, Activity, RefreshCw } from 'lucide-angular';
import { DashboardApi } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage } from '../../core/api-error';
import { DIAGNOSTIC_STATUS } from '../../core/labels';
import type { DashboardSummary, DiagnosticStatus } from '../../core/models';
import { EmptyState, PageHeader } from '../../shared/ui';
import { BarChart } from './bar-chart';
import { CopPipe } from '../crm/crm.labels';

type Range = 7 | 30 | 90;

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink, LucideAngularModule, PageHeader, EmptyState, BarChart, CopPipe],
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  private api = inject(DashboardApi);
  readonly auth = inject(AuthService);

  readonly icons = { Inbox, BellDot, UsersRound, MailPlus, TrendingUp, TrendingDown, Minus, Activity, RefreshCw };
  readonly ranges: Range[] = [7, 30, 90];
  readonly range = signal<Range>(30);
  readonly data = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusLabels = DIAGNOSTIC_STATUS;
  readonly Math = Math;
  readonly statuses = Object.keys(DIAGNOSTIC_STATUS) as DiagnosticStatus[];

  readonly greeting = computed(() => {
    const h = Number(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }).format(new Date()));
    const name = this.auth.user()?.fullName.split(' ')[0] ?? '';
    return `${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}, ${name}`;
  });

  /** Variación frente al periodo anterior de igual duración. */
  readonly trend = computed(() => {
    const d = this.data()?.diagnostics;
    if (!d) return null;
    const diff = d.receivedInPeriod - d.receivedPreviousPeriod;
    return { diff, pct: d.receivedPreviousPeriod === 0 ? null : Math.round((diff / d.receivedPreviousPeriod) * 100) };
  });

  readonly funnelMax = computed(() => Math.max(1, ...(this.data()?.crm?.funnel ?? []).map((f) => f.total)));

  readonly statusTotal = computed(() => {
    const s = this.data()?.diagnostics?.byStatus;
    return s ? Object.values(s).reduce((a, b) => a + b, 0) : 0;
  });

  constructor() {
    this.load();
  }

  setRange(r: Range): void {
    this.range.set(r);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const to = new Date();
    const from = new Date(to.getTime() - (this.range() - 1) * 86_400_000);
    this.api.summary(bogotaDate(from), bogotaDate(to)).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(problemMessage(err)); this.loading.set(false); },
    });
  }
}

/** Fecha AAAA-MM-DD según el calendario de Bogotá. */
function bogotaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);
}
