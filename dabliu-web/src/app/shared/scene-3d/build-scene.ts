/**
 * Construcción de las escenas 3D con Three.js.
 * Este archivo es TypeScript puro (no es un componente): recibe el canvas
 * y devuelve funciones para iniciar, pausar y liberar memoria.
 * Se carga de forma diferida (import dinámico) para no pesar en la carga inicial.
 */
import * as THREE from 'three';
import type { Theme } from '../../core/theme.service';

export type SceneVariant = 'hero' | 'cta';

export interface SceneHandle {
  start(): void;
  stop(): void;
  renderOnce(): void;
  setPointer(x: number, y: number): void;
  setTheme(theme: Theme): void;
  resize(): void;
  dispose(): void;
}

interface OrbitCube { mesh: THREE.Mesh; r: number; a: number; y: number; s: number; }

const CYAN = 0x45dcff;
const BLUE = 0x2b6bff;

/** Colores que cambian con el tema. Sobre fondo claro, los tonos pálidos se oscurecen para seguir viéndose. */
const PALETTES = {
  dark: { line: CYAN, particle: 0xa8ecff, node: 0xbff3ff, link: 0x5fb0ff, knotLine: 0x3a8bff, knot: 0x08164a, knotGlow: 0x0a2a80 },
  light: { line: 0x0a8fd6, particle: 0x2b6bff, node: 0x1d5bff, link: 0x2b6bff, knotLine: 0x2b6bff, knot: 0xc9d8ff, knotGlow: 0x000000 },
} satisfies Record<Theme, Record<string, number>>;

type Role = keyof typeof PALETTES.dark;
/** Registra un material para repintarlo al cambiar de tema. */
type Tint = <M extends THREE.Material & { color: THREE.Color }>(mat: M, role: Role, glow?: Role) => M;

export function buildScene(canvas: HTMLCanvasElement, variant: SceneVariant, theme: Theme): SceneHandle {
  const host = canvas.parentElement as HTMLElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(variant === 'hero' ? 38 : 45, 1, 0.1, 100);
  camera.position.set(0, 0, variant === 'hero' ? 9.5 : 11);

  const root = new THREE.Group();
  scene.add(root);

  const tinted: { mat: THREE.Material & { color: THREE.Color; emissive?: THREE.Color }; role: Role; glow?: Role }[] = [];
  const tint: Tint = (mat, role, glow) => {
    tinted.push({ mat, role, glow });
    return mat;
  };

  // Iluminación: ambiente + dos luces de color que orbitan (iluminación dinámica)
  const ambient = new THREE.AmbientLight(0x2a4aa0, 0.55);
  scene.add(ambient);
  const lightBlue = new THREE.PointLight(BLUE, 2.6, 40);
  const lightCyan = new THREE.PointLight(CYAN, 2.0, 40);
  const key = new THREE.DirectionalLight(0xbfe6ff, 0.6);
  key.position.set(-3, 5, 6);
  scene.add(lightBlue, lightCyan, key);

  const rings: { mesh: THREE.Mesh; speed: number }[] = [];
  const cubes: OrbitCube[] = [];

  if (variant === 'hero') buildHero(root, scene, rings, cubes, tint);
  else buildCta(root, tint);

  // Partículas que suben lentamente
  const count = variant === 'hero' ? 520 : 700;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    speeds[i] = 0.08 + Math.random() * 0.2;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(particleGeo, tint(new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.75, depthWrite: false }), 'particle')));

  function paint(next: Theme): void {
    const palette = PALETTES[next];
    for (const { mat, role, glow } of tinted) {
      mat.color.setHex(palette[role]);
      if (glow) mat.emissive?.setHex(palette[glow]);
    }
    ambient.color.setHex(next === 'dark' ? 0x2a4aa0 : 0xdde7ff);
    ambient.intensity = next === 'dark' ? 0.55 : 1.4;
  }
  paint(theme);

  // Estado de animación
  let running = false;
  let frameId = 0;
  let t = 0;
  let mx = 0, my = 0, tx = 0, ty = 0;
  const clock = new THREE.Clock();

  function resize(): void {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const scale = variant === 'hero' ? Math.min(1, w / 520) : Math.min(1.2, w / 900);
    root.scale.setScalar(Math.max(0.62, scale));
  }

  function step(dt: number): void {
    t += dt;
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;

    // Rotación muy lenta + flotación + parallax con el puntero
    root.rotation.y = t * (variant === 'hero' ? 0.09 : 0.05) + mx * 0.6;
    root.rotation.x = (variant === 'hero' ? 0.18 : 0.35) + Math.sin(t * 0.25) * 0.06 + my * 0.35;
    root.position.y = Math.sin(t * 0.55) * 0.14;

    lightBlue.position.set(Math.cos(t * 0.35) * 6, 2.5, Math.sin(t * 0.35) * 6);
    lightCyan.position.set(Math.cos(t * 0.35 + Math.PI) * 5, -2, Math.sin(t * 0.35 + Math.PI) * 5);

    for (const ring of rings) ring.mesh.rotation.z += ring.speed * dt;
    for (const c of cubes) {
      c.a += c.s * dt;
      c.mesh.position.set(Math.cos(c.a) * c.r, c.y + Math.sin(t * 0.6 + c.a) * 0.25, Math.sin(c.a) * c.r * 0.6);
      c.mesh.rotation.x += dt * 0.25;
      c.mesh.rotation.y += dt * 0.3;
    }

    const p = particleGeo.attributes['position'].array as Float32Array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speeds[i] * dt * 0.35;
      if (p[i * 3 + 1] > 5) p[i * 3 + 1] = -5;
    }
    particleGeo.attributes['position'].needsUpdate = true;

    camera.position.x += (mx * 0.9 - camera.position.x) * 0.05;
    camera.position.y += (-my * 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
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
      step(0);
      renderer.render(scene, camera);
    },
    setPointer(x: number, y: number) {
      tx = x;
      ty = y;
    },
    setTheme(next: Theme) {
      paint(next);
      if (!running) renderer.render(scene, camera);
    },
    resize,
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh;
        o.geometry?.dispose();
        const m = o.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
      renderer.dispose();
    },
  };
}

