import { Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Gráfico de barras por día en SVG (sin librerías). Interactivo: muestra el valor al pasar
 * el cursor o con el teclado. viewBox fijo: escala sin deformar el texto (los rótulos van en HTML).
 */
@Component({
  selector: 'app-bar-chart',
  imports: [DatePipe],
  template: `
    <div class="relative">
      <div class="flex h-[180px] items-end gap-[3px]" role="list" [attr.aria-label]="label()">
        @for (p of points(); track p.day; let i = $index) {
          <button type="button" role="listitem" class="bar group relative h-full flex-1 cursor-default bg-transparent p-0"
                  [attr.aria-label]="(p.day | date: 'd MMM' : 'UTC') + ': ' + p.total"
                  (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)" (focus)="hover.set(i)" (blur)="hover.set(null)">
            <span class="absolute inset-x-0 bottom-0 rounded-t-[4px] transition-colors"
                  [class.bg-brand]="p.total > 0" [class.bg-surface-2]="p.total === 0"
                  [style.height.%]="p.total === 0 ? 2 : (p.total / max()) * 100"
                  [style.opacity]="hover() === null || hover() === i ? 1 : 0.45"></span>
          </button>
        }
      </div>
      @if (hover() !== null) {
        <div class="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-[var(--shadow-2)]"
             [style.left.%]="((hover()! + 0.5) / points().length) * 100">
          <span class="font-semibold text-fg">{{ points()[hover()!].total }}</span>
          <span class="text-fg-3"> · {{ points()[hover()!].day | date: 'EEE d MMM' : 'UTC' }}</span>
        </div>
      }
      <div class="mt-2 flex justify-between text-[11.5px] text-fg-3">
        <span>{{ points()[0]?.day | date: 'd MMM' : 'UTC' }}</span>
        <span>{{ points()[points().length - 1]?.day | date: 'd MMM' : 'UTC' }}</span>
      </div>
    </div>
  `,
})
export class BarChart {
  readonly points = input.required<{ day: string; total: number }[]>();
  readonly label = input('Gráfico');
  readonly hover = signal<number | null>(null);
  readonly max = computed(() => Math.max(1, ...this.points().map((p) => p.total)));
}
