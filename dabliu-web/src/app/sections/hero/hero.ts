import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';
import { Scene3d } from '../../shared/scene-3d/scene-3d';

@Component({
  selector: 'app-hero',
  imports: [Scene3d],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero implements OnDestroy {
  /** Etiquetas flotantes alrededor del objeto 3D (capacidades, no tecnologías). */
  readonly tags = [
    { label: 'Web', pos: 'left:4%;top:16%' },
    { label: 'Apps móviles', pos: 'right:2%;top:10%' },
    { label: 'Integraciones', pos: 'left:0;top:58%' },
    { label: 'Datos', pos: 'right:0;top:52%' },
    { label: 'IA', pos: 'left:22%;bottom:4%' },
    { label: 'Cloud', pos: 'right:18%;bottom:10%' },
  ];
  readonly chips = ['Software a medida', 'Apps', 'IA & Datos', 'Cloud'];

  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private off?: () => void;

  constructor() {
    // Parallax de las etiquetas: se mueven a distinta profundidad según el puntero.
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.zone.runOutsideAngular(() => {
        const tags = Array.from((this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.tag'));
        let tx = 0, ty = 0, mx = 0, my = 0, raf = 0;
        const tick = () => {
          mx += (tx - mx) * 0.06;
          my += (ty - my) * 0.06;
          tags.forEach((t, i) => {
            const f = (i % 2 ? 1 : -1) * (10 + i * 3);
            t.style.transform = `translate3d(${(mx * f).toFixed(1)}px, ${(my * f).toFixed(1)}px, 0)`;
          });
          raf = Math.abs(tx - mx) + Math.abs(ty - my) > 0.001 ? requestAnimationFrame(tick) : 0;
        };
        const onMove = (e: PointerEvent) => {
          tx = e.clientX / window.innerWidth - 0.5;
          ty = e.clientY / window.innerHeight - 0.5;
          if (!raf) raf = requestAnimationFrame(tick);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        this.off = () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
      });
    });
  }

  ngOnDestroy(): void {
    this.off?.();
  }
}
