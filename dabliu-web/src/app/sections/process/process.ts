import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-process',
  imports: [RevealDirective],
  template: `
    <section class="band band--alt" id="proceso">
      <div class="wrap">
        <div class="head" appReveal>
          <span class="eyebrow">Cómo trabajamos</span>
          <h2 class="h2">Un proceso claro, de la idea al sistema en funcionamiento.</h2>
          <p class="lead">Trabajamos por entregas cortas: ves avances funcionando y decides qué sigue.</p>
        </div>
        <ol class="flow">
          <li class="flow__track" aria-hidden="true"><i></i><i></i><i></i></li>
          @for (s of steps; track s.n) {
            <li class="step" appReveal>
              <span class="step__node">{{ s.n }}</span>
              <div>
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
  readonly steps = [
    { n: '01', title: 'Descubrimos', text: 'Conocemos tu operación y lo que quieres lograr.' },
    { n: '02', title: 'Analizamos', text: 'Definimos requisitos, alcance, tiempos y costo.' },
    { n: '03', title: 'Diseñamos', text: 'Prototipo navegable antes de construir.' },
    { n: '04', title: 'Desarrollamos', text: 'Entregas cortas que puedes probar.' },
    { n: '05', title: 'Implementamos', text: 'Puesta en marcha, migración y capacitación.' },
    { n: '06', title: 'Evolucionamos', text: 'Soporte y mejoras según el uso real.' },
  ];
}
