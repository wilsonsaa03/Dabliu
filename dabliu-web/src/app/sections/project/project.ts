import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { LeadIntentService } from '../../core/lead-intent.service';
import { ICONS } from '../../shared/icons';

interface Feature {
  id: string;
  title: string;
  text: string;
  tech: string[];
  icon: string;
}

/**
 * Caso de estudio MoviFY.
 * Regla: solo datos reales. La animación es una ILUSTRACIÓN del concepto (está rotulada así);
 * no se muestran cifras, usuarios ni estados como si la plataforma estuviera en operación.
 */
@Component({
  selector: 'app-project',
  imports: [RevealDirective],
  templateUrl: './project.html',
  styleUrl: './project.scss',
})
export class Project {
  private intent = inject(LeadIntentService);

  readonly arrow = ICONS.arrowRight;
  readonly icons = ICONS;

  /** Lo que contempla la plataforma (sin cifras ni estados de operación). */
  readonly checks = ['Transporte en moto y taxi', 'Domicilios y encomiendas', 'Ubicación de servicios en el mapa', 'Accesos separados para usuarios y conductores'];

  /** Luces de ciudad del fondo: [x, y, radio]. Posiciones fijas para que el dibujo no cambie entre cargas. */
  readonly lights: [number, number, number][] = Array.from({ length: 46 }, (_, i) => {
    const x = 430 + ((i * 53) % 360);
    const y = 250 + ((i * 37) % 70) - (x - 430) * 0.12;
    return [x, Math.round(y), 1 + (i % 3) * 0.6];
  });

  /** Funcionalidades que contempla el diseño (en desarrollo). */
  readonly features: Feature[] = [
    {
      id: 'roles', title: 'Usuarios y conductores', icon: ICONS.users,
      text: 'Cada tipo de usuario tiene su propio acceso y sus propias pantallas: quien pide el servicio y quien lo presta.',
      tech: ['Spring Security', 'JWT'],
    },
    {
      id: 'gestion', title: 'Gestión de servicios', icon: ICONS.list,
      text: 'Las solicitudes de transporte, domicilios y encomiendas se registran en la plataforma para hacerles seguimiento.',
      tech: ['API REST', 'PostgreSQL'],
    },
    {
      id: 'mapa', title: 'Geolocalización y mapas', icon: ICONS.pin,
      text: 'Los servicios se ubican en el mapa para saber dónde se piden y hacia dónde van.',
      tech: ['Leaflet'],
    },
    {
      id: 'seguridad', title: 'Acceso seguro', icon: ICONS.lock,
      text: 'Autenticación y permisos por rol para proteger la información de usuarios y conductores.',
      tech: ['Spring Security', 'JWT'],
    },
  ];

  /** Stack real de MoviFY: es la prueba técnica para quien la necesite. */
  readonly stack = ['Angular', 'Spring Boot (Java)', 'PostgreSQL', 'Spring Security + JWT', 'API REST', 'Leaflet'];

  /** Opciones de la ilustración; se recorren solas mientras la sección está en pantalla. */
  readonly options = [
    { label: 'Moto', icon: ICONS.moto },
    { label: 'Taxi', icon: ICONS.taxi },
    { label: 'Domicilios', icon: ICONS.home },
    { label: 'Encomiendas', icon: ICONS.box },
  ];
  readonly optionIndex = signal(0);
  readonly currentOption = computed(() => this.options[this.optionIndex()]);

  readonly activeFeature = signal(0);
  readonly feature = computed(() => this.features[this.activeFeature()]);

  /** false si el usuario pidió "reducir movimiento": no se monta el vehículo animado. */
  readonly motionOk = signal(false);

  private stage = viewChild<ElementRef<HTMLElement>>('stage');

  constructor() {
    const destroyRef = inject(DestroyRef);
    const zone = inject(NgZone);
    afterNextRender(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.motionOk.set(!reduce);
      const el = this.stage()?.nativeElement;
      if (reduce || !el || !('IntersectionObserver' in window)) return;

      let timer = 0;
      const io = new IntersectionObserver(([entry]) => {
        clearInterval(timer);
        if (entry.isIntersecting) {
          timer = window.setInterval(() => this.optionIndex.update((i) => (i + 1) % this.options.length), 2600);
        }
      });
      io.observe(el);
      destroyRef.onDestroy(() => { io.disconnect(); clearInterval(timer); });

      // Inclinación 3D con el cursor (solo mouse). Corre fuera de Angular.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      zone.runOutsideAngular(() => {
        let raf = 0, x = 0, y = 0;
        const paint = () => {
          raf = 0;
          el.style.setProperty('--px', x.toFixed(3));
          el.style.setProperty('--py', y.toFixed(3));
        };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          x = (e.clientX - r.left) / r.width - 0.5;
          y = (e.clientY - r.top) / r.height - 0.5;
          if (!raf) raf = requestAnimationFrame(paint);
        };
        const onLeave = () => { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(paint); };
        el.addEventListener('pointermove', onMove, { passive: true });
        el.addEventListener('pointerleave', onLeave);
        destroyRef.onDestroy(() => {
          cancelAnimationFrame(raf);
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      });
    });
  }

  selectFeature(i: number): void {
    this.activeFeature.set(i);
  }

  /** Navegación con flechas entre pestañas (patrón ARIA de tabs). */
  onTabKey(event: KeyboardEvent): void {
    const n = this.features.length;
    let next = this.activeFeature();
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (next + 1) % n;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (next - 1 + n) % n;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = n - 1;
    else return;
    event.preventDefault();
    this.activeFeature.set(next);
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  chooseTransport(): void {
    this.intent.choose('TRANSPORT_LOGISTICS');
  }
}
