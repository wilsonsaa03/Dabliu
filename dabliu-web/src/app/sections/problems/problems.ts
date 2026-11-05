import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SurfaceDirective } from '../../core/directives/surface.directive';
import { ICONS } from '../../shared/icons';

/**
 * "El punto de partida": problemas en los que el empresario se reconoce.
 * Cada tarjeta tiene un ícono con su propia animación (engranaje que gira, reloj que avanza, etc.)
 * y al final un puente visual que lleva del problema a la solución (servicios).
 */
@Component({
  selector: 'app-problems',
  imports: [RevealDirective, SurfaceDirective],
  template: `
    <section class="band glowbg" id="desafios">
      <div class="wrap pb">
        <div class="pb__copy" appReveal>
          <span class="eyebrow">El punto de partida</span>
          <h2 class="h2 h2--side">Tu negocio enfrenta <span class="grad">desafíos reales…</span></h2>
          <p class="pb__sub">La tecnología tiene la solución.</p>
          <p class="lead">Si te reconoces en alguno de estos casos, tu empresa está perdiendo tiempo y dinero que se puede recuperar.</p>
        </div>

        <ul class="pb__grid">
          @for (p of problems; track p.title; let i = $index) {
            <li class="pc" [class]="'pc pc--' + p.anim" appSurface="tilt" appReveal [revealDelay]="i * 90">
              <span class="pc__ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  @if (p.anim === 'clock') {
                    <circle cx="12" cy="12" r="9"/>
                    <path class="hand" d="M12 12V7"/>
                    <path class="hand2" d="M12 12l3.5 2"/>
                  } @else {
                    <path [attr.d]="p.icon"/>
                  }
                </svg>
              </span>
              <div>
                <h3>{{ p.title }}</h3>
                <p>{{ p.text }}</p>
              </div>
            </li>
          }
        </ul>

        <a class="bridge" href="#servicios" appReveal [revealDelay]="300">
          <span class="bridge__line" aria-hidden="true"></span>
          <span class="bridge__pill">
            Así lo resolvemos
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="arrowDown"/></svg>
          </span>
          <span class="bridge__line" aria-hidden="true"></span>
        </a>
      </div>
    </section>
  `,
  styleUrl: './problems.scss',
})
export class Problems {
  readonly arrowDown = ICONS.arrowDown;

  readonly problems = [
    { title: 'Procesos manuales', text: 'Tareas repetitivas que consumen horas de tu equipo cada semana.', icon: ICONS.gear, anim: 'spin' },
    { title: 'Información desorganizada', text: 'Datos repartidos entre Excel, cuadernos y chats de WhatsApp.', icon: ICONS.database, anim: 'stack' },
    { title: 'Sistemas desconectados', text: 'Herramientas que no se hablan y obligan a digitar dos veces.', icon: ICONS.unlink, anim: 'split' },
    { title: 'Pérdida de tiempo', text: 'Buscar, reingresar y corregir la misma información una y otra vez.', icon: ICONS.clock, anim: 'clock' },
    { title: 'Falta de automatización', text: 'Avisos y seguimientos que dependen de que alguien se acuerde.', icon: ICONS.bell, anim: 'ring' },
    { title: 'Datos sin aprovechar', text: 'Tienes la información, pero no se convierte en decisiones.', icon: ICONS.chart, anim: 'bars' },
  ];
}
