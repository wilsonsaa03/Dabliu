import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

interface SectorCard {
  title: string;
  problem: string;
  builds: string[];
  /** Trazos SVG del icono (atributo d de <path>) */
  icon: string;
  proof?: { label: string; href: string };
}

@Component({
  selector: 'app-sectors',
  imports: [RevealDirective],
  templateUrl: './sectors.html',
  styleUrl: './sectors.scss',
})
export class Sectors {
  readonly sectors: SectorCard[] = [
    {
      title: 'Transporte y logística',
      problem: 'Servicios que se piden por WhatsApp, conductores asignados a mano y nadie sabe dónde va cada pedido.',
      builds: ['Solicitud de servicios', 'Asignación de conductores', 'Seguimiento en mapa', 'Domicilios y envíos'],
      icon: 'M3 16.5V7a1 1 0 011-1h10v10.5M14 9.5h3.5L21 13v3.5h-2M3 16.5h2M9 16.5h5M7 18.5a2 2 0 100-4 2 2 0 000 4zM17 18.5a2 2 0 100-4 2 2 0 000 4z',
      proof: { label: 'Lo aplicamos en MoviFY', href: '#proyecto' },
    },
    {
      title: 'Comercio y servicios',
      problem: 'Inventario, ventas y clientes repartidos entre cuadernos, Excel y chats. Cuesta saber cuánto se vende y qué falta.',
      builds: ['Inventario y ventas', 'Pedidos en línea', 'Base de clientes', 'Reportes automáticos'],
      icon: 'M4 9.5l1.5-5h13L20 9.5M4 9.5h16M4 9.5v10h16v-10M9.5 19.5v-5h5v5M4 9.5a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0',
    },
    {
      title: 'Automotriz y talleres',
      problem: 'Órdenes de servicio en papel, repuestos sin control y clientes que llaman para saber cómo va su vehículo.',
      builds: ['Órdenes de trabajo', 'Historial por vehículo', 'Control de repuestos', 'Avisos al cliente'],
      icon: 'M14.7 6.3a4 4 0 00-5.4 5.1L3.5 17.2a1.8 1.8 0 002.5 2.5l5.8-5.8a4 4 0 005.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
    },
  ];
}
