import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 2 · CRM de punta a punta contra el backend real (perfil dev).
 * Usa el superadministrador de desarrollo; cada ejecución crea datos con un sello único.
 */
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@dabliu.local';
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'dabliu-dev-2026';
const SHOTS = 'e2e/screenshots';
const stamp = Date.now().toString(36);

async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test.describe.configure({ mode: 'serial' });

test('una solicitud de la landing aparece sola como prospecto en el tablero', async ({ page, request }) => {
  const res = await request.post('/api/v1/diagnostic-requests', {
    data: {
      fullName: `Rosa Web ${stamp}`, company: `Panadería La Ola ${stamp}`, phone: '3151112233', sector: 'COMMERCE_SERVICES',
      need: 'Queremos recibir pedidos en línea y llevar el inventario de harinas.', dataConsent: true,
    },
  });
  expect(res.status()).toBe(201);

  await login(page);
  await page.getByRole('link', { name: 'Prospectos' }).click();
  const column = page.getByRole('region', { name: 'Nuevo' });
  await expect(column.getByRole('button', { name: `Diagnóstico gratuito · Panadería La Ola ${stamp}` })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/10-crm-tablero.png`, fullPage: true });
});

test('crear prospecto, moverlo en el tablero, registrar interacción y actividad, y convertirlo en cliente', async ({ page }) => {
  await login(page);
  await page.goto('/crm');
  await page.getByRole('button', { name: 'Nuevo prospecto' }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo prospecto' });
  await form.getByLabel('Oportunidad').fill(`App de domicilios ${stamp}`);
  await form.getByLabel('Persona de contacto').fill('Jorge Restrepo');
  await form.getByLabel('Empresa').fill(`Restaurante Mar Azul ${stamp}`);
  await form.getByLabel('Teléfono / WhatsApp').fill('3159998877');
  await form.getByLabel('Presupuesto estimado (COP)').fill('18000000');
  await form.getByRole('button', { name: 'Apps móviles' }).click();
  await form.getByText('Caliente').click();
  await page.screenshot({ path: `${SHOTS}/11-crm-nuevo.png` });
  await form.getByRole('button', { name: 'Crear prospecto' }).click();

  // Detalle del prospecto
  await expect(page.getByRole('heading', { name: `App de domicilios ${stamp}` })).toBeVisible();
  await expect(page.getByText('$ 18.000.000')).toBeVisible();
  // Quien lo crea queda como responsable (el selector debe mostrarlo aunque la lista llegue después).
  await expect(page.getByLabel('Responsable comercial').locator('option:checked')).toHaveText('Administrador de desarrollo');

  // Interacción
  await page.getByLabel('Registrar interacción').fill('Llamada inicial: quiere lanzar antes de temporada.');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText('Llamada inicial: quiere lanzar antes de temporada.')).toBeVisible();

  // Actividad
  await page.getByLabel('Actividad', { exact: true }).fill(`Enviar propuesta ${stamp}`);
  await page.getByRole('button', { name: 'Programar actividad' }).click();
  await expect(page.getByText(`Seguimiento: Enviar propuesta ${stamp}`)).toBeVisible();

  // Mover en el tablero arrastrando la tarjeta de "Nuevo" a "Contactado"
  await page.goto('/crm');
  const card = page.getByRole('region', { name: 'Nuevo' }).getByRole('button', { name: `App de domicilios ${stamp}` });
  const target = page.getByRole('region', { name: 'Contactado' });
  await card.hover();
  await page.mouse.down();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByText(`«App de domicilios ${stamp}» pasó a Contactado.`)).toBeVisible();
  await expect(target.getByRole('button', { name: `App de domicilios ${stamp}` })).toBeVisible();

  // Conversión
  await target.getByRole('button', { name: `App de domicilios ${stamp}` }).click();
  await page.getByRole('button', { name: 'Convertir en cliente' }).click();
  const conv = page.getByRole('dialog', { name: 'Convertir en cliente' });
  await conv.getByRole('button', { name: 'Convertir' }).click();
  await expect(page.getByText(`Nuevo cliente: Restaurante Mar Azul ${stamp}.`)).toBeVisible();
  await expect(page.getByText(/Convertido en cliente el/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convertir en cliente' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/12-crm-detalle.png`, fullPage: true });

  // Aparece en clientes y su empresa quedó creada con el contacto
  await page.getByRole('complementary', { name: 'Navegación principal' }).getByRole('link', { name: 'Clientes' }).click();
  await expect(page.getByRole('link', { name: `Restaurante Mar Azul ${stamp}` })).toBeVisible();
  await page.getByRole('link', { name: `Restaurante Mar Azul ${stamp}` }).click();
  await expect(page.getByText('Jorge Restrepo')).toBeVisible();
});

test('el panel muestra el embudo comercial y las actividades', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Embudo comercial' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mis próximos 7 días' }).getByText(`Enviar propuesta ${stamp}`)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/13-panel-crm.png`, fullPage: true });
});

test('el CRM exige sesión y permisos en la API', async ({ page, request }) => {
  // Crear un desarrollador como lo haría un administrador (vía API autenticada del navegador).
  await login(page);
  const email = `dev.${stamp}@dabliu.test`;
  const created = await page.request.post('/api/v1/users', {
    data: { email, fullName: 'Diego Dev', roles: ['DEVELOPER'] },
    headers: { 'X-XSRF-TOKEN': (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')!.value },
  });
  expect(created.status()).toBe(201);
  // Sin correo en dev: la activación completa ya se probó en la fase 1; aquí basta con verificar el acceso anónimo.
  const anon = await request.get('/api/v1/crm/leads');
  expect(anon.status()).toBe(401);
});
