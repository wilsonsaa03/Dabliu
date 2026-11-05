import { Component } from '@angular/core';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { Hero } from './sections/hero/hero';
import { Problem } from './sections/problem/problem';
import { Services } from './sections/services/services';
import { Process } from './sections/process/process';
import { Project } from './sections/project/project';
import { Technologies } from './sections/technologies/technologies';
import { Why } from './sections/why/why';
import { Cta } from './sections/cta/cta';
import { Sectors } from './sections/sectors/sectors';
import { Offer } from './sections/offer/offer';

/** Componente raíz: solo ordena las secciones de la página. */
@Component({
  selector: 'app-root',
  imports: [Navbar, Hero, Problem, Services, Sectors, Process, Project, Offer, Technologies, Why, Cta, Footer],
  template: `
    <app-navbar />
    <main>
      <app-hero />
      <app-problem />
      <app-services />
      <app-sectors />
      <app-process />
      <app-project />
      <app-offer />
      <app-technologies />
      <app-why />
      <app-cta />
    </main>
    <app-footer />
  `,
})
export class App {}
