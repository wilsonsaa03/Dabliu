import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, signal } from '@angular/core';
import { Scene3d } from '../../shared/scene-3d/scene-3d';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-hero',
  imports: [Scene3d],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero implements OnDestroy {
  readonly icons = ICONS;

  /** Tarjetas de vidrio alrededor del portátil 3D: beneficios, no cifras. */
  readonly cards = [
    { id: 'auto', title: 'Automatiza', text: 'tus procesos', icon: ICONS.check },
    { id: 'data', title: 'Datos', text: 'para decidir mejor', icon: ICONS.chart },
    { id: 'grow', title: 'Haz crecer', text: 'tu negocio', icon: ICONS.rocket },
  ];

  /**
   * La escena 3D se carga en todas las pantallas salvo con "ahorro de datos" o sin WebGL.
   * En celular la escena usa menos partículas y menor resolución (ver build-scene.ts).
   * Mientras carga, o si no se puede, se ve el logo con brillo en CSS.
   */
  readonly show3d = signal(false);

  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private off?: () => void;

  constructor() {
    afterNextRender(() => {
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
      this.show3d.set(!saveData && hasWebGL());

      // Parallax de profundidad: cada tarjeta se mueve distinto según el puntero.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!window.matchMedia('(hover: hover)').matches) return;
      this.zone.runOutsideAngular(() => {
        const cards = Array.from((this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.float'));
        let tx = 0, ty = 0, mx = 0, my = 0, raf = 0;
        const tick = () => {
          mx += (tx - mx) * 0.07;
          my += (ty - my) * 0.07;
          cards.forEach((c, i) => {
            const f = 14 + i * 9;
            c.style.transform = `translate3d(${(mx * -f).toFixed(1)}px, ${(my * -f).toFixed(1)}px, 0) rotateY(${(mx * 10).toFixed(2)}deg) rotateX(${(my * -8).toFixed(2)}deg)`;
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

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
