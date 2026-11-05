import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, signal } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  host: {
    '[class.is-scrolled]': 'scrolled()',
    '(document:keydown.escape)': 'closeMenu()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Navbar {
  readonly links = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Sectores', href: '#sectores' },
    { label: 'MoviFY', href: '#proyecto' },
    { label: 'Proceso', href: '#proceso' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Contacto', href: '#contacto' },
  ];

  /** signal: valor reactivo; al cambiar, Angular actualiza solo lo que lo usa. */
  scrolled = signal(false);
  menuOpen = signal(false);
  /** Enlace de la sección que se está viendo (resaltado en el menú). */
  active = signal<string | null>(null);
  readonly themes = inject(ThemeService);
  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      zone.runOutsideAngular(() => {
        // Apariencia al hacer scroll: solo se actualiza la señal cuando cambia de estado.
        const onScroll = () => {
          const value = window.scrollY > 24;
          if (value !== this.scrolled()) zone.run(() => this.scrolled.set(value));
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

        // Sección activa: la que cruza la franja central de la pantalla.
        const sections = this.links
          .map((l) => document.querySelector<HTMLElement>(l.href))
          .filter((s): s is HTMLElement => !!s);
        if (!('IntersectionObserver' in window) || !sections.length) return;
        const spy = new IntersectionObserver((entries) => {
          // Primero las salidas y luego las entradas: si llegan juntas, gana la sección que entra.
          let next = this.active();
          for (const e of entries) if (!e.isIntersecting && next === `#${e.target.id}`) next = null;
          for (const e of entries) if (e.isIntersecting) next = `#${e.target.id}`;
          if (next !== this.active()) zone.run(() => this.active.set(next));
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach((s) => spy.observe(s));
        destroyRef.onDestroy(() => spy.disconnect());
      });
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Cierra el menú móvil al tocar fuera del encabezado. */
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !(this.el.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.closeMenu();
    }
  }
}
