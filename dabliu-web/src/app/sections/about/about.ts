import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SurfaceDirective } from '../../core/directives/surface.directive';
import { CONTACT, FOUNDER } from '../../core/contact';
import { ICONS } from '../../shared/icons';

/**
 * "Nosotros": quién está detrás y qué nos comprometemos a hacer.
 * Solo compromisos que DABLIU puede cumplir; la tarjeta del fundador
 * aparece cuando se completa FOUNDER en core/contact.ts.
 */
@Component({
  selector: 'app-about',
  imports: [RevealDirective, SurfaceDirective],
  template: `
    <section class="band" id="nosotros">
      <div class="wrap about">
        <div class="about__copy" appReveal>
          <span class="eyebrow">Nosotros</span>
          <h2 class="h2">Una empresa de tecnología de {{ contact.city }}.</h2>
          <p class="lead">DABLIU SOLUCIONES desarrolla software, aplicaciones y automatizaciones para emprendedores y pequeñas y medianas empresas de Colombia. Creemos que un negocio no necesita ser grande para tener tecnología hecha a su medida.</p>

          @if (founder.name) {
            <div class="founder">
              @if (founder.photo) { <img [src]="founder.photo" [alt]="founder.name" width="72" height="72"> }
              <div>
                <b>{{ founder.name }}</b>
                <span>{{ founder.role }}</span>
                @if (founder.bio) { <p>{{ founder.bio }}</p> }
              </div>
            </div>
          }

          <p class="place">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="pinIcon"/></svg>
            {{ contact.city }}, {{ contact.region }} · {{ contact.country }}
          </p>
        </div>

        <ul class="promises" aria-label="Nuestros compromisos">
          @for (p of promises; track p.title; let i = $index) {
            <li appSurface appReveal [revealDelay]="i * 110">
              <span class="promises__ic ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="checkIcon" pathLength="1"/></svg>
              </span>
              <div>
                <h3>{{ p.title }}</h3>
                <p>{{ p.text }}</p>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .about { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(32px, 5vw, 72px); align-items: start; }
    .about__copy { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
    .founder {
      display: flex; gap: 16px; align-items: flex-start; padding: 18px; border-radius: 16px;
      border: 1px solid var(--line); background: var(--surface);
      img { flex: none; width: 72px; height: 72px; border-radius: 16px; object-fit: cover; }
      b { display: block; font-family: var(--f-display); font-size: 17px; }
      span { font-size: 13.5px; color: var(--cyan); font-weight: 600; }
      p { margin-top: 6px; font-size: 14.5px; color: var(--fg-2); }
    }
    .place svg { animation: bob 3s ease-in-out infinite; }
    @keyframes bob { 50% { transform: translateY(-3px); } }
    .place {
      display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--fg-2);
      svg { width: 20px; height: 20px; color: var(--cyan); }
    }
    .promises { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .promises li { display: flex; gap: 16px; align-items: flex-start; padding: 20px 22px; border-radius: 16px; }
    /* El check se dibuja cuando la tarjeta aparece */
    .promises li.rv--in .promises__ic path { animation: draw 0.8s var(--ease) calc(var(--rv-d, 0ms) + 400ms) both; }
    .promises__ic {
      flex: none; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center;
      color: var(--ok); background: var(--ok-bg);
      transition: transform 0.5s var(--ease), box-shadow 0.5s;
      svg { width: 18px; height: 18px; }
    }
    h3 { font-size: 16.5px; font-weight: 700; }
    .promises p { margin-top: 4px; font-size: 14.5px; color: var(--fg-2); }
    @media (max-width: 900px) { .about { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class About {
  readonly contact = CONTACT;
  readonly founder = FOUNDER;
  readonly pinIcon = ICONS.pin;
  readonly checkIcon = ICONS.check;

  readonly promises = [
    { title: 'Una persona lee cada solicitud', text: 'Nada de respuestas automáticas: te escribimos para entender tu caso.' },
    { title: 'Te decimos también lo que no necesitas', text: 'Recomendamos construir solo lo que resuelve tu problema.' },
    { title: 'Ves avances funcionando', text: 'Entregas cortas que puedes probar antes de seguir.' },
    { title: 'Seguridad desde el diseño', text: 'Accesos por roles, autenticación y protección de datos en todo lo que construimos.' },
  ];
}
