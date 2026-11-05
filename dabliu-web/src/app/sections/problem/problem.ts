import { Component } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-problem',
  imports: [RevealDirective],
  templateUrl: './problem.html',
  styleUrl: './problem.scss',
})
export class Problem {
  readonly problems = [
    { title: 'Procesos manuales', text: 'Planillas, cuadernos y tareas que dependen de una sola persona.' },
    { title: 'Información desorganizada', text: 'Datos repartidos en chats, correos y archivos con versiones distintas.' },
    { title: 'Sistemas desconectados', text: 'Herramientas que no se comunican entre sí y obligan a digitar dos veces.' },
    { title: 'Pérdida de tiempo', text: 'Horas semanales en búsquedas, reprocesos y reportes armados a mano.' },
    { title: 'Falta de automatización', text: 'Avisos, cobros y seguimientos que se olvidan porque nadie los dispara.' },
    { title: 'Datos sin aprovechar', text: 'Ventas y clientes registrados que nunca se convierten en decisiones.' },
  ];
}
