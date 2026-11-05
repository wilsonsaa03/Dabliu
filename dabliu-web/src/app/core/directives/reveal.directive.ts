import { Directive, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';

/**
 * Añade un pequeño desplazamiento de entrada cuando el elemento aparece en pantalla.
 * Uso: <div appReveal>...</div>
 * Si el usuario pidió "reducir movimiento", no hace nada.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'rv' },
})
export class RevealDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  constructor() {
    // afterNextRender se ejecuta solo en el navegador, después de pintar el componente.
    afterNextRender(() => {
      const node = this.el.nativeElement as HTMLElement;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window)) return;
      if (node.getBoundingClientRect().top < window.innerHeight) return; // ya visible

      node.classList.add('rv--wait');
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            node.classList.remove('rv--wait');
            this.observer?.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px' },
      );
      this.observer.observe(node);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
