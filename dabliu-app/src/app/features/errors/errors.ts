import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ShieldOff, Compass } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span class="grid size-14 place-items-center rounded-2xl bg-warn-soft text-warn"><lucide-icon [img]="icon" [size]="26" /></span>
      <h1 class="mt-5 text-[22px] font-bold">No tienes acceso a esta sección</h1>
      <p class="mt-2 text-[14px] text-fg-3">Tu rol no incluye este módulo. Si lo necesitas, pídele a un administrador que ajuste tus permisos.</p>
      <a [routerLink]="auth.homePath()" class="btn btn-primary mt-6">Ir al inicio</a>
    </div>
  `,
})
export class ForbiddenPage {
  readonly auth = inject(AuthService);
  readonly icon = ShieldOff;
}

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span class="grid size-14 place-items-center rounded-2xl bg-brand-soft text-accent"><lucide-icon [img]="icon" [size]="26" /></span>
      <h1 class="mt-5 text-[24px] font-bold">Página no encontrada</h1>
      <p class="mt-2 max-w-sm text-[14px] text-fg-3">La dirección no existe o cambió. Revisa el enlace o vuelve al inicio.</p>
      <a routerLink="/" class="btn btn-primary mt-6">Volver al inicio</a>
    </div>
  `,
})
export class NotFoundPage {
  readonly icon = Compass;
}
