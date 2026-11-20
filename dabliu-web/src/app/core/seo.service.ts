import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Dominio de producción. Si cambia, cámbialo también en index.html, robots.txt y sitemap.xml. */
export const SITE_URL = 'https://dabliu-soluciones.vercel.app';

export interface PageSeo {
  title: string;
  description: string;
  /** Ruta absoluta sin dominio, p. ej. '/' o '/politica-de-datos'. */
  path: string;
}

/**
 * Título, descripción, URL canónica y Open Graph por página.
 * Funciona en el prerender (servidor), así el HTML estático ya sale con los datos correctos.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  set({ title, description, path }: PageSeo): void {
    const url = SITE_URL + path;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });

    let canonical = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }

  /** Agrega o reemplaza un bloque JSON-LD identificado por id. */
  jsonLd(id: string, data: object): void {
    let el = this.doc.getElementById(id);
    if (!el) {
      el = this.doc.createElement('script');
      el.id = id;
      el.setAttribute('type', 'application/ld+json');
      this.doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  removeJsonLd(id: string): void {
    this.doc.getElementById(id)?.remove();
  }
}
