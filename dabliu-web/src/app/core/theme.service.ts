import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_COLOR: Record<Theme, string> = { dark: '#03050C', light: '#F6F8FD' };

/**
 * Tema claro/oscuro.
 * La página siempre entra en oscuro (la identidad de la marca); el botón del
 * navbar cambia a claro solo durante la visita actual, no se guarda.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    });
  }

  toggle(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }
}
