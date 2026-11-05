/**
 * Escena 3D del hero con Three.js.
 * TypeScript puro (no es un componente): recibe el canvas y devuelve funciones
 * para iniciar, pausar y liberar memoria. Se carga con import dinámico.
 *
 * Composición: un portátil que se abre al cargar y muestra el logo ORIGINAL de DABLIU
 * en su pantalla (la imagen se dibuja tal cual, sin redibujar ni deformar el símbolo),
 * cintas de luz que fluyen, objetos tecnológicos flotando (datos, nube, IA, código)
 * y partículas. La cámara sigue suavemente al puntero y se aleja al hacer scroll.
 */
import * as THREE from 'three';
import type { Theme } from '../../core/theme.service';

export type SceneVariant = 'hero';

export interface SceneHandle {
  start(): void;
  stop(): void;
  renderOnce(): void;
  setPointer(x: number, y: number): void;
  /** 0 = hero arriba del todo, 1 = hero fuera de pantalla. */
  setScroll(p: number): void;
  setTheme(theme: Theme): void;
  resize(): void;
  dispose(): void;
}

const CYAN = 0x45dcff;
const BLUE = 0x2b6bff;

/** Colores que cambian con el tema (sobre fondo claro los tonos pálidos se oscurecen). */
const PALETTES = {
  dark: { line: CYAN, particle: 0xa8ecff, ribbon: CYAN, ribbon2: 0x3d7bff, glow: 0x2b6bff },
  light: { line: 0x0a8fd6, particle: 0x2b6bff, ribbon: 0x1d6fe0, ribbon2: 0x2b6bff, glow: 0x6f9dff },
} satisfies Record<Theme, Record<string, number>>;
type Role = keyof typeof PALETTES.dark;

