import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { ICONS } from '../../shared/icons';

/** Franja de diferenciales: promesas que DABLIU puede cumplir, sin cifras ni garantías absolutas. */
@Component({
  selector: 'app-why',
  imports: [RevealDirective],
  template: `
    <section class="why" aria-labelledby="why-t">
      <div class="wrap why__in">
        <div class="why__copy" appReveal>
          <h2 id="why-t">¿Por qué elegir <span class="grad">DABLIU SOLUCIONES?</span></h2>
          <p>Más que desarrollo: somos tu aliado tecnológico.</p>
        </div>
        <ul>
          @for (r of reasons; track r.title; let i = $index) {
            <li appReveal [revealDelay]="i * 110">
              <span class="why__ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="r.icon" pathLength="1"/></svg>
              </span>
              <h3>{{ r.title }}</h3>
              <p>{{ r.text }}</p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .why { padding-block: clamp(40px, 6vw, 64px); border-block: 1px solid var(--line); background: linear-gradient(90deg, var(--accent-bg), transparent 40%, var(--accent-bg)); }
    .why__in { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 2.4fr); gap: 32px; align-items: center; }
    .why__copy { display: flex; flex-direction: column; gap: 8px; }
    h2 { font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.15; font-weight: 700; }
    .why__copy p { color: var(--fg-2); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    li {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 8px 18px;
      border-left: 1px solid var(--line);
      h3 { font-size: 15.5px; font-weight: 700; }
      p { font-size: 13.5px; color: var(--fg-3); max-width: 24ch; }
    }
    .why__ic {
      display: grid; place-items: center; width: 52px; height: 52px; color: var(--cyan);
      filter: drop-shadow(0 0 10px var(--shadow-blue));
      transition: transform 0.5s var(--ease);
      svg { width: 36px; height: 36px; }
      path { stroke-dasharray: 1; }
    }
    li.rv--in .why__ic path { animation: draw 1.1s var(--ease-out) calc(var(--rv-d, 0ms) + 200ms) both; }
    @media (hover: hover) { li:hover .why__ic { transform: translateY(-4px) scale(1.08); } }
    @media (max-width: 1000px) {
      .why__in { grid-template-columns: minmax(0, 1fr); }
      ul { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 0; }
      li:nth-child(odd) { border-left: 0; }
    }
    @media (max-width: 480px) {
      ul { grid-template-columns: minmax(0, 1fr); }
      li { border-left: 0; }
    }
  `,
})
export class Why {
  readonly reasons = [
    { title: 'Soluciones a tu medida', text: 'Adaptamos la tecnología a tu negocio, no al revés.', icon: ICONS.diamond },
    { title: 'Tecnología moderna', text: 'Construimos con herramientas actuales y probadas.', icon: ICONS.rocket },
    { title: 'Seguridad desde el diseño', text: 'Accesos por roles y protección de tu información.', icon: ICONS.shield },
    { title: 'Enfoque en resultados', text: 'Entregas cortas que puedes probar y medir.', icon: ICONS.target },
  ];
}
