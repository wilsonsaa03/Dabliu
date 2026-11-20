import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, MailPlus, UserX, UserCheck, ShieldCheck, Lock } from 'lucide-angular';
import { UsersApi } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage } from '../../core/api-error';
import { ACCESS_EVENT, USER_STATUS, describeAgent } from '../../core/labels';
import type { AccessLogView, Page, RoleView, UserView } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { Avatar, EmptyState, Pagination, TableSkeleton } from '../../shared/ui';

@Component({
  selector: 'app-user-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule, Avatar, EmptyState, Pagination, TableSkeleton],
  templateUrl: './user-detail.html',
})
export class UserDetailPage {
  private api = inject(UsersApi);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  readonly icons = { ArrowLeft, MailPlus, UserX, UserCheck, ShieldCheck, Lock };
  readonly statusLabels = USER_STATUS;
  readonly events = ACCESS_EVENT;
  readonly describeAgent = describeAgent;

  readonly user = signal<UserView | null>(null);
  readonly roles = signal<RoleView[]>([]);
  readonly error = signal<string | null>(null);
  readonly access = signal<Page<AccessLogView> | null>(null);
  readonly accessPage = signal(0);
  readonly savingProfile = signal(false);
  readonly savingRoles = signal(false);
  readonly selectedRoles = signal<string[]>([]);

  readonly isSelf = computed(() => this.user()?.id === this.auth.user()?.id);
  readonly isSuperAdmin = computed(() => this.auth.user()?.roles.includes('SUPER_ADMIN') ?? false);
  readonly targetIsSuperAdmin = computed(() => this.user()?.roles.some((r) => r.code === 'SUPER_ADMIN') ?? false);
  /** Puede editar: tiene el permiso y el usuario no es superadministrador (salvo que él también lo sea). */
  readonly canEdit = computed(() => this.auth.can('users.manage') && (!this.targetIsSuperAdmin() || this.isSuperAdmin()));
  readonly canSeeAccess = computed(() => this.auth.can('audit.read'));
  readonly rolesChanged = computed(() => {
    const current = (this.user()?.roles ?? []).map((r) => r.code).sort().join();
    return current !== [...this.selectedRoles()].sort().join();
  });

  readonly profileForm = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
  });

  constructor() {
    if (this.auth.can('roles.read') || this.auth.can('users.manage')) this.api.roles().subscribe((r) => this.roles.set(r));
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  load(id = this.id()): void {
    this.error.set(null);
    this.api.get(id).subscribe({
      next: (u) => this.apply(u),
      error: (err) => this.error.set(problemMessage(err)),
    });
    if (this.canSeeAccess()) this.loadAccess(0);
  }

  loadAccess(page: number): void {
    this.accessPage.set(page);
    this.api.accessLog(this.id(), { page, size: 10, sort: 'createdAt,desc' }).subscribe({ next: (p) => this.access.set(p) });
  }

  private apply(u: UserView): void {
    this.user.set(u);
    this.selectedRoles.set(u.roles.map((r) => r.code));
    this.profileForm.reset({ fullName: u.fullName, phone: u.phone ?? '' });
    if (this.canEdit()) this.profileForm.enable(); else this.profileForm.disable();
  }

  readonly assignableRoles = computed(() => this.roles().filter((r) => r.code !== 'SUPER_ADMIN' || this.isSuperAdmin()));

  toggleRole(code: string, checked: boolean): void {
    let next = checked ? [...this.selectedRoles(), code] : this.selectedRoles().filter((c) => c !== code);
    if (checked && code === 'CLIENT') next = ['CLIENT'];
    else if (checked) next = next.filter((c) => c !== 'CLIENT');
    this.selectedRoles.set(next);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.savingProfile.set(true);
    const v = this.profileForm.getRawValue();
    this.api.update(this.id(), { fullName: v.fullName.trim(), phone: v.phone.trim() || null }).subscribe({
      next: (u) => { this.savingProfile.set(false); this.apply(u); this.toast.success('Datos actualizados.'); },
      error: (err) => { this.savingProfile.set(false); this.toast.error(problemMessage(err)); },
    });
  }

  saveRoles(): void {
    if (this.selectedRoles().length === 0) { this.toast.error('Asigna al menos un rol.'); return; }
    this.savingRoles.set(true);
    this.api.setRoles(this.id(), this.selectedRoles()).subscribe({
      next: (u) => {
        this.savingRoles.set(false);
        this.apply(u);
        this.toast.success('Roles actualizados. Aplican de inmediato.');
        if (this.isSelf()) this.auth.reload().subscribe();
      },
      error: (err) => { this.savingRoles.set(false); this.toast.error(problemMessage(err)); },
    });
  }

  async setStatus(active: boolean): Promise<void> {
    const u = this.user();
    if (!u) return;
    if (!active) {
      const ok = await this.confirm.ask({
        title: `Desactivar a ${u.fullName}`,
        message: 'Se cerrarán todas sus sesiones y no podrá entrar hasta que lo reactives. Sus registros se conservan.',
        confirmLabel: 'Desactivar', danger: true,
      });
      if (!ok) return;
    }
    this.api.setStatus(u.id, active ? 'ACTIVE' : 'INACTIVE').subscribe({
      next: (updated) => { this.apply(updated); this.toast.success(active ? 'Usuario reactivado.' : 'Usuario desactivado.'); },
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }

  resendInvitation(): void {
    this.api.resendInvitation(this.id()).subscribe({
      next: (u) => this.toast.success(`Invitación reenviada a ${u.email}.`),
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }
}
