import { Injectable, signal } from '@angular/core';
import type { Sector } from './diagnostic.service';

/**
 * Recuerda desde dónde llega el visitante al formulario (p. ej. la tarjeta de un sector)
 * para dejar ese sector ya marcado y ahorrarle un paso.
 */
@Injectable({ providedIn: 'root' })
export class LeadIntentService {
  readonly sector = signal<Sector | null>(null);

  choose(sector: Sector): void {
    this.sector.set(sector);
  }
}
