import { Component, ElementRef, Injectable, effect, inject, signal, viewChild } from '@angular/core';
import { LucideAngularModule, TriangleAlert } from 'lucide-angular';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

/** Confirmación antes de acciones irreversibles o sensibles. Devuelve una promesa con la decisión. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.current.set({ ...options, resolve }));
  }

  close(ok: boolean) {
    this.current()?.resolve(ok);
    this.current.set(null);
  }
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule],
  template: `
    <dialog #dialog class="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-2)] backdrop:bg-[var(--overlay)]"
            (cancel)="$event.preventDefault(); confirm.close(false)" aria-labelledby="confirm-title">
      @if (confirm.current(); as c) {
        <div class="flex gap-4 p-6">
          @if (c.danger) {
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><lucide-icon [img]="warn" [size]="20" /></span>
          }
          <div>
            <h2 id="confirm-title" class="text-[16px] font-bold">{{ c.title }}</h2>
            <p class="mt-2 text-[13.5px] text-fg-2">{{ c.message }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
          <button type="button" class="btn btn-secondary" (click)="confirm.close(false)">Cancelar</button>
          <button type="button" class="btn" [class.btn-danger]="c.danger" [class.btn-primary]="!c.danger" (click)="confirm.close(true)">
            {{ c.confirmLabel ?? 'Confirmar' }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly confirm = inject(ConfirmService);
  readonly warn = TriangleAlert;
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.confirm.current()) { if (!el.open) el.showModal(); } else if (el.open) el.close();
    });
  }
}
