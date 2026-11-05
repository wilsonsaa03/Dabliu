import { Component, input } from '@angular/core';

let uid = 0;

/**
 * Separador decorativo entre secciones: ondas de luz que fluyen (SVG animado).
 * Uso: <app-glow-wave />  ·  invertida: <app-glow-wave flip />
 * El trazo usa vector-effect="non-scaling-stroke": el SVG se estira a lo ancho
 * sin que las líneas se deformen ni se engrosen.
 */
@Component({
  selector: 'app-glow-wave',
  host: { 'aria-hidden': 'true', '[class.flip]': 'flip()' },
  template: `
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient [attr.id]="id" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="var(--wave-b)" stop-opacity="0"/>
          <stop offset="0.35" stop-color="var(--wave-a)"/>
          <stop offset="0.7" stop-color="var(--wave-b)"/>
          <stop offset="1" stop-color="var(--wave-a)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="w w1" d="M0 78C240 30 420 112 720 70S1180 20 1440 58" [attr.stroke]="'url(#' + id + ')'"/>
      <path class="w w2" d="M0 90C260 60 480 118 760 84S1200 40 1440 76" [attr.stroke]="'url(#' + id + ')'"/>
      <path class="w w3" d="M0 64C300 96 520 30 820 58S1240 96 1440 44" [attr.stroke]="'url(#' + id + ')'"/>
      <path class="pulse" d="M0 78C240 30 420 112 720 70S1180 20 1440 58" pathLength="1"/>
    </svg>
  `,
  styles: `
    :host { position: relative; z-index: 1; display: block; height: clamp(56px, 7vw, 110px); margin-block: clamp(-55px, -3.5vw, -28px); pointer-events: none; }
    :host(.flip) svg { transform: scaleX(-1); }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .w { fill: none; vector-effect: non-scaling-stroke; }
    .w1 { stroke-width: 2; filter: drop-shadow(0 0 6px var(--wave-a)); }
    .w2 { stroke-width: 1; opacity: 0.55; }
    .w3 { stroke-width: 1; opacity: 0.35; }
    .pulse {
      fill: none; stroke: #fff; stroke-width: 2.5; stroke-linecap: round; vector-effect: non-scaling-stroke;
      stroke-dasharray: 0.06 0.94; opacity: 0.85; filter: drop-shadow(0 0 8px var(--wave-a));
      animation: flow 7s linear infinite;
    }
    @keyframes flow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .pulse { display: none; } }
  `,
})
export class GlowWave {
  readonly flip = input(false, { transform: (v: boolean | '') => v === '' || v });
  readonly id = `gw-${++uid}`;
}
