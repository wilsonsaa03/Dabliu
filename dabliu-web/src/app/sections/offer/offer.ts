import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { CONTACT } from '../../core/contact';
import { ICONS, WHATSAPP_ICON } from '../../shared/icons';

/**
 * Franja de conversión con la oferta de entrada (diagnóstico gratuito).
 * Ilustración SVG propia: puesto de desarrollo con pantallas de código que se escriben solas.
 */
@Component({
  selector: 'app-offer',
  imports: [RevealDirective],
  template: `
    <div class="wrap">
      <aside class="offer" appReveal aria-label="Diagnóstico tecnológico gratuito">
        <div class="offer__art" aria-hidden="true">
          <svg viewBox="0 0 320 200">
            <defs>
              <linearGradient id="of-scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123a9e"/><stop offset="1" stop-color="#06122f"/></linearGradient>
              <radialGradient id="of-glow" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#2b6bff" stop-opacity="0.55"/><stop offset="1" stop-color="#2b6bff" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="320" height="200" fill="url(#of-glow)"/>
            <!-- pantallas -->
            <g class="scr">
              <rect x="20" y="34" width="120" height="78" rx="6" fill="url(#of-scr)"/>
              <rect x="150" y="22" width="150" height="94" rx="6" fill="url(#of-scr)"/>
            </g>
            <g class="code">
              @for (l of codeA; track $index) { <rect [attr.x]="30 + l[0]" [attr.y]="46 + $index * 11" [attr.width]="l[1]" height="4" rx="2" [style.--k]="$index"/> }
              @for (l of codeB; track $index) { <rect [attr.x]="162 + l[0]" [attr.y]="36 + $index * 11" [attr.width]="l[1]" height="4" rx="2" [style.--k]="$index + 3"/> }
            </g>
            <path class="stand" d="M74 112v14M54 126h40M222 116v12M198 128h48"/>
            <!-- escritorio -->
            <path class="desk" d="M0 150H320"/>
            <rect class="kb" x="118" y="140" width="84" height="7" rx="2"/>
            <!-- persona de espaldas con audífonos -->
            <g class="person">
              <path d="M112 200c0-34 20-52 48-52s48 18 48 52z"/>
              <circle cx="160" cy="124" r="19"/>
              <path class="hp" d="M140 124a20 20 0 0140 0" fill="none"/>
              <rect class="hp-c" x="136" y="120" width="7" height="13" rx="3"/>
              <rect class="hp-c" x="177" y="120" width="7" height="13" rx="3"/>
            </g>
          </svg>
        </div>

        <div class="offer__copy">
          <span class="eyebrow">Diagnóstico gratuito</span>
          <h2>¿Listo para llevar tu negocio <span class="grad">al siguiente nivel?</span></h2>
          <p>Agenda un diagnóstico tecnológico de 30 minutos: revisamos tu operación contigo y te decimos qué conviene construir primero, y qué no. $0 COP, sin compromiso.</p>
        </div>

        <div class="offer__act">
          <a class="btn btn--primary btn--glow" href="#contacto">
            Solicitar diagnóstico gratuito
            <svg class="btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="arrow"/></svg>
          </a>
          <ul class="offer__contact">
            <li><a [href]="contact.whatsappChatUrl" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="waIcon"/></svg>
              <span><b>WhatsApp</b>{{ contact.whatsappLabel }}</span></a></li>
            <li><a [href]="'mailto:' + contact.email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="mailIcon"/></svg>
              <span><b>Correo</b>{{ contact.email }}</span></a></li>
            <li><span class="offer__loc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="pinIcon"/></svg>
              <span><b>Ubicación</b>{{ contact.city }}, {{ contact.country }}</span></span></li>
          </ul>
        </div>
      </aside>
    </div>
  `,
  styles: `
    :host { display: block; padding-block: clamp(24px, 4vw, 48px); }
    .offer {
      position: relative; overflow: hidden; isolation: isolate;
      display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1fr); gap: 24px 36px; align-items: center;
      padding: clamp(16px, 2.4vw, 24px); padding-right: clamp(20px, 3vw, 36px); border-radius: 28px;
      border: 1px solid var(--line-strong);
      background: linear-gradient(100deg, var(--accent-bg), var(--surface) 55%, var(--accent-bg));
      box-shadow: 0 40px 80px -50px var(--shadow-blue), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    /* reflejo que cruza la franja al aparecer */
    .offer::before {
      content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
      background: linear-gradient(110deg, transparent 35%, var(--accent-bg) 50%, transparent 65%);
      transform: translateX(-100%);
    }
    .offer.rv--in::before { animation: sweep 1.6s var(--ease-out) 0.4s 1; }
    @keyframes sweep { to { transform: translateX(100%); } }

    .offer__art {
      border-radius: 20px; overflow: hidden; background: #030818; border: 1px solid var(--line);
      svg { display: block; width: 100%; height: auto; aspect-ratio: 320 / 200; }
    }
    .stand, .desk { stroke: #1c3a8a; stroke-width: 3; stroke-linecap: round; fill: none; }
    .kb { fill: #0d1f52; }
    .code rect { fill: #45dcff; opacity: 0.75; transform-box: fill-box; transform-origin: left; animation: type 4s steps(8) calc(var(--k, 0) * 0.35s) infinite; }
    .code rect:nth-child(3n) { fill: #7db3ff; }
    @keyframes type { 0% { transform: scaleX(0); } 40%, 100% { transform: scaleX(1); } }
    .person path:first-child, .person circle { fill: #050b1e; stroke: #1e4fd8; stroke-width: 1.5; }
    .hp { stroke: #45dcff; stroke-width: 3; }
    .hp-c { fill: #45dcff; }

    .offer__copy { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    h2 { font-size: clamp(1.4rem, 2.4vw, 2rem); line-height: 1.12; font-weight: 700; }
    .offer__copy p { color: var(--fg-2); font-size: 14.5px; }

    .offer__act { display: flex; flex-direction: column; gap: 18px; min-width: 0; .btn { white-space: normal; text-align: center; } }
    .offer.rv--in .btn { animation: attention 1.6s ease-out 0.9s 2, glow-pulse 3.6s ease-in-out 4.5s infinite; }
    @keyframes attention { 0% { box-shadow: 0 0 0 0 var(--accent-line), 0 10px 30px -12px var(--shadow-blue); } 100% { box-shadow: 0 0 0 16px transparent, 0 10px 30px -12px var(--shadow-blue); } }

    .offer__contact { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .offer__contact a, .offer__loc { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--fg-2); font-size: 13.5px; min-width: 0; }
    .offer__contact a:hover { color: var(--fg); svg { transform: scale(1.1); color: var(--cyan); } }
    .offer__contact svg { flex: none; width: 20px; height: 20px; color: var(--cyan-soft); transition: transform 0.3s var(--ease), color 0.2s; }
    .offer__contact span span, .offer__contact a span { display: flex; flex-direction: column; line-height: 1.3; overflow-wrap: anywhere; }
    .offer__contact b { color: var(--fg); font-size: 12.5px; }

    @media (max-width: 1100px) {
      .offer { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
      .offer__act { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: space-between; }
      .offer__contact { flex-direction: row; flex-wrap: wrap; gap: 12px 24px; }
    }
    @media (max-width: 700px) {
      .offer { grid-template-columns: minmax(0, 1fr); }
      .offer__act { flex-direction: column; align-items: stretch; }
      .offer__contact { flex-direction: column; }
    }
  `,
})
export class Offer {
  readonly contact = CONTACT;
  readonly arrow = ICONS.arrowRight;
  readonly mailIcon = ICONS.mail;
  readonly pinIcon = ICONS.pin;
  readonly waIcon = WHATSAPP_ICON;

  /** Líneas de "código" de las pantallas: [sangría, ancho]. */
  readonly codeA: [number, number][] = [[0, 60], [10, 70], [10, 44], [20, 56], [0, 38], [10, 80]];
  readonly codeB: [number, number][] = [[0, 90], [12, 70], [12, 104], [24, 60], [24, 84], [12, 50], [0, 96]];
}
