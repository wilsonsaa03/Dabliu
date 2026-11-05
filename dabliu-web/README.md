# DABLIU Soluciones · Landing page

Landing page oficial de DABLIU, hecha en **Angular 20** con escenas 3D en **Three.js**.

## 1. Requisitos

- **Node.js 20.19 o superior** (recomendado Node 22 LTS). Revisa tu versión con `node -v`.
- Visual Studio Code.

## 2. Abrir y ejecutar

1. Descomprime `dabliu-web.zip`.
2. En VS Code: **Archivo → Abrir carpeta…** y elige la carpeta `dabliu-web`.
3. Abre la terminal (**Terminal → Nueva terminal**) y ejecuta:

```bash
npm install
npm start
```

`npm install` descarga las dependencias (solo la primera vez, tarda un par de minutos).
`npm start` levanta el servidor y abre la página en `http://localhost:4200`. Los cambios que guardes se ven al instante.

Para detenerlo: `Ctrl + C` en la terminal.

## 3. Lo primero que debes cambiar

Abre **`src/app/core/contact.ts`** y pon tu número de WhatsApp, tu correo y los enlaces de tus redes. Se actualizan en toda la página.

## 4. Estructura del proyecto

```
src/
├─ index.html                  ← título, descripción SEO, fuentes
├─ styles.scss                 ← colores (tokens), botones y estilos compartidos
└─ app/
   ├─ app.ts                   ← componente raíz: ordena las secciones
   ├─ core/
   │  ├─ contact.ts            ← WhatsApp, correo, redes, NIT y fundador
   │  ├─ api.ts                ← URL de la API (sale de src/environments/)
   │  ├─ diagnostic.service.ts ← envío del formulario a la API
   │  ├─ lead-intent.service.ts← recuerda el sector elegido para el formulario
   │  └─ directives/reveal.directive.ts  ← animación de entrada al hacer scroll
   ├─ shared/
   │  ├─ icons.ts              ← trazos SVG compartidos
   │  └─ scene-3d/             ← escena 3D del hero (Three.js, carga diferida)
   ├─ layout/
   │  ├─ navbar/               ← menú fijo y menú hamburguesa
   │  ├─ whatsapp-fab/         ← botón flotante de WhatsApp
   │  └─ footer/
   └─ sections/
      ├─ hero/                 ← propuesta de valor + 3D (solo en escritorio)
      ├─ sectors/              ← "¿Te pasa esto?": problemas por sector
      ├─ services/             ← 3 líneas de servicio
      ├─ project/              ← caso de estudio MoviFY
      ├─ process/              ← cómo trabajamos
      ├─ offer/                ← franja del diagnóstico gratuito
      ├─ about/                ← Nosotros
      ├─ faq/                  ← preguntas frecuentes
      └─ cta/                  ← formulario de diagnóstico
src/environments/              ← URL de la API en desarrollo y producción
public/                        ← logo, favicon, robots.txt y politica-de-datos.html
```

Cada sección es un **componente standalone** independiente: puedes moverla, quitarla o reutilizarla sin tocar las demás.

## 5. Decisiones técnicas

- **Three.js se carga de forma diferida** (`import()` dinámico) y **solo en escritorio**. En celular o con ahorro de datos se muestra un brillo en CSS. La página inicial pesa unos 87 kB comprimidos.
- **La animación 3D corre fuera de Angular** (`NgZone.runOutsideAngular`), así cada cuadro no dispara detección de cambios.
- Las escenas **se pausan** cuando no están en pantalla o la pestaña está oculta, y **liberan memoria** al destruirse.
- Se usan **signals** para el estado: menú abierto, sector elegido y estado del formulario.
- Si el usuario activó **"reducir movimiento"** en su sistema, las animaciones se desactivan.
- Si el navegador no tiene WebGL, se muestra un brillo de respaldo hecho con CSS.

## 6. Publicar en internet

```bash
npm run build
```

Antes de publicar, pon la URL de la API en `src/environments/environment.ts`. El resultado queda en `dist/dabliu-web/browser`. Esa carpeta se puede subir a **Netlify** (arrastrándola a Netlify Drop) o a **Vercel** conectando el repositorio de GitHub. Las dos opciones tienen plan gratuito.

> Nota: `npm run build` necesita internet, porque incrusta las fuentes de Google en el resultado.
