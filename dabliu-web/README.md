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
   │  ├─ contact.ts            ← datos de contacto y redes
   │  └─ directives/reveal.directive.ts  ← animación de entrada al hacer scroll
   ├─ shared/scene-3d/
   │  ├─ scene-3d.ts           ← componente que muestra una escena 3D
   │  └─ build-scene.ts        ← construcción de la escena con Three.js
   ├─ layout/
   │  ├─ navbar/               ← menú fijo con efecto vidrio y menú hamburguesa
   │  └─ footer/
   └─ sections/
      ├─ hero/                 ← título principal + objeto 3D
      ├─ problem/              ← problemas que resolvemos
      ├─ services/             ← 7 servicios con efecto 3D al pasar el mouse
      ├─ process/              ← cómo trabajamos (línea con partículas)
      ├─ project/              ← MoviFY
      ├─ technologies/         ← ecosistema de capacidades
      ├─ why/                  ← ¿por qué DABLIU?
      └─ cta/                  ← llamado a la acción con 3D de fondo
public/                        ← logo y favicon
```

Cada sección es un **componente standalone** independiente: puedes moverla, quitarla o reutilizarla sin tocar las demás.

## 5. Decisiones técnicas

- **Three.js se carga de forma diferida** (`import()` dinámico). La página inicial pesa unos 65 kB comprimidos y el 3D se descarga solo cuando hace falta.
- **La animación 3D corre fuera de Angular** (`NgZone.runOutsideAngular`), así cada cuadro no dispara detección de cambios.
- Las escenas **se pausan** cuando no están en pantalla o la pestaña está oculta, y **liberan memoria** al destruirse.
- Se usan **signals** (`signal`, `computed`) para el estado: menú abierto, detalle de MoviFY y nodo activo.
- Si el usuario activó **"reducir movimiento"** en su sistema, las animaciones se desactivan.
- Si el navegador no tiene WebGL, se muestra un brillo de respaldo hecho con CSS.

## 6. Publicar en internet

```bash
npm run build
```

El resultado queda en `dist/dabliu-web/browser`. Esa carpeta se puede subir a **Netlify** (arrastrándola a Netlify Drop) o a **Vercel** conectando el repositorio de GitHub. Las dos opciones tienen plan gratuito.

> Nota: `npm run build` necesita internet, porque incrusta las fuentes de Google en el resultado.
