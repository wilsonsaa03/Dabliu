import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-process',
  imports: [RevealDirective],
  template: `
    <section class="band" id="proceso">
      <div class="wrap pr">
        <div class="pr__copy" appReveal>
          <span class="eyebrow">Nuestro proceso</span>
          <h2 class="h2 h2--side">De la idea al resultado, <span class="grad">en 6 pasos</span></h2>
          <p class="lead">Después del diagnóstico gratuito trabajamos por entregas cortas: ves avances funcionando y decides qué sigue.</p>
          <a class="btn btn--ghost btn--sm" href="#contacto">
            Empezar por el diagnóstico
            <svg class="btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="arrow"/></svg>
          </a>
        </div>
        <ol class="flow">
          <li class="flow__track" aria-hidden="true" appReveal><span class="flow__fill"></span></li>
          @for (s of steps; track s.n; let i = $index) {
            <li class="step" appReveal [revealDelay]="150 + i * 220">
              <span class="step__node" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="s.icon" pathLength="1"/></svg>
              </span>
              <div>
                <span class="step__n">{{ s.n }}</span>
                <h3>{{ s.title }}</h3>
                <p>{{ s.text }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styleUrl: './process.scss',
})
export class Process {
  readonly arrow = ICONS.arrowRight;
  readonly steps = [
    { n: '01', title: 'Descubrimos', text: 'Conocemos tu operación y lo que quieres lograr.', icon: ICONS.bulb },
    { n: '02', title: 'Analizamos', text: 'Definimos requisitos, alcance, tiempos y costo.', icon: ICONS.search },
    { n: '03', title: 'Diseñamos', text: 'Prototipo navegable antes de construir.', icon: ICONS.pen },
    { n: '04', title: 'Desarrollamos', text: 'Entregas cortas que puedes probar.', icon: ICONS.rocket },
    { n: '05', title: 'Implementamos', text: 'Puesta en marcha, migración y capacitación.', icon: ICONS.check },
    { n: '06', title: 'Evolucionamos', text: 'Soporte y mejoras según el uso real.', icon: ICONS.chart },
  ];
}
