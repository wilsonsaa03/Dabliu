import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Entrada suave cuando el elemento aparece en pantalla (una sola vez).
 * Uso: <div appReveal>  ·  con retraso para escalonar: <li appReveal [revealDelay]="i * 80">
 *
 * - Solo oculta lo que está debajo del primer pantallazo: lo visible al cargar no espera.
 * - Si el usuario pidió "reducir movimiento" o no hay IntersectionObserver, no hace nada.
 * - Usa la propiedad CSS "translate", así no interfiere con los hover de las tarjetas.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'rv',
    '[style.--rv-d]': 'revealDelay() + "ms"',
  },
})
export class RevealDirective implements OnDestroy {
  /** Retraso en milisegundos (para animaciones escalonadas). */
  readonly revealDelay = input(0);

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement as HTMLElement;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window)) return;
      if (node.getBoundingClientRect().top < window.innerHeight) return; // ya visible

      node.classList.add('rv--wait');
      this.observer = new IntersectionObserver(
        ([entry]) => {
          // Se revela en cuanto entra en pantalla. Sin márgenes negativos a propósito:
          // así no falla con scroll rápido ni con lo último de la página (que nunca sube más).
          if (!entry.isIntersecting) return;
          node.classList.remove('rv--wait');
          node.classList.add('rv--in');
          this.observer?.disconnect();
        },
      );
      this.observer.observe(node);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