interface Floater { obj: THREE.Object3D; base: THREE.Vector3; phase: number; spin: number; }

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function buildScene(canvas: HTMLCanvasElement, _variant: SceneVariant, theme: Theme): SceneHandle {
  const host = canvas.parentElement as HTMLElement;
  const small = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const target = new THREE.Vector3(0.1, 1.05, 0);
  let camDist = 8.2;

  const root = new THREE.Group();
  scene.add(root);

  const textures: THREE.Texture[] = [];
  const tinted: { mat: THREE.Material & { color: THREE.Color }; role: Role }[] = [];
  const tint = <M extends THREE.Material & { color: THREE.Color }>(mat: M, role: Role): M => {
    tinted.push({ mat, role });
    return mat;
  };

  // ---------- Iluminación ----------
  const ambient = new THREE.AmbientLight(0x3050b0, 0.6);
  const key = new THREE.DirectionalLight(0xcfe8ff, 1.1);
  key.position.set(-4, 6, 5);
  const rimBlue = new THREE.PointLight(BLUE, 30, 18, 2);
  const rimCyan = new THREE.PointLight(CYAN, 18, 16, 2);
  const screenLight = new THREE.PointLight(0x3d8bff, 0, 7, 2);
  screenLight.position.set(0, 1.2, 0.9);
  scene.add(ambient, key, rimBlue, rimCyan, screenLight);

  // ---------- Portátil ----------
  const laptop = new THREE.Group();
  laptop.rotation.y = -0.42;
  root.add(laptop);

  const W = 3.2, D = 2.1, T = 0.1;
  const shell = new THREE.MeshStandardMaterial({ color: 0x141b30, metalness: 0.85, roughness: 0.32 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), shell);
  base.position.y = T / 2;
  laptop.add(base);
  laptop.add(edges(base, 0.35));

  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.16, D - 0.16), new THREE.MeshStandardMaterial({ map: keyboardTexture(), metalness: 0.6, roughness: 0.5 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = T + 0.002;
  laptop.add(deck);

  // Tapa: gira sobre la bisagra (borde trasero). 0 = vertical, PI/2 = cerrada.
  const lid = new THREE.Group();
  lid.position.set(0, T, -D / 2 + 0.03);
  laptop.add(lid);
  const LH = 2.05;
  const lidBack = new THREE.Mesh(new THREE.BoxGeometry(W, LH, 0.06), shell);
  lidBack.position.set(0, LH / 2, 0);
  lid.add(lidBack);
  lid.add(edges(lidBack, 0.45));

  const screenTex = screenTexture(() => { if (!running) renderer.render(scene, camera); });
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex.texture, color: 0x000000 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.18, LH - 0.18), screenMat);
  screen.position.set(0, LH / 2, 0.031);
  lid.add(screen);

  // Halo de luz bajo el portátil
  const glowMat = tint(new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), 'glow');
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.4), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.02;
  root.add(glow);

  // ---------- Cintas de luz que fluyen ----------
  const flowTex = flowTexture();
  const ribbons: THREE.MeshBasicMaterial[] = [];
  const ribbonDefs: { pts: [number, number, number][]; r: number; role: Role; speed: number }[] = [
    { pts: [[-7, -0.4, 1.5], [-3, 0.1, 2.4], [0, -0.2, 2.6], [3, 0.4, 1.6], [7, 1.6, -1]], r: 0.018, role: 'ribbon', speed: 0.16 },
    { pts: [[-7, 0.6, -2.5], [-3.5, -0.1, 0.8], [0.5, 0.05, 2.1], [4, -0.3, 1.2], [7.5, 0.2, -0.5]], r: 0.01, role: 'ribbon2', speed: 0.22 },
    { pts: [[-6, 2.8, -3], [-2.5, 2.2, -2.2], [1.5, 2.9, -2.6], [6, 2.1, -1.5]], r: 0.008, role: 'ribbon', speed: 0.12 },
  ];
  for (const def of ribbonDefs) {
    const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const map = flowTex.clone();
    map.needsUpdate = true;
    textures.push(map);
    const mat = tint(new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }), def.role);
    mat.userData['speed'] = def.speed;
    ribbons.push(mat);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, small ? 90 : 160, def.r, 8, false), mat));
  }

  // ---------- Objetos tecnológicos flotantes ----------
  const floaters: Floater[] = [];
  const glass = () => new THREE.MeshPhysicalMaterial({ color: 0x1d4fd8, metalness: 0.2, roughness: 0.08, transmission: 0.6, transparent: true, opacity: 0.7, emissive: 0x0b2f8f, emissiveIntensity: 0.6, thickness: 0.4 });
  const lineMat = () => tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 }), 'line');

  // Base de datos: tres discos apilados
  const db = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 40);
    const m = new THREE.Mesh(g, glass());
    m.position.y = i * 0.21;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), lineMat()));
    db.add(m);
  }
  addFloater(db, new THREE.Vector3(-2.75, 1.7, -0.6), 0.4);

  // Nube: esferas fusionadas
  const cloud = new THREE.Group();
  const cloudMat = glass();
  for (const [x, y, r] of [[-0.3, 0, 0.26], [0, 0.12, 0.34], [0.32, 0, 0.24], [0.1, -0.08, 0.26]] as const) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), cloudMat);
    s.position.set(x, y, 0);
    cloud.add(s);
  }
  addFloater(cloud, new THREE.Vector3(2.7, 2.9, -1.2), 0.25);

  // Núcleo de IA: icosaedro facetado con aristas luminosas
  const aiGeo = new THREE.IcosahedronGeometry(0.36, 0);
  const ai = new THREE.Mesh(aiGeo, new THREE.MeshStandardMaterial({ color: 0x0b1d52, metalness: 0.9, roughness: 0.2, emissive: 0x1442c8, emissiveIntensity: 0.7, flatShading: true }));
  ai.add(new THREE.LineSegments(new THREE.EdgesGeometry(aiGeo), lineMat()));
  addFloater(ai, new THREE.Vector3(2.55, 0.85, 1.1), 0.6);

  // Cubo de "código"
  const cubeGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const cube = new THREE.Mesh(cubeGeo, glass());
  cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeo), lineMat()));
  addFloater(cube, new THREE.Vector3(-2.3, 0.55, 1.4), 0.5);

  function addFloater(obj: THREE.Object3D, pos: THREE.Vector3, spin: number): void {
    obj.position.copy(pos);
    obj.scale.setScalar(0.001);
    root.add(obj);
    floaters.push({ obj, base: pos.clone(), phase: Math.random() * Math.PI * 2, spin });
  }

  // ---------- Partículas ----------
  const count = small ? 140 : 300;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 6 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 9;
    speeds[i] = 0.06 + Math.random() * 0.18;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(particleGeo, tint(new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }), 'particle')));

  function paint(next: Theme): void {
    const palette = PALETTES[next];
    for (const { mat, role } of tinted) mat.color.setHex(palette[role]);
    ambient.color.setHex(next === 'dark' ? 0x3050b0 : 0xdde7ff);
    ambient.intensity = next === 'dark' ? 0.6 : 1.6;
  }
  paint(theme);

  // ---------- Estado de animación ----------
  let running = false;
  let frameId = 0;
  let t = 0;
  let mx = 0, my = 0, tx = 0, ty = 0;
  let scroll = 0, scrollT = 0;
  const clock = new THREE.Clock();

  function resize(): void {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // En pantallas estrechas la cámara retrocede para que todo quepa (nada queda cortado)
    camDist = 8.2 / Math.min(1, camera.aspect / 1.25);
  }

  /** Secuencia de entrada: la tapa se abre, la pantalla se enciende y aparecen los objetos. */
  function intro(time: number): void {
    const open = easeInOut(clamp01((time - 0.25) / 1.7));
    lid.rotation.x = Math.PI / 2 * (1 - open) - 0.26 * open;
    const on = easeOut(clamp01((time - 1.3) / 0.9));
    screenMat.color.setScalar(on);
    screenLight.intensity = on * 9;
    floaters.forEach((f, i) => f.obj.scale.setScalar(Math.max(0.001, easeOut(clamp01((time - 1.6 - i * 0.15) / 0.8)))));
    for (const m of ribbons) m.opacity = 0.95 * easeOut(clamp01((time - 0.6) / 1.4));
  }

  function step(dt: number): void {
    t += dt;
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;
    scroll += (scrollT - scroll) * 0.08;
    intro(t);

    root.rotation.y = mx * 0.32;
    root.position.y = Math.sin(t * 0.5) * 0.05 - scroll * 0.6;

    rimBlue.position.set(Math.cos(t * 0.3) * 5, 3, Math.sin(t * 0.3) * 4);
    rimCyan.position.set(Math.cos(t * 0.3 + Math.PI) * 4.5, 1, Math.sin(t * 0.3 + Math.PI) * 4 + 1);

    for (const m of ribbons) (m.map as THREE.Texture).offset.x -= dt * (m.userData['speed'] as number);
    for (const f of floaters) {
      f.obj.position.set(f.base.x, f.base.y + Math.sin(t * 0.8 + f.phase) * 0.16, f.base.z);
      f.obj.rotation.y += dt * f.spin;
      f.obj.rotation.x = Math.sin(t * 0.4 + f.phase) * 0.25;
    }

    const p = particleGeo.attributes['position'].array as Float32Array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speeds[i] * dt * 0.3;
      if (p[i * 3 + 1] > 5) p[i * 3 + 1] = -1;
    }
    particleGeo.attributes['position'].needsUpdate = true;

    // Cámara: órbita leve con el puntero; al hacer scroll se eleva y se aleja (transición al resto de la página)
    const d = camDist * (1 + scroll * 0.35);
    camera.position.set(mx * 1.1, 2.3 - my * 0.7 + scroll * 1.8, d);
    camera.lookAt(target.x, target.y + scroll * 0.2, target.z);
  }

  function loop(): void {
    if (!running) return;
    step(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(loop);
  }

  resize();

  return {
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      frameId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
    },
    renderOnce() {
      t = 10; // estado final, sin animación (reducir movimiento)
      step(0);
      renderer.render(scene, camera);
    },
    setPointer(x: number, y: number) {
      tx = x;
      ty = y;
    },
    setScroll(v: number) {
      scrollT = clamp01(v);
    },
    setTheme(next: Theme) {
      paint(next);
      if (!running) renderer.render(scene, camera);
    },
    resize() {
      resize();
      if (!running) renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      screenTex.cancel();
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh;
        o.geometry?.dispose();
        const m = o.material as THREE.Material | THREE.Material[] | undefined;
        const list = Array.isArray(m) ? m : m ? [m] : [];
        for (const mat of list) {
          (mat as THREE.MeshBasicMaterial).map?.dispose();
          mat.dispose();
        }
      });
      textures.forEach((x) => x.dispose());
      flowTex.dispose();
      renderer.dispose();
    },
  };
}

