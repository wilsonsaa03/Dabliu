import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-why',
  imports: [RevealDirective],
  template: `
    <section class="band">
      <div class="wrap">
        <div class="head" appReveal>
          <span class="eyebrow">Diferencial</span>
          <h2 class="h2">¿Por qué DABLIU?</h2>
        </div>
        <div class="why" appReveal>
          @for (item of items; track item.title) {
            <article>
              <span class="why__k">{{ item.key }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .why {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px;
      background: var(--line); border: 1px solid var(--line); border-radius: 24px; overflow: hidden;
    }
    article {
      display: flex; flex-direction: column; gap: 14px; padding: clamp(28px, 4vw, 44px);
      background: var(--bg-2); transition: background 0.4s;
    }
    article:hover { background: var(--bg-hover); }
    .why__k { font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.2em; color: var(--cyan); }
    h3 { font-size: clamp(1.25rem, 2vw, 1.6rem); font-weight: 700; }
    p { color: var(--fg-2); max-width: 46ch; }
    @media (max-width: 700px) { .why { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class Why {
  readonly items = [
    { key: 'A LA MEDIDA', title: 'Soluciones personalizadas', text: 'No adaptamos tu negocio a un software. Adaptamos la tecnología a tus necesidades.' },
    { key: 'ARQUITECTURA', title: 'Tecnología moderna', text: 'Utilizamos arquitecturas y herramientas actuales para construir soluciones mantenibles y escalables.' },
    { key: 'PROTECCIÓN', title: 'Seguridad', text: 'Diseñamos sistemas teniendo en cuenta autenticación, autorización y protección de datos.' },
    { key: 'RESULTADOS', title: 'Visión de negocio', text: 'No desarrollamos por desarrollar. Buscamos que la tecnología genere resultados reales.' },
  ];
}
