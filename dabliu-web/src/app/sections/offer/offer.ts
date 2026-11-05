import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

/** Franja intermedia con la oferta de entrada; lleva al formulario de contacto. */
@Component({
  selector: 'app-offer',
  imports: [RevealDirective],
  template: `
    <div class="wrap">
      <aside class="offer" appReveal aria-label="Oferta de entrada">
        <div>
          <span class="eyebrow">Primer paso · $0 COP</span>
          <h2>Diagnóstico tecnológico gratuito de 30 minutos.</h2>
          <p>Revisamos tu operación contigo y te decimos qué conviene construir. Sin compromiso.</p>
        </div>
        <a class="btn btn--primary" href="#contacto">Solicitar diagnóstico gratuito</a>
      </aside>
    </div>
  `,
  styles: `
    :host { display: block; padding-bottom: clamp(56px, 8vw, 96px); }
    .offer {
      display: flex; align-items: center; justify-content: space-between; gap: 24px 40px; flex-wrap: wrap;
      padding: clamp(24px, 4vw, 40px); border-radius: 24px; border: 1px solid var(--line-strong);
      background: linear-gradient(100deg, rgba(43, 107, 255, 0.16), rgba(69, 220, 255, 0.05));
    }
    .offer > div { display: flex; flex-direction: column; gap: 10px; flex: 1 1 380px; min-width: 0; }
    h2 { font-size: clamp(1.35rem, 2.4vw, 1.9rem); line-height: 1.15; font-weight: 700; }
    p { color: var(--fg-2); }
    .btn { white-space: normal; text-align: center; }
    @media (max-width: 560px) { .btn { width: 100%; } }
  `,
})
export class Offer {}
