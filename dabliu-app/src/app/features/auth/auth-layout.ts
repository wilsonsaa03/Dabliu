import { Component, input } from '@angular/core';
import { LucideAngularModule, ShieldCheck } from 'lucide-angular';

/** Marco de las pantallas públicas: panel de marca a la izquierda y formulario a la derecha. */
@Component({
  selector: 'app-auth-layout',
  imports: [LucideAngularModule],
  template: `
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <!-- Marca -->
      <section class="brand relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="true">
        <div class="flex items-center gap-3">
          <img src="logo-dabliu.png" alt="" width="52" height="40" class="h-10 w-[52px] rounded-xl bg-black object-contain">
          <div class="leading-none">
            <span class="block font-display text-[18px] font-extrabold tracking-[0.06em] text-white">DABLIU</span>
            <span class="mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.34em] text-accent">Soluciones</span>
          </div>
        </div>
        <div class="relative">
          <p class="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-white">La operación de DABLIU,<br>en un solo lugar.</p>
          <p class="mt-4 max-w-[42ch] text-[15px] text-[#aab4cc]">Prospectos, clientes, proyectos y equipo en una plataforma privada, con acceso según el rol de cada persona.</p>
        </div>
        <p class="flex items-center gap-2 text-[12.5px] text-[#6f7b97]">
          <lucide-icon [img]="shield" [size]="15" /> Sesión cifrada · cookies seguras · acceso por roles
        </p>
      </section>

      <!-- Formulario -->
      <section class="flex items-center justify-center px-5 py-10 sm:px-10">
        <div class="w-full max-w-[400px] animate-fade-up">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <img src="logo-dabliu.png" alt="" width="44" height="34" class="h-[34px] w-11 rounded-lg bg-black object-contain">
            <span class="font-display text-[17px] font-extrabold tracking-[0.05em]">DABLIU <span class="text-accent">SaaS</span></span>
          </div>
          <h1 class="text-[24px] font-bold">{{ title() }}</h1>
          @if (subtitle()) { <p class="mt-2 text-[14px] text-fg-3">{{ subtitle() }}</p> }
          <div class="mt-7"><ng-content /></div>
        </div>
      </section>
    </div>
  `,
  styles: `
    .brand {
      background:
        radial-gradient(70% 60% at 85% 10%, rgba(43, 107, 255, 0.35), transparent 70%),
        radial-gradient(50% 50% at 10% 90%, rgba(69, 220, 255, 0.14), transparent 70%),
        linear-gradient(160deg, #070c1e, #03050c);
    }
    .brand::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(120, 160, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 160, 255, 0.06) 1px, transparent 1px);
      background-size: 48px 48px; mask-image: radial-gradient(80% 70% at 70% 40%, #000, transparent);
    }
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly shield = ShieldCheck;
}
