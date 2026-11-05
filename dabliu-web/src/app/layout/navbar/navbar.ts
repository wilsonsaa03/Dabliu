import { Component, HostListener, inject, signal } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  host: { '[class.is-scrolled]': 'scrolled()' },
})
export class Navbar {
  readonly links = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Sectores', href: '#sectores' },
    { label: 'Proceso', href: '#proceso' },
    { label: 'MoviFY', href: '#proyecto' },
    { label: 'Contacto', href: '#contacto' },
  ];

  /** signal: valor reactivo; al cambiar, Angular actualiza solo lo que lo usa. */
  scrolled = signal(false);
  menuOpen = signal(false);
  readonly themes = inject(ThemeService);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
