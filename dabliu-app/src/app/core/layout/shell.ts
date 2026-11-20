import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { LucideAngularModule, LogOut, Menu, Moon, Sun, UserRound, X, ChevronsUpDown } from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme.service';
import { NAVIGATION } from './navigation';
import { Avatar } from '../../shared/ui';

/** Estructura de la aplicación privada: barra lateral, barra superior en celular y contenido. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, Avatar],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private router = inject(Router);

  readonly icons = { LogOut, Menu, Moon, Sun, UserRound, X, ChevronsUpDown };
  readonly drawerOpen = signal(false);
  readonly menuOpen = signal(false);

  /** Menú filtrado por permisos; los grupos vacíos no se muestran. */
  readonly nav = computed(() => NAVIGATION
    .map((g) => ({ ...g, items: g.items.filter((i) => this.auth.can(i.permission)) }))
    .filter((g) => g.items.length > 0));

  readonly roleLabel = computed(() => {
    const roles = this.auth.user()?.roles ?? [];
    const names: Record<string, string> = {
      SUPER_ADMIN: 'Superadministrador', ADMIN: 'Administrador', COMERCIAL: 'Comercial',
      PROJECT_MANAGER: 'Gerente de proyecto', DEVELOPER: 'Desarrollador', CLIENT: 'Cliente',
    };
    return roles.map((r) => names[r] ?? r).join(' · ');
  });

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.drawerOpen.set(false);
      this.menuOpen.set(false);
    });
  }

  @HostListener('document:keydown.escape')
  closeAll() {
    this.drawerOpen.set(false);
    this.menuOpen.set(false);
  }
}
