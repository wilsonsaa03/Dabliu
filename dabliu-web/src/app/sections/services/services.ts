import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SurfaceDirective } from '../../core/directives/surface.directive';
import { ICONS } from '../../shared/icons';

interface Service {
  title: string;
  text: string;
  icon: string;
}

/**
 * Ocho líneas de servicio, cada una con una descripción orientada al beneficio.
 * Los íconos (SVG de trazo) se dibujan al aparecer y reaccionan al cursor.
 */
@Component({
  selector: 'app-services',
  imports: [RevealDirective, SurfaceDirective],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services {
  readonly arrow = ICONS.arrowRight;

  readonly services: Service[] = [
    { title: 'Software a medida', text: 'Un sistema hecho para cómo opera tu empresa, no al revés.', icon: ICONS.code },
    { title: 'Apps móviles', text: 'Tu negocio en el celular de tus clientes y de tu equipo.', icon: ICONS.phone },
    { title: 'Soluciones web', text: 'Páginas y plataformas que venden y atienden las 24 horas.', icon: ICONS.globe },
    { title: 'Automatización', text: 'Avisos, reportes y tareas repetitivas que se hacen solas.', icon: ICONS.flow },
    { title: 'Datos e IA', text: 'Tableros claros e inteligencia artificial donde aporte valor real.', icon: ICONS.brain },
    { title: 'Seguridad digital', text: 'Accesos por roles, autenticación y protección de tu información.', icon: ICONS.shield },
    { title: 'Cloud e infraestructura', text: 'Tu sistema en la nube, con respaldos y sin servidores que mantener.', icon: ICONS.cloud },
    { title: 'Integraciones', text: 'Conectamos las herramientas que ya usas para no digitar dos veces.', icon: ICONS.plug },
  ];
}
