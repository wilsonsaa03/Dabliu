import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

interface Service {
  title: string;
  text: string;
  extras: string[];
  /** Trazos SVG del icono (atributo d de <path>) */
  icon: string;
}

@Component({
  selector: 'app-services',
  imports: [RevealDirective],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services {
  readonly services: Service[] = [
    { title: 'Software a medida', text: 'Sistemas que se ajustan a cómo opera tu empresa: inventarios, facturación, clientes y operación.', extras: ['A tu medida', 'Escalable'], icon: 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16' },
    { title: 'Aplicaciones móviles', text: 'Apps para Android e iOS conectadas a tu sistema y fáciles de usar desde el primer día.', extras: ['Android', 'iOS'], icon: 'M8.5 2.5h7a2 2 0 012 2v15a2 2 0 01-2 2h-7a2 2 0 01-2-2v-15a2 2 0 012-2zM10.5 18.5h3' },
    { title: 'Soluciones web', text: 'Portales y plataformas rápidas, seguras y que funcionan bien en cualquier pantalla.', extras: ['Responsive', 'SEO'], icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z' },
    { title: 'Automatización', text: 'Menos tareas repetitivas: reportes, avisos y flujos que hoy se hacen a mano.', extras: ['Flujos', 'Alertas'], icon: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1' },
    { title: 'Datos & IA', text: 'Tableros para decidir con cifras y asistentes inteligentes donde aportan valor real.', extras: ['Tableros', 'IA'], icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { title: 'Seguridad digital', text: 'Autenticación, roles y protección de datos desde el diseño del sistema.', extras: ['Accesos', 'Roles'], icon: 'M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM9 10.5h6v5H9zM10 10.5V9a2 2 0 014 0v1.5' },
    { title: 'Cloud & Infraestructura', text: 'Despliegue, respaldos y servidores en la nube sin que tengas que mantenerlos.', extras: ['Respaldos', 'Escalable'], icon: 'M7 18a4.5 4.5 0 01-.6-9 6 6 0 0111.6 1.5A3.8 3.8 0 0117 18zM12 13v5M9.5 15.5L12 13l2.5 2.5' },
  ];

  private readonly canTilt =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Inclina la tarjeta en 3D siguiendo la posición del puntero. */
  tilt(event: PointerEvent, card: HTMLElement): void {
    if (!this.canTilt) return;
    const r = card.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-8px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
  }

  reset(card: HTMLElement): void {
    card.style.transform = '';
  }
}
