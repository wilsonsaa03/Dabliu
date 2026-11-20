import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Recorrido completo de la fase 1 contra el backend real (perfil dev).
 * Requiere: ADMIN_EMAIL / ADMIN_PASSWORD (por defecto los del perfil dev) y BACKEND_LOG con la ruta
 * del log del backend (en dev, los enlaces de invitación se escriben ahí porque no hay correo).
 */
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@dabliu.local';
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'dabliu-dev-2026';
const SHOTS = 'e2e/screenshots';
const stamp = Date.now().toString(36);

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Último enlace de invitación escrito en el log del backend para ese correo. */
function invitationLink(email: string): string {
  const log = readFileSync(process.env['BACKEND_LOG']!, 'utf8');
  const matches = [...log.matchAll(new RegExp(`Enlace para ${email.replace(/[.+]/g, '\\$&')}: (\\S+)`, 'g'))];
  if (!matches.length) throw new Error('No se encontró el enlace de invitación en el log');
  return new URL(matches[matches.length - 1]![1]!).pathname + new URL(matches[matches.length - 1]![1]!).search;
}

test.describe.configure({ mode: 'serial' });

test('sin sesión, cualquier ruta privada lleva al login', async ({ page }) => {
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fusuarios/);
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-login.png` });
});

test('credenciales incorrectas muestran un error claro', async ({ page }) => {
  await login(page, ADMIN_EMAIL, 'incorrecta-123');
  await expect(page.getByRole('alert')).toContainText('El correo o la contraseña no son correctos');
});

test('el administrador gestiona una solicitud llegada desde la landing', async ({ page, request }) => {
  // Lo que hace la landing: el formulario público, sin sesión.
  const created = await request.post('/api/v1/diagnostic-requests', {
    data: {
      fullName: `Marta Prueba ${stamp}`, company: 'Taller El Puerto', phone: '3150000000', email: 'marta@ejemplo.co',
      sector: 'AUTOMOTIVE_WORKSHOPS', need: 'Las órdenes de servicio se pierden en papel y no sabemos qué repuestos hay.', dataConsent: true,
    },
  });
  expect(created.status()).toBe(201);

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByText('Solicitudes recibidas')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/02-panel.png`, fullPage: true });

  await page.getByRole('link', { name: 'Solicitudes web' }).click();
  await page.getByRole('row', { name: new RegExp(`Marta Prueba ${stamp}`) }).click();
  const panel = page.getByRole('dialog', { name: `Marta Prueba ${stamp}` });
  await expect(panel).toBeVisible();
  await panel.getByLabel('Estado').selectOption('CONTACTED');
  await panel.getByLabel('Notas internas').fill('Se llamó; agendar demo la próxima semana.');
  await panel.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Solicitud actualizada.')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/03-solicitud.png` });
});

test('invitar, activar y comprobar permisos de un usuario comercial', async ({ page, browser }) => {
  test.skip(!process.env['BACKEND_LOG'], 'Necesita BACKEND_LOG para leer el enlace de invitación');
  const email = `comercial.${stamp}@dabliu.test`;

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await page.getByRole('button', { name: 'Invitar usuario' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invitar usuario' });
  await dialog.getByLabel('Nombre completo').fill('Camila Comercial');
  await dialog.getByLabel('Correo').fill(email);
  await dialog.getByText('Comercial', { exact: true }).click();
  await page.screenshot({ path: `${SHOTS}/04-invitar.png` });
  await dialog.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(page.getByText(`Invitación enviada a ${email}.`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: email })).toContainText('Invitado');
  await page.screenshot({ path: `${SHOTS}/05-usuarios.png` });

  // La persona invitada abre el enlace (otro navegador, sin sesión).
  await expect.poll(() => { try { return invitationLink(email); } catch { return ''; } }, { timeout: 10_000 }).not.toBe('');
  const guest = await browser.newPage();
  await guest.goto(invitationLink(email));
  await expect(guest.getByRole('heading', { name: 'Activa tu cuenta' })).toBeVisible();
  await expect(guest.getByText('Hola, Camila')).toBeVisible();
  await guest.getByLabel('Contraseña', { exact: true }).fill('camila-clave-2026');
  await guest.getByLabel('Confirma la contraseña').fill('camila-clave-2026');
  await guest.screenshot({ path: `${SHOTS}/06-activar.png` });
  await guest.getByRole('button', { name: 'Activar cuenta' }).click();
  await expect(guest.getByText('Tu cuenta quedó activa')).toBeVisible();

  await login(guest, email, 'camila-clave-2026');
  await expect(guest).toHaveURL(/\/panel$/);
  // Su menú no incluye administración…
  await expect(guest.getByRole('link', { name: 'Solicitudes web' })).toBeVisible();
  await expect(guest.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  // …y aunque escriba la dirección, no entra.
  await guest.goto('/usuarios');
  await expect(guest.getByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeVisible();
  // El backend también lo niega (la autoridad real).
  const direct = await guest.request.get('/api/v1/users');
  expect(direct.status()).toBe(403);
  await guest.close();
});

test('perfil: cambiar contraseña y cerrar sesión', async ({ page }) => {
  test.skip(!process.env['BACKEND_LOG'], 'Usa el usuario creado en la prueba anterior');
  const email = `comercial.${stamp}@dabliu.test`;
  await login(page, email, 'camila-clave-2026');
  await expect(page).toHaveURL(/\/panel$/);
  // Recarga completa: la sesión vive en cookies HttpOnly y sobrevive.
  await page.goto('/perfil');
  await page.getByLabel('Contraseña actual').fill('camila-clave-2026');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('camila-nueva-2027');
  await page.getByLabel('Confirma la nueva contraseña').fill('camila-nueva-2027');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByText('Contraseña actualizada')).toBeVisible();
  await expect(page.getByText('Este dispositivo')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-perfil.png`, fullPage: true });

  await page.getByRole('button', { name: /Camila Comercial/ }).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, email, 'camila-nueva-2027');
  await expect(page).toHaveURL(/\/panel$/);
});

test('celular: menú lateral como cajón', async ({ browser }) => {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(mobile, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(mobile).toHaveURL(/\/panel$/);
  const width = await mobile.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await mobile.screenshot({ path: `${SHOTS}/08-celular-panel.png`, fullPage: true });
  await mobile.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(mobile.getByRole('link', { name: 'Usuarios' })).toBeVisible();
  await mobile.waitForTimeout(400); // fin de la animación del cajón
  await mobile.screenshot({ path: `${SHOTS}/09-celular-menu.png` });
  await mobile.close();
});
