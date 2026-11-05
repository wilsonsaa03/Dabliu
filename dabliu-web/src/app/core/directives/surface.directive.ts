import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Tarjeta con profundidad: borde iluminado que sigue al cursor y, si se pide, una leve inclinación 3D.
 * Uso: <article appSurface>  ·  con inclinación: <article appSurface="tilt">
 *
 * Solo se activa con mouse (hover: hover, pointer: fine) y sin "reducir movimiento".
 * Corre fuera de Angular y con requestAnimationFrame: no dispara detección de cambios.
 * El aspecto visual vive en la clase global .surface (styles.scss).
 */
@Directive({
  selector: '[appSurface]',
  host: { class: 'surface' },
})
export class SurfaceDirective implements OnDestroy {
  readonly mode = input<'' | 'tilt'>('', { alias: 'appSurface' });

  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private off?: () => void;

  constructor() {
    afterNextRender(() => {
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!fine || reduce) return;

      const node = this.el.nativeElement as HTMLElement;
      const tilt = this.mode() === 'tilt';
      this.zone.runOutsideAngular(() => {
        let raf = 0;
        let x = 0, y = 0;
        const paint = () => {
          raf = 0;
          const r = node.getBoundingClientRect();
          const px = x - r.left, py = y - r.top;
          node.style.setProperty('--mx', `${px.toFixed(0)}px`);
          node.style.setProperty('--my', `${py.toFixed(0)}px`);
          if (tilt) {
            node.style.setProperty('--rx', `${((0.5 - py / r.height) * 5).toFixed(2)}deg`);
            node.style.setProperty('--ry', `${((px / r.width - 0.5) * 6).toFixed(2)}deg`);
          }
        };
        const onMove = (e: PointerEvent) => {
          x = e.clientX;
          y = e.clientY;
          if (!raf) raf = requestAnimationFrame(paint);
        };
        const onLeave = () => {
          cancelAnimationFrame(raf);
          raf = 0;
          node.style.removeProperty('--rx');
          node.style.removeProperty('--ry');
        };
        node.addEventListener('pointermove', onMove, { passive: true });
        node.addEventListener('pointerleave', onLeave);
        this.off = () => {
          cancelAnimationFrame(raf);
          node.removeEventListener('pointermove', onMove);
          node.removeEventListener('pointerleave', onLeave);
        };
      });
    });
  }

  ngOnDestroy(): void {
    this.off?.();
  }
}
