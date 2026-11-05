import { Component, inject } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SurfaceDirective } from '../../core/directives/surface.directive';
import { LeadIntentService } from '../../core/lead-intent.service';
import type { Sector } from '../../core/diagnostic.service';
import { ICONS } from '../../shared/icons';

interface SectorCard {
  sector: Sector;
  art: 'transport' | 'commerce' | 'auto' | 'other';
  title: string;
  problem: string;
  builds: string[];
  icon: string;
  cta: string;
  proof?: { label: string; href: string };
}

/**
 * Sectores: problema típico, lo que construimos y una llamada a la acción
 * que deja preseleccionado el sector en el formulario.
 */
@Component({
  selector: 'app-sectors',
  imports: [RevealDirective, SurfaceDirective],
  templateUrl: './sectors.html',
  styleUrl: './sectors.scss',
})
export class Sectors {
  private intent = inject(LeadIntentService);

  readonly arrowRight = ICONS.arrowRight;

  /** Nodos de la ilustración "otros sectores". */
  readonly nodes = [{ x: 60, y: 60 }, { x: 120, y: 30 }, { x: 120, y: 90 }, { x: 180, y: 60 }];

  readonly sectors: SectorCard[] = [
    {
      sector: 'TRANSPORT_LOGISTICS', art: 'transport',
      title: 'Transporte y logística',
      problem: 'Servicios que se piden por WhatsApp, conductores asignados a mano y nadie sabe dónde va cada pedido.',
      builds: ['Solicitud de servicios', 'Asignación de conductores', 'Seguimiento en mapa', 'Domicilios y envíos'],
      icon: ICONS.truck,
      cta: 'Quiero organizar mi operación',
      proof: { label: 'Ver cómo lo aplicamos en MoviFY', href: '#proyecto' },
    },
    {
      sector: 'COMMERCE_SERVICES', art: 'commerce',
      title: 'Comercio y servicios',
      problem: 'Inventario, ventas y clientes repartidos entre cuadernos, Excel y chats. Cuesta saber cuánto se vende y qué falta.',
      builds: ['Inventario y ventas', 'Pedidos en línea', 'Base de clientes', 'Reportes automáticos'],
      icon: ICONS.store,
      cta: 'Quiero controlar mi negocio',
    },
    {
      sector: 'AUTOMOTIVE_WORKSHOPS', art: 'auto',
      title: 'Automotriz y talleres',
      problem: 'Órdenes de servicio en papel, repuestos sin control y clientes que llaman para saber cómo va su vehículo.',
      builds: ['Órdenes de trabajo', 'Historial por vehículo', 'Control de repuestos', 'Avisos al cliente'],
      icon: ICONS.wrench,
      cta: 'Quiero digitalizar mi taller',
    },
    {
      sector: 'OTHER', art: 'other',
      title: 'Otros sectores',
      problem: 'Educación, salud, turismo, servicios profesionales… Si tu operación depende de procesos manuales, podemos ayudarte.',
      builds: ['Sistemas a medida', 'Portales de clientes', 'Agendamiento', 'Integraciones'],
      icon: ICONS.building,
      cta: 'Cuéntanos tu caso',
    },
  ];

  choose(sector: Sector): void {
    this.intent.choose(sector);
  }
}
