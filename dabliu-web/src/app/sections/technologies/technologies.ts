import { Component, computed, signal } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

interface Node {
  name: string;
  text: string;
  x: number; // posición en % dentro del ecosistema
  y: number;
  icon: string;
  hub?: boolean;
}

/**
 * Ecosistema de capacidades: nodos conectados con líneas luminosas.
 * Habla de lo que el cliente obtiene, no de lenguajes ni frameworks.
 */
@Component({
  selector: 'app-technologies',
  imports: [RevealDirective],
  templateUrl: './technologies.html',
  styleUrl: './technologies.scss',
})
export class Technologies {
  readonly nodes: Node[] = [
    { name: 'DABLIU', text: 'Un solo equipo que diseña, conecta y mantiene cada pieza según el problema de tu negocio.', x: 50, y: 46, icon: '', hub: true },
    { name: 'Web', text: 'Plataformas y portales que funcionan en cualquier navegador y pantalla.', x: 18, y: 22, icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z' },
    { name: 'Móvil', text: 'Aplicaciones para Android e iOS conectadas a tu sistema.', x: 36, y: 14, icon: 'M8.5 2.5h7a2 2 0 012 2v15a2 2 0 01-2 2h-7a2 2 0 01-2-2v-15a2 2 0 012-2zM10.5 18.5h3' },
    { name: 'Integraciones', text: 'Conectamos tus sistemas entre sí y con servicios externos para no digitar dos veces.', x: 64, y: 14, icon: 'M9 7H6a4 4 0 000 8h3M15 7h3a4 4 0 010 8h-3M8 11h8' },
    { name: 'Bases de datos', text: 'Información ordenada, consistente y lista para consultar.', x: 82, y: 24, icon: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6' },
    { name: 'Seguridad', text: 'Accesos por roles, autenticación y protección de la información.', x: 12, y: 56, icon: 'M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM9 12l2 2 4-4' },
    { name: 'Automatización', text: 'Procesos que corren solos: avisos, reportes y tareas repetitivas.', x: 88, y: 58, icon: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1' },
    { name: 'Datos e IA', text: 'Tableros para decidir con cifras y asistentes inteligentes donde aportan valor.', x: 26, y: 82, icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { name: 'Calidad', text: 'Pruebas y control de versiones para que cada cambio sea seguro.', x: 46, y: 88, icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9' },
    { name: 'Nube', text: 'Despliegue, respaldos y servidores que crecen con tu negocio.', x: 66, y: 84, icon: 'M7 18a4.5 4.5 0 01-.6-9 6 6 0 0111.6 1.5A3.8 3.8 0 0117 18z' },
    { name: 'Soporte', text: 'Acompañamiento después del lanzamiento y mejoras continuas.', x: 84, y: 82, icon: 'M4 14v-2a8 8 0 0116 0v2M4 14a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zM20 14a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2zM17 16v1a3 3 0 01-3 3h-2' },
  ];

  /** Pares de nodos unidos por una línea (índices del arreglo nodes). */
  readonly links: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10],
    [1, 2], [2, 3], [3, 4], [1, 5], [4, 6], [5, 7], [7, 8], [8, 9], [9, 10], [6, 10],
  ];

  active = signal(0);
  current = computed(() => this.nodes[this.active()]);

  select(i: number): void {
    this.active.set(i);
  }

  isLinkOn(link: [number, number]): boolean {
    return link[0] === this.active() || link[1] === this.active();
  }
}
