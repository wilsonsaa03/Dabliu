import { Component, signal } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-project',
  imports: [RevealDirective],
  templateUrl: './project.html',
  styleUrl: './project.scss',
})
export class Project {
  /** Capacidades visibles para el cliente (sin nombrar lenguajes ni frameworks). */
  readonly capabilities = ['Plataforma web', 'Geolocalización', 'Mapas', 'Roles de usuario', 'Acceso seguro', 'Gestión de servicios'];

  readonly modules = [
    { title: 'Moto', text: 'Transporte de personas' },
    { title: 'Taxi', text: 'Viajes urbanos' },
    { title: 'Domicilios', text: 'Pedidos a la puerta' },
    { title: 'Encomiendas', text: 'Envío de paquetes' },
    { title: 'Usuarios y conductores', text: 'Cada uno con su propio acceso' },
    { title: 'Geolocalización', text: 'Ubicación de servicios en el mapa' },
  ];

  readonly pins = [
    { label: 'Moto', pos: 'left:22%;top:34%', icon: 'M5.5 13.5a3 3 0 100 6 3 3 0 000-6zM18.5 13.5a3 3 0 100 6 3 3 0 000-6zM5.5 16.5L9 10h5l4.5 6.5M9 10L7.5 7H5M14 10l1.5-3h2.5' },
    { label: 'Taxi', pos: 'left:62%;top:24%', icon: 'M4 16v-4l2-5h12l2 5v4zM4 16v2M20 16v2M9 4h6v3M7.5 13h1M15.5 13h1' },
    { label: 'Domicilio', pos: 'left:44%;top:55%', icon: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6' },
    { label: 'Encomienda', pos: 'left:18%;top:68%', icon: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9' },
  ];

  showDetail = signal(false);

  toggleDetail(): void {
    this.showDetail.update((v) => !v);
  }
}
