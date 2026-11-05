import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

/** Preguntas frecuentes: resuelve dudas antes del contacto. Usa <details>, accesible sin JavaScript. */
@Component({
  selector: 'app-faq',
  imports: [RevealDirective],
  template: `
    <section class="band band--alt" id="preguntas">
      <div class="wrap faq">
        <div class="head" appReveal>
          <span class="eyebrow">Preguntas frecuentes</span>
          <h2 class="h2">Lo que suelen preguntarnos.</h2>
        </div>
        <div class="list">
          @for (q of questions; track q.q; let i = $index) {
            <details appReveal [revealDelay]="i * 70">
              <summary>{{ q.q }}</summary>
              <p>{{ q.a }}</p>
            </details>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .faq { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: clamp(24px, 5vw, 64px); align-items: start; }
    .head { margin-bottom: 0; }
    .list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    details { border-radius: 14px; border: 1px solid var(--line); background: var(--surface); transition: border-color 0.3s, background 0.3s; }
    details:hover { border-color: var(--line-strong); }
    details[open] { border-color: var(--line-strong); background: var(--accent-bg); }
    /* Apertura suave donde el navegador lo soporta (Chrome/Edge recientes); en el resto abre al instante */
    @supports selector(::details-content) {
      details { interpolate-size: allow-keywords; }
      details::details-content { block-size: 0; overflow: hidden; transition: block-size 0.4s var(--ease), content-visibility 0.4s allow-discrete; }
      details[open]::details-content { block-size: auto; }
    }
    summary {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: 18px 20px; cursor: pointer; list-style: none;
      font-family: var(--f-display); font-weight: 600; font-size: 16px;
    }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '+'; flex: none; font-size: 22px; line-height: 1; color: var(--cyan); transition: transform 0.35s var(--ease); }
    details[open] summary::after { transform: rotate(45deg); }
    details p { padding: 0 20px 18px; color: var(--fg-2); }
    @media (max-width: 900px) { .faq { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class Faq {
  readonly questions = [
    { q: '¿El diagnóstico tiene algún costo?', a: 'No. Es gratuito ($0 COP), dura 30 minutos y no te compromete a contratar nada.' },
    { q: '¿Qué obtengo del diagnóstico?', a: 'Revisamos contigo dónde se pierde tiempo o dinero en tu operación y te llevas una recomendación clara de qué conviene construir primero, y qué no.' },
    { q: '¿Cuánto cuesta desarrollar un sistema o una app?', a: 'Depende del alcance. Antes de empezar definimos contigo requisitos, alcance, tiempos y costo, para que sepas exactamente qué vas a recibir.' },
    { q: '¿Necesito saber de tecnología?', a: 'No. Hablamos en términos de tu negocio; la parte técnica es nuestra.' },
    { q: '¿Cómo sé cómo va mi proyecto?', a: 'Trabajamos por entregas cortas: ves avances funcionando, los pruebas y decides qué sigue.' },
    { q: '¿Qué pasa después de la entrega?', a: 'Acompañamos la puesta en marcha y la capacitación, y seguimos con soporte y mejoras según el uso real.' },
  ];
}
