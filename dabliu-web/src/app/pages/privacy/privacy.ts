import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, ArrowLeft, ArrowUp, Building2, CalendarClock, Check, Clock, Database, ListChecks, Lock,
  Mail, MapPin, MessageCircle, Moon, RefreshCw, Scale, ScrollText, ShieldCheck, Sun, Target, UserCheck,
} from 'lucide-angular';
import { Footer } from '../../layout/footer/footer';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { ThemeService } from '../../core/theme.service';
import { CONTACT } from '../../core/contact';
import { SITE_URL, SeoService } from '../../core/seo.service';

/**
 * Política de tratamiento de datos personales (ruta /politica-de-datos).
 * El texto legal vive en privacy.html, sin cambios respecto al documento original.
 * Aquí solo están los títulos de las ocho secciones (iguales a los del documento),
 * el índice con la sección activa y los datos para buscadores.
 */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink, NgTemplateOutlet, LucideAngularModule, Footer, RevealDirective],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class PrivacyPage {
  readonly themes = inject(ThemeService);
  readonly contact = CONTACT;
  readonly icons = { ArrowLeft, ArrowUp, CalendarClock, Check, Clock, ListChecks, Mail, MapPin, MessageCircle, Moon, ScrollText, ShieldCheck, Sun };

  /** title = título exacto del documento; short = etiqueta corta para el índice. */
  readonly sections = [
    { id: 'responsable', title: 'Responsable del tratamiento', short: 'Responsable', icon: Building2 },
    { id: 'marco-legal', title: 'Marco legal', short: 'Marco legal', icon: Scale },
    { id: 'datos', title: 'Datos que recolectamos', short: 'Datos que recolectamos', icon: Database },
    { id: 'finalidades', title: 'Finalidades', short: 'Finalidades', icon: Target },
    { id: 'derechos', title: 'Tus derechos', short: 'Tus derechos', icon: UserCheck },
    { id: 'ejercer-derechos', title: 'Cómo ejercer tus derechos', short: 'Ejercer tus derechos', icon: Mail },
    { id: 'seguridad', title: 'Seguridad y conservación', short: 'Seguridad y conservación', icon: Lock },
    { id: 'cambios', title: 'Cambios a esta política', short: 'Cambios a la política', icon: RefreshCw },
  ];

  /** Sección que se está leyendo (resaltada en el índice). */
  readonly active = signal(this.sections[0].id);

  private chips = viewChild<ElementRef<HTMLElement>>('chips');

  constructor() {
    const seo = inject(SeoService);
    seo.set({
      title: 'Política de tratamiento de datos personales | DABLIU Soluciones',
      description: 'Política de tratamiento de datos personales de DABLIU SOLUCIONES, conforme a la Ley 1581 de 2012.',
      path: '/politica-de-datos',
    });
    seo.jsonLd('ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Política de tratamiento de datos personales', item: `${SITE_URL}/politica-de-datos` },
      ],
    });

    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => seo.removeJsonLd('ld-breadcrumb'));

    const host = inject(ElementRef<HTMLElement>);
    afterNextRender(() => {
      const els = this.sections
        .map((s) => (host.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${s.id}`))
        .filter((el): el is HTMLElement => !!el);
      if (!els.length) return;

      // Sección activa = la última cuyo inicio ya pasó la línea de lectura (un poco debajo del
      // encabezado fijo). Se calcula a lo sumo una vez por cuadro.
      let raf = 0;
      const update = () => {
        raf = 0;
        const line = Math.min(window.innerHeight * 0.35, 260);
        let current = els[0].id;
        for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
        // Al final de la página, la última sección queda activa aunque no alcance la línea.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = els[els.length - 1].id;
        if (current !== this.active()) this.active.set(current);
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    });

    // En celular, la ficha activa se desliza a la vista dentro de su fila (sin mover la página).
    effect(() => {
      const id = this.active();
      const row = this.chips()?.nativeElement;
      const chip = row?.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (!row || !chip || typeof window === 'undefined') return;
      const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    });
  }
}
