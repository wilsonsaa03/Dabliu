import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Raíz: solo muestra la página de la ruta actual (ver app.routes.ts). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
