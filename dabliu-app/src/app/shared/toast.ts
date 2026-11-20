import { Component, Injectable, inject, signal } from '@angular/core';
import { LucideAngularModule, CircleCheck, CircleAlert, Info, X } from 'lucide-angular';

export type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }

/** Avisos breves en la esquina (confirmaciones y errores de operaciones). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  success(message: string) { this.push('success', message); }
  error(message: string) { this.push('error', message, 7000); }
  info(message: string) { this.push('info', message); }

  dismiss(id: number) { this.toasts.update((list) => list.filter((t) => t.id !== id)); }

  private push(kind: ToastKind, message: string, ms = 4500) {
    const id = ++this.seq;
    this.toasts.update((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), ms);
  }
}

@Component({
  selector: 'app-toasts',
  imports: [LucideAngularModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="card flex items-start gap-3 px-4 py-3 shadow-[var(--shadow-2)]" style="animation: pop-in .25s var(--ease-snappy) both">
          <lucide-icon [img]="t.kind === 'success' ? icons.ok : t.kind === 'error' ? icons.err : icons.info" [size]="18"
            [class]="t.kind === 'success' ? 'mt-0.5 shrink-0 text-ok' : t.kind === 'error' ? 'mt-0.5 shrink-0 text-danger' : 'mt-0.5 shrink-0 text-info'" />
          <p class="flex-1 text-[13.5px] text-fg">{{ t.message }}</p>
          <button type="button" class="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1" (click)="toasts.dismiss(t.id)" aria-label="Cerrar aviso">
            <lucide-icon [img]="icons.close" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  readonly toasts = inject(ToastService);
  readonly icons = { ok: CircleCheck, err: CircleAlert, info: Info, close: X };
}
