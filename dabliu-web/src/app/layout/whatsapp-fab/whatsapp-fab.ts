import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { CONTACT } from '../../core/contact';
import { WHATSAPP_ICON } from '../../shared/icons';

/**
 * Botón flotante de WhatsApp (el canal de contacto más usado en Colombia).
 * Se oculta en el hero y en la sección de contacto, donde ya hay botones visibles,
 * para no tapar el formulario en celular.
 */
@Component({
  selector: 'app-whatsapp-fab',
  template: `
    <a class="fab" [class.is-hidden]="hidden()" [attr.tabindex]="hidden() ? -1 : null" [attr.aria-hidden]="hidden() ? 'true' : null"
       [href]="contact.whatsappChatUrl" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icon"/></svg>
      <span>WhatsApp</span>
    </a>
  `,
  styles: `
    :host { position: fixed; z-index: 40; right: max(16px, env(safe-area-inset-right, 0px)); bottom: max(16px, env(safe-area-inset-bottom, 0px)); }
    .fab {
      display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 18px 0 14px; border-radius: 999px;
      background: var(--wa); color: var(--wa-fg); font-weight: 700; font-size: 15px; text-decoration: none;
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.5);
      transition: transform 0.25s, opacity 0.25s;
    }
    .fab:hover { transform: translateY(-2px); }
    .fab svg { width: 24px; height: 24px; }
    .is-hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }
    @media (max-width: 560px) { .fab span { display: none; } .fab { padding: 0 14px; } }
  `,
})
export class WhatsappFab {
  readonly contact = CONTACT;
  readonly icon = WHATSAPP_ICON;
  readonly hidden = signal(true);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const targets = ['inicio', 'contacto'].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
      if (!targets.length || !('IntersectionObserver' in window)) {
        this.hidden.set(false);
        return;
      }
      const visible = new Set<Element>();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
        this.hidden.set(visible.size > 0);
      }, { threshold: 0.15 });
      targets.forEach((t) => io.observe(t));
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
