import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, Search, UserPlus, X, Lock, UsersRound } from 'lucide-angular';
import { UsersApi } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage, toProblem } from '../../core/api-error';
import { USER_STATUS } from '../../core/labels';
import type { Page, RoleView, UserStatus, UserView } from '../../core/models';
import { ToastService } from '../../shared/toast';
import { Avatar, EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';

@Component({
  selector: 'app-users',
  imports: [DatePipe, ReactiveFormsModule, LucideAngularModule, PageHeader, EmptyState, Pagination, TableSkeleton, Avatar],
  templateUrl: './users.html',
})
export class UsersPage {
  private api = inject(UsersApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly q = input<string>();
  readonly estado = input<string>();
  readonly rol = input<string>();
  readonly pagina = input<string>();

  readonly icons = { Search, UserPlus, X, Lock, UsersRound };
  readonly statusLabels = USER_STATUS;
  readonly statuses = Object.keys(USER_STATUS) as UserStatus[];
  readonly data = signal<Page<UserView> | null>(null);
  readonly roles = signal<RoleView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly canManage = computed(() => this.auth.can('users.manage'));
  readonly isSuperAdmin = computed(() => this.auth.user()?.roles.includes('SUPER_ADMIN') ?? false);

  readonly search = new FormControl('', { nonNullable: true });
  readonly filters = computed(() => ({
    q: this.q() ?? '',
    status: (this.statuses.includes(this.estado() as UserStatus) ? this.estado() : '') as UserStatus | '',
    role: this.rol() ?? '',
    page: Math.max(0, Number(this.pagina() ?? 0) || 0),
  }));

  // Invitación
  private dialog = viewChild<ElementRef<HTMLDialogElement>>('inviteDialog');
  readonly inviting = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteForm = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
    roles: [[] as string[], Validators.required],
  });

  constructor() {
    if (this.auth.can('roles.read') || this.canManage()) {
      this.api.roles().subscribe({ next: (r) => this.roles.set(r) });
    }
    effect(() => {
      const f = this.filters();
      untracked(() => {
        if (this.search.value !== f.q) this.search.setValue(f.q, { emitEvent: false });
        this.load();
      });
    });
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.navigate({ q: q.trim() || null, pagina: null }));
  }

  load(): void {
    const f = this.filters();
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ q: f.q, status: f.status, role: f.role, page: f.page, size: 20, sort: 'createdAt,desc' }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(problemMessage(err)); this.loading.set(false); },
    });
  }

  navigate(params: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  openUser(u: UserView): void {
    void this.router.navigate(['/usuarios', u.id]);
  }

  /** Roles que este usuario puede asignar (SUPER_ADMIN solo lo asigna otro SUPER_ADMIN). */
  readonly assignableRoles = computed(() => this.roles().filter((r) => r.code !== 'SUPER_ADMIN' || this.isSuperAdmin()));

  openInvite(): void {
    this.inviteForm.reset({ email: '', fullName: '', phone: '', roles: [] });
    this.inviteError.set(null);
    this.dialog()?.nativeElement.showModal();
  }

  closeInvite(): void {
    this.dialog()?.nativeElement.close();
  }

  toggleRole(code: string, checked: boolean): void {
    const current = this.inviteForm.controls.roles.value;
    let next = checked ? [...current, code] : current.filter((c) => c !== code);
    // Un cliente no comparte roles internos: elegir uno quita el otro tipo.
    if (checked && code === 'CLIENT') next = ['CLIENT'];
    else if (checked) next = next.filter((c) => c !== 'CLIENT');
    this.inviteForm.controls.roles.setValue(next);
    this.inviteForm.controls.roles.markAsTouched();
  }

  invite(): void {
    if (this.inviteForm.invalid) { this.inviteForm.markAllAsTouched(); return; }
    this.inviting.set(true);
    this.inviteError.set(null);
    const v = this.inviteForm.getRawValue();
    this.api.invite({ email: v.email.trim(), fullName: v.fullName.trim(), phone: v.phone.trim() || null, roles: v.roles }).subscribe({
      next: (u) => {
        this.inviting.set(false);
        this.closeInvite();
        this.toast.success(`Invitación enviada a ${u.email}.`);
        this.load();
      },
      error: (err) => {
        this.inviting.set(false);
        const p = toProblem(err);
        this.inviteError.set(p.errors ? Object.values(p.errors)[0]! : (p.detail ?? 'No se pudo enviar la invitación.'));
      },
    });
  }
}
