import { Component } from '@angular/core';
import { CONTACT } from '../../core/contact';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="foot">
      <div class="wrap">
        <div class="foot__top">
          <div class="foot__brand">
            <a class="brand" href="#inicio" aria-label="DABLIU Soluciones, inicio">
              <img src="logo-dabliu.png" alt="" width="40" height="40">
              <span><b>DABLIU</b><small>SOLUCIONES</small></span>
            </a>
            <p>Tecnología que impulsa tus ideas.</p>
          </div>
          <nav aria-label="Pie de página">
            <div>
              <h4>Empresa</h4>
              <ul>
                <li><a href="#servicios">Servicios</a></li>
                <li><a href="#sectores">Sectores</a></li>
                <li><a href="#proceso">Proceso</a></li>
                <li><a href="#proyecto">MoviFY</a></li>
                <li><a href="#contacto">Diagnóstico gratuito</a></li>
              </ul>
            </div>
            <div>
              <h4>Redes</h4>
              <ul>
                <li><a [href]="contact.social.github" target="_blank" rel="noopener">GitHub</a></li>
                <li><a [href]="contact.social.linkedin" target="_blank" rel="noopener">LinkedIn</a></li>
                <li><a [href]="contact.social.instagram" target="_blank" rel="noopener">Instagram</a></li>
                <li><a [href]="contact.whatsappUrl" target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
          </nav>
        </div>
        <div class="foot__bot">
          <span>© {{ year }} DABLIU SOLUCIONES. Todos los derechos reservados.</span>
          <span>Buenaventura, Valle del Cauca · Colombia</span>
        </div>
      </div>
    </footer>
  `,
  styles: `
    :host { display: block; }
    .foot { padding-block: 56px 32px; background: var(--bg-3); border-top: 1px solid var(--line); }
    .foot__top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 32px; }
    .foot__brand { display: flex; flex-direction: column; gap: 12px; max-width: 320px; }
    .foot__brand p { color: var(--fg-3); font-size: 14.5px; }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--fg); }
    .brand img { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; }
    .brand b { display: block; font-family: var(--f-display); font-weight: 800; font-size: 18px; letter-spacing: 0.06em; line-height: 1; }
    .brand small { display: block; margin-top: 4px; font-family: var(--f-display); font-weight: 600; font-size: 9.5px; letter-spacing: 0.38em; color: var(--cyan); }
    nav { display: flex; flex-wrap: wrap; gap: 48px; }
    h4 { margin: 0 0 12px; font-family: var(--f-mono); font-size: 11.5px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--fg-3); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    ul a { display: inline-block; padding: 4px 0; font-size: 14.5px; color: var(--fg-2); text-decoration: none; }
    ul a:hover { color: var(--cyan); }
    .foot__bot { margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--fg-3); }
  `,
})
export class Footer {
  readonly contact = CONTACT;
  readonly year = new Date().getFullYear();
}
