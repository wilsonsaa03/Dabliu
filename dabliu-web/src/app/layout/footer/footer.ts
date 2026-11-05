import { Component } from '@angular/core';
import { COMPANY, CONTACT } from '../../core/contact';
import { RevealDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-footer',
  imports: [RevealDirective],
  template: `
    <footer class="foot">
      <div class="wrap">
        <div class="foot__top" appReveal>
          <div class="foot__brand">
            <a class="brand" href="#inicio" aria-label="DABLIU Soluciones, ir al inicio">
              <img src="logo-dabliu.png" alt="" width="40" height="40" loading="lazy">
              <span><b>DABLIU</b><small>SOLUCIONES</small></span>
            </a>
            <p>Tecnología que impulsa tus ideas. Software, apps y automatización para pymes en Colombia.</p>
          </div>
          <nav aria-label="Pie de página">
            <div>
              <h2>Empresa</h2>
              <ul>
                <li><a href="#servicios">Servicios</a></li>
                <li><a href="#sectores">Sectores</a></li>
                <li><a href="#proceso">Proceso</a></li>
                <li><a href="#proyecto">Caso MoviFY</a></li>
                <li><a href="#nosotros">Nosotros</a></li>
                <li><a href="#contacto">Diagnóstico gratuito</a></li>
              </ul>
            </div>
            <div>
              <h2>Contacto</h2>
              <ul>
                <li><a [href]="contact.whatsappChatUrl" target="_blank" rel="noopener">WhatsApp {{ contact.whatsappLabel }}</a></li>
                <li><a [href]="'mailto:' + contact.email">{{ contact.email }}</a></li>
                <li><span>{{ contact.city }}, {{ contact.region }}</span></li>
                @for (s of social; track s.label) {
                  <li><a [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a></li>
                }
              </ul>
            </div>
          </nav>
        </div>
        <div class="foot__bot" appReveal [revealDelay]="150">
          <span>© {{ year }} {{ company.name }}@if (company.nit) { · NIT {{ company.nit }} }. Todos los derechos reservados.</span>
          <a [href]="company.privacyPolicyUrl">Política de tratamiento de datos</a>
        </div>
      </div>
    </footer>
  `,
  styles: `
    :host { display: block; }
    .foot { padding-block: 56px calc(32px + env(safe-area-inset-bottom, 0px)); background: var(--bg-3); border-top: 1px solid var(--line); }
    .foot__top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 32px; }
    .foot__brand { display: flex; flex-direction: column; gap: 12px; max-width: 340px; }
    .foot__brand p { color: var(--fg-3); font-size: 14.5px; }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--fg); }
    .brand img { width: 50px; height: 40px; border-radius: 10px; object-fit: contain; background: #000; }
    .brand b { display: block; font-family: var(--f-display); font-weight: 800; font-size: 18px; letter-spacing: 0.06em; line-height: 1; }
    .brand small { display: block; margin-top: 4px; font-family: var(--f-display); font-weight: 600; font-size: 9.5px; letter-spacing: 0.38em; color: var(--cyan); }
    nav { display: flex; flex-wrap: wrap; gap: 48px; }
    h2 { margin: 0 0 12px; font-family: var(--f-mono); font-size: 11.5px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--fg-3); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    ul a, ul span { display: inline-block; padding: 4px 0; font-size: 14.5px; color: var(--fg-2); text-decoration: none; }
    ul a {
      background: linear-gradient(currentColor, currentColor) no-repeat 0 calc(100% - 3px) / 0 1px;
      transition: background-size 0.35s var(--ease), color 0.2s, transform 0.3s var(--ease);
    }
    ul a:hover { color: var(--cyan); background-size: 100% 1px; }
    .brand img { transition: transform 0.5s var(--ease); }
    .brand:hover img { transform: rotate(-8deg) scale(1.05); }
    .foot__bot { margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--fg-3); }
    .foot__bot a { color: var(--fg-3); }
    .foot__bot a:hover { color: var(--cyan); }
  `,
})
export class Footer {
  readonly contact = CONTACT;
  readonly company = COMPANY;
  /** Solo redes con URL real. */
  readonly social = CONTACT.social.filter((s) => s.url);
  readonly year = new Date().getFullYear();
}
