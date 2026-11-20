import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/**
 * Tema oscuro (predeterminado) o claro. La preferencia se guarda en este navegador
 * (es una comodidad visual, no un dato de la cuenta).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.doc.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark');

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.doc.documentElement.dataset['theme'] = next;
    this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#05070f' : '#f5f7fc');
    try { localStorage.setItem('dabliu-theme', next); } catch { /* almacenamiento bloqueado: solo dura la visita */ }
  }
}