/* ---------------- Utilidades ---------------- */

function edges(mesh: THREE.Mesh, opacity: number): THREE.LineSegments {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity }));
  l.position.copy(mesh.position);
  return l;
}

function canvasTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Pantalla del portátil: fondo azul profundo + logo original + nombre.
 * El PNG del logo tiene fondo negro; se dibuja con mezcla "lighter" para que el negro
 * desaparezca sobre el fondo y el símbolo conserve su forma, color y proporción.
 */
function screenTexture(onReady: () => void): { texture: THREE.CanvasTexture; cancel(): void } {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 640;
  const ctx = c.getContext('2d')!;
  // Centro negro puro (igual al fondo del PNG) para que el logo conserve sus colores exactos;
  // hacia los bordes, azul profundo.
  const bg = ctx.createRadialGradient(512, 230, 0, 512, 260, 620);
  bg.addColorStop(0, '#000000');
  bg.addColorStop(0.45, '#000000');
  bg.addColorStop(0.75, '#061440');
  bg.addColorStop(1, '#0b2470');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 640);
  // líneas sutiles de interfaz
  const texture = canvasTexture(c);

  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (cancelled) return;
    // Tamaño máximo con proporción intacta (contain)
    const maxW = 420, maxH = 312;
    const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    // Se dibuja tal cual (source-over): su fondo negro se funde con el centro negro de la pantalla.
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 512 - w / 2, 70, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 92px Sora, "Segoe UI", sans-serif';
    ctx.shadowColor = 'rgba(43,107,255,0.9)';
    ctx.shadowBlur = 24;
    ctx.fillText('DABLIU', 512, 480);
    ctx.fillStyle = '#7fd9ff';
    ctx.font = '600 34px Sora, "Segoe UI", sans-serif';
    ctx.letterSpacing = '14px';
    ctx.fillText('SOLUCIONES', 519, 535);
    texture.needsUpdate = true;
    onReady();
  };
  img.src = 'logo-dabliu.png';
  return { texture, cancel: () => { cancelled = true; } };
}

function keyboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 340;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1226';
  ctx.fillRect(0, 0, 512, 340);
  ctx.fillStyle = '#060a18';
  const cols = 14, rows = 5, kw = 30, kh = 26, gap = 4, x0 = (512 - (cols * (kw + gap) - gap)) / 2, y0 = 24;
  ctx.strokeStyle = 'rgba(69,170,255,0.35)';
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      ctx.fillRect(x0 + k * (kw + gap), y0 + r * (kh + gap), kw, kh);
      ctx.strokeRect(x0 + k * (kw + gap) + 0.5, y0 + r * (kh + gap) + 0.5, kw - 1, kh - 1);
    }
  }
  ctx.strokeStyle = 'rgba(69,170,255,0.3)';
  ctx.strokeRect(186, 200, 140, 110);
  return canvasTexture(c);
}

function radialTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return canvasTexture(c);
}

/** Degradado con un destello que, al desplazar el offset, "viaja" a lo largo de la cinta. */
function flowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 4;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.3)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 4);
  const tex = canvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = 1.5;
  return tex;
}
