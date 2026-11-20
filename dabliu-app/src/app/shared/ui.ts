import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, ChevronLeft, ChevronRight, Inbox, LucideIconData } from 'lucide-angular';

/** Encabezado de página: título, descripción y acciones a la derecha. */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-[22px] font-bold leading-tight sm:text-[24px]">{{ title() }}</h1>
        @if (description()) { <p class="mt-1 max-w-[70ch] text-[13.5px] text-fg-3">{{ description() }}</p> }
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

/** Estado vacío con explicación y, opcionalmente, una acción. */
@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center px-6 py-14 text-center">
      <span class="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-fg-3">
        <lucide-icon [img]="icon() ?? inbox" [size]="22" />
      </span>
      <p class="mt-4 font-display text-[15px] font-bold text-fg">{{ title() }}</p>
      @if (message()) { <p class="mt-1 max-w-[46ch] text-[13.5px] text-fg-3">{{ message() }}</p> }
      <div class="mt-4"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input<LucideIconData>();
  readonly inbox = Inbox;
}

/** Paginación con totales (las páginas empiezan en 0, como en la API). */
@Component({
  selector: 'app-pagination',
  imports: [LucideAngularModule],
  template: `
    @if (total() > 0) {
      <nav class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12.5px] text-fg-3" aria-label="Paginación">
        <span>{{ from() }}–{{ to() }} de {{ total() }}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-ghost btn-icon btn-sm" [disabled]="page() === 0" (click)="pageChange.emit(page() - 1)" aria-label="Página anterior">
            <lucide-icon [img]="prev" [size]="16" />
          </button>
          <span class="px-2">Página {{ page() + 1 }} de {{ pages() }}</span>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" [disabled]="page() + 1 >= pages()" (click)="pageChange.emit(page() + 1)" aria-label="Página siguiente">
            <lucide-icon [img]="next" [size]="16" />
          </button>
        </div>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly from = computed(() => this.page() * this.size() + 1);
  readonly to = computed(() => Math.min(this.total(), (this.page() + 1) * this.size()));
  readonly prev = ChevronLeft;
  readonly next = ChevronRight;
}

/** Filas de esqueleto mientras carga una tabla. */
@Component({
  selector: 'app-table-skeleton',
  template: `
    <div class="space-y-3 p-4" aria-busy="true" aria-label="Cargando">
      @for (r of rowsArray(); track $index) {
        <div class="flex items-center gap-4">
          <div class="skeleton size-8 rounded-full"></div>
          <div class="skeleton h-3.5 flex-1"></div>
          <div class="skeleton hidden h-3.5 w-28 sm:block"></div>
          <div class="skeleton h-5 w-20 rounded-full"></div>
        </div>
      }
    </div>
  `,
})
export class TableSkeleton {
  readonly rows = input(6);
  readonly rowsArray = computed(() => Array.from({ length: this.rows() }));
}

/** Avatar con iniciales. */
@Component({
  selector: 'app-avatar',
  template: `<span class="grid shrink-0 place-items-center rounded-full bg-brand-soft font-display font-bold text-accent"
                   [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.38" aria-hidden="true">{{ initials() }}</span>`,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(32);
  readonly initials = computed(() => this.name().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join(''));
}
