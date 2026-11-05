import { Component } from '@angular/core';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { WhatsappFab } from './layout/whatsapp-fab/whatsapp-fab';
import { GlowWave } from './shared/glow-wave';
import { Hero } from './sections/hero/hero';
import { Problems } from './sections/problems/problems';
import { Sectors } from './sections/sectors/sectors';
import { Services } from './sections/services/services';
import { Project } from './sections/project/project';
import { Why } from './sections/why/why';
import { Offer } from './sections/offer/offer';
import { Process } from './sections/process/process';
import { About } from './sections/about/about';
import { Faq } from './sections/faq/faq';
import { Cta } from './sections/cta/cta';

/**
 * Componente raíz: solo ordena las secciones de la página.
 * Recorrido pensado para vender: impacto → problema → solución → sector → prueba (MoviFY)
 * → confianza → proceso → oferta → contacto. Las ondas de luz unen las secciones.
 */
@Component({
  selector: 'app-root',
  imports: [Navbar, Hero, Problems, Services, Sectors, Project, Why, Process, Offer, About, Faq, Cta, Footer, WhatsappFab, GlowWave],
  template: `
    <a class="skip" href="#contacto">Ir al formulario de contacto</a>
    <app-navbar />
    <main>
      <app-hero />
      <app-glow-wave />
      <app-problems />
      <app-glow-wave flip />
      <app-services />
      <app-sectors />
      <app-glow-wave />
      <app-project />
      <app-why />
      <app-process />
      <app-offer />
      <app-about />
      <app-faq />
      <app-cta />
    </main>
    <app-footer />
    <app-whatsapp-fab />
  `,
  styles: `
    .skip {
      position: absolute; left: 16px; top: -100px; z-index: 100; padding: 10px 16px; border-radius: 10px;
      background: var(--blue); color: #fff; font-weight: 700; text-decoration: none;
    }
    .skip:focus { top: 12px; }
  `,
})
export class App {}
