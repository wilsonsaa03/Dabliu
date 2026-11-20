import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Monitor, LogOut } from 'lucide-angular';
import { ProfileApi } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { problemMessage, toProblem } from '../../core/api-error';
import { ACCESS_EVENT, describeAgent } from '../../core/labels';
import type { AccessLogView, Page, SessionInfo, UserView } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { PasswordRules, matching, strongPassword } from '../../shared/password-rules';
import { ToastService } from '../../shared/toast';
import { Avatar, EmptyState, PageHeader, Pagination, TableSkeleton } from '../../shared/ui';

/** Perfil propio: datos, contraseña, sesiones abiertas e historial de acceso. */
@Component({
  selector: 'app-profile',
  imports: [DatePipe, ReactiveFormsModule, LucideAngularModule, PageHeader, PasswordRules, Avatar, EmptyState, Pagination, TableSkeleton],
  templateUrl: './profile.html',
})
export class ProfilePage {
  private api = inject(ProfileApi);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(NonNullableFormBuilder);

  readonly icons = { Monitor, LogOut };
  readonly events = ACCESS_EVENT;
  readonly describeAgent = describeAgent;

  readonly me = signal<UserView | null>(null);
  readonly sessions = signal<SessionInfo[] | null>(null);
  readonly access = signal<Page<AccessLogView> | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', Validators.pattern(/^[+0-9 ()-]{7,30}$/)],
  });

  readonly passwordForm = this.fb.group(
    { currentPassword: ['', Validators.required], newPassword: ['', [Validators.required, strongPassword]], confirm: ['', Validators.required] },
    { validators: matching('newPassword', 'confirm') },
  );
  readonly newPassword = toSignal(this.passwordForm.controls.newPassword.valueChanges, { initialValue: '' });

  constructor() {
    this.api.me().subscribe((u) => {
      this.me.set(u);
      this.profileForm.reset({ fullName: u.fullName, phone: u.phone ?? '' });
    });
    this.loadSessions();
    this.loadAccess(0);
  }

  loadSessions(): void {
    this.api.sessions().subscribe({ next: (s) => this.sessions.set(s), error: () => this.sessions.set([]) });
  }

  loadAccess(page: number): void {
    this.api.accessLog({ page, size: 8, sort: 'createdAt,desc' }).subscribe((p) => this.access.set(p));
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.savingProfile.set(true);
    const v = this.profileForm.getRawValue();
    this.api.update({ fullName: v.fullName.trim(), phone: v.phone.trim() || null }).subscribe({
      next: (u) => {
        this.savingProfile.set(false);
        this.me.set(u);
        this.profileForm.reset({ fullName: u.fullName, phone: u.phone ?? '' });
        this.auth.reload().subscribe();
        this.toast.success('Perfil actualizado.');
      },
      error: (err) => { this.savingProfile.set(false); this.toast.error(problemMessage(err)); },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.savingPassword.set(true);
    this.passwordError.set(null);
    const v = this.passwordForm.getRawValue();
    this.api.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Contraseña actualizada. Se cerraron tus otras sesiones.');
        this.loadSessions();
        this.loadAccess(0);
      },
      error: (err) => {
        this.savingPassword.set(false);
        const p = toProblem(err);
        this.passwordError.set(p.detail ?? 'No se pudo cambiar la contraseña.');
      },
    });
  }

  async revoke(s: SessionInfo): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cerrar sesión en ese dispositivo',
      message: `${describeAgent(s.userAgent)} tendrá que volver a iniciar sesión.`,
      confirmLabel: 'Cerrar sesión',
    });
    if (!ok) return;
    this.api.revokeSession(s.id).subscribe({
      next: () => { this.toast.success('Sesión cerrada.'); this.loadSessions(); },
      error: (err) => this.toast.error(problemMessage(err)),
    });
  }
}
