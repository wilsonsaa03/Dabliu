import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, effect, inject, input, viewChild } from '@angular/core';
import type { SceneHandle, SceneVariant } from './build-scene';
import { ThemeService } from '../../core/theme.service';

/**
 * Componente reutilizable que dibuja una escena 3D.
 * Uso: <app-scene-3d variant="hero" />  o  <app-scene-3d variant="cta" />
 *
 * Decisiones:
 * - Three.js se importa de forma dinámica: solo se descarga cuando la escena se acerca a la pantalla.
 * - La animación corre FUERA de Angular (runOutsideAngular) para que cada cuadro
 *   no dispare detección de cambios. Así la página va fluida.
 * - Se pausa cuando no está visible y libera memoria al destruirse.
 */
@Component({
  selector: 'app-scene-3d',
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: `
    :host { position: absolute; inset: 0; display: block; }
    canvas { width: 100%; height: 100%; display: block; }
  `,
})
export class Scene3d implements OnDestroy {
  variant = input<SceneVariant>('hero');

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private zone = inject(NgZone);
  private host = inject(ElementRef<HTMLElement>);
  private themes = inject(ThemeService);

  private handle?: SceneHandle;
  private observers: { disconnect(): void }[] = [];
  private cleanup: (() => void)[] = [];
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.zone.runOutsideAngular(() => this.init()));
    // Repinta la escena (si ya existe) cuando cambia el tema
    effect(() => {
      const theme = this.themes.theme();
      this.zone.runOutsideAngular(() => this.handle?.setTheme(theme));
    });
  }

  private init(): void {
    const hostEl = this.host.nativeElement as HTMLElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Carga diferida: espera a que la sección esté cerca de la pantalla
    const lazy = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting) return;
      lazy.disconnect();
      await this.create(hostEl, reduce);
    }, { rootMargin: '300px' });
    lazy.observe(hostEl);
    this.observers.push(lazy);
  }

  private async create(hostEl: HTMLElement, reduce: boolean): Promise<void> {
    let mod: typeof import('./build-scene');
    try {
      mod = await import('./build-scene');
      if (this.destroyed) return;
      this.handle = mod.buildScene(this.canvas().nativeElement, this.variant(), this.themes.theme());
    } catch {
      return; // sin WebGL: el componente padre muestra un brillo de respaldo con CSS
    }
    const handle = this.handle;
    hostEl.classList.add('is-ready');

    const ro = new ResizeObserver(() => handle.resize());
    ro.observe(hostEl);
    this.observers.push(ro);

    if (reduce) {
      handle.renderOnce();
      return;
    }

    const onPointer = (e: PointerEvent) => handle.setPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    window.addEventListener('pointermove', onPointer, { passive: true });
    this.cleanup.push(() => window.removeEventListener('pointermove', onPointer));

    let inView = false;
    const vis = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView && !document.hidden) handle.start(); else handle.stop();
    });
    vis.observe(hostEl);
    this.observers.push(vis);

    const onVisibility = () => (document.hidden || !inView ? handle.stop() : handle.start());
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observers.forEach((o) => o.disconnect());
    this.cleanup.forEach((fn) => fn());
    this.handle?.dispose();
  }
}