/** Objeto principal del hero: núcleo, cápsula de cristal, red de nodos, anillos y cubos. */
function buildHero(root: THREE.Group, scene: THREE.Scene, rings: { mesh: THREE.Mesh; speed: number }[], cubes: OrbitCube[], tint: Tint): void {
  root.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.MeshStandardMaterial({ color: 0x0b1d52, metalness: 0.9, roughness: 0.22, emissive: 0x0b2f8f, emissiveIntensity: 0.45, flatShading: true }),
  ));
  root.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.75, 1),
    new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.1, flatShading: true }),
  ));
  root.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.76, 1)),
    tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 }), 'line'),
  ));

  // Nodos distribuidos en una esfera (espiral de Fibonacci) y conexiones entre vecinos
  const N = 34, R = 2.75;
  const points: THREE.Vector3[] = [];
  const nodeGeo = new THREE.SphereGeometry(0.045, 10, 10);
  const nodeMat = tint(new THREE.MeshBasicMaterial(), 'node');
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996;
    const p = new THREE.Vector3(Math.cos(th) * r * R, y * R * 0.92, Math.sin(th) * r * R);
    points.push(p);
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(p);
    root.add(node);
  }
  const links: number[] = [];
  for (let a = 0; a < N; a++) {
    for (let b = a + 1; b < N; b++) {
      if (points[a].distanceTo(points[b]) < 1.55) links.push(points[a].x, points[a].y, points[a].z, points[b].x, points[b].y, points[b].z);
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(links, 3));
  root.add(new THREE.LineSegments(linkGeo, tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 }), 'link')));

  const spokes: number[] = [];
  for (let i = 0; i < N; i += 4) spokes.push(0, 0, 0, points[i].x, points[i].y, points[i].z);
  const spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(spokes, 3));
  root.add(new THREE.LineSegments(spokeGeo, tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12 }), 'line')));

  // Anillos orbitales
  const ringDefs: [number, number, number, number][] = [[3.25, 1.25, 0.2, 0.21], [3.6, -0.5, 1.1, -0.15]];
  for (const [radius, rx, ry, speed] of ringDefs) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 8, 220), tint(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 }), 'line'));
    ring.rotation.set(rx, ry, 0);
    root.add(ring);
    rings.push({ mesh: ring, speed });
  }

  // Cubos tecnológicos flotando en órbita
  for (let i = 0; i < 6; i++) {
    const size = 0.22 + Math.random() * 0.2;
    const geo = new THREE.BoxGeometry(size, size, size);
    const cube = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.6, roughness: 0.15, emissive: 0x1236a8, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }));
    cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 }), 'node')));
    scene.add(cube);
    cubes.push({ mesh: cube, r: 3.3 + Math.random() * 0.9, a: (i / 6) * Math.PI * 2, y: (Math.random() - 0.5) * 2.4, s: 0.05 + Math.random() * 0.05 });
  }
}

/** Objeto de fondo de la sección de contacto: nudo toroidal. */
function buildCta(root: THREE.Group, tint: Tint): void {
  root.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.TorusKnotGeometry(2.6, 0.62, 180, 14, 2, 3), 18),
    tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 }), 'knotLine'),
  ));
  root.add(new THREE.Mesh(
    new THREE.TorusKnotGeometry(2.6, 0.5, 160, 16, 2, 3),
    tint(new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 }), 'knot', 'knotGlow'),
  ));
}
