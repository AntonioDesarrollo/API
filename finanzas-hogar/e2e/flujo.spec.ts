import { test, expect, type Page } from '@playwright/test';

const SHOTS = 'e2e/screenshots';

async function onboarding(page: Page) {
  await page.goto('/');
  await page.getByTestId('onb-start').click();
  await page.getByTestId('member-name-0').fill('Antonio');
  await page.getByTestId('member-income-0').fill('32000');
  await page.getByTestId('member-name-1').fill('Fernanda');
  await page.getByTestId('member-income-1').fill('18000');
  await page.getByText('+ Agregar integrante').click();
  await page.getByTestId('member-name-2').fill('Leo');
  await page.getByTestId('member-age-2').fill('4');
  await page.screenshot({ path: `${SHOTS}/01-onboarding-familia.png` });
  await page.getByTestId('onb-next').click();
  // Gastos fijos
  const fields = page.locator('.row-field input');
  await fields.nth(0).fill('9500'); // renta
  await fields.nth(1).fill('600'); // luz
  await fields.nth(4).fill('549'); // internet
  await fields.nth(6).fill('6000'); // súper
  await fields.nth(9).fill('400'); // streaming
  await page.getByTestId('onb-next').click();
  await page.screenshot({ path: `${SHOTS}/02-onboarding-reparto.png` });
  await page.getByTestId('onb-finish').click();
  await expect(page.getByTestId('home-balance')).toBeVisible();
}

test('flujo completo: familia, tarjeta Nu, gasto, pago y plan', async ({ page }) => {
  await onboarding(page);
  await page.screenshot({ path: `${SHOTS}/03-inicio-vacio.png`, fullPage: false });

  // Ingreso de nómina
  await page.getByTestId('home-add-income').click();
  await page.getByTestId('income-amount').fill('16000');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByTestId('home-balance')).toContainText('16,000');

  // Tarjeta Nu
  await page.getByTestId('tab-tarjetas').click();
  await page.getByTestId('cards-add').click();
  await page.getByTestId('issuer-nu').click();
  await expect(page.locator('.cc.full .cc-logo')).toHaveText('nu');
  await page.getByTestId('card-nickname').fill('Nu Antonio');
  await page.getByTestId('card-limit').fill('25000');
  await page.getByTestId('card-used').fill('4200');
  await page.getByTestId('card-cut').fill('20');
  await page.getByTestId('card-pay').fill('10');
  await page.screenshot({ path: `${SHOTS}/04-nueva-tarjeta-nu.png` });
  await page.getByTestId('card-save-btn').click();
  await expect(page.locator('.cc.full')).toHaveCount(1);

  // Segunda tarjeta BBVA para comparar colores
  await page.locator('.nav-btn[aria-label="Agregar tarjeta"]').click();
  await page.getByTestId('issuer-bbva').click();
  await page.getByTestId('card-limit').fill('40000');
  await page.getByTestId('card-used').fill('12000');
  await page.getByTestId('card-save-btn').click();
  await expect(page.locator('.cc.full')).toHaveCount(2);
  await page.screenshot({ path: `${SHOTS}/05-tarjetas.png` });

  // Detalle Nu: compra a meses y pago
  await page.locator('.cc.full').first().click();
  await expect(page.getByText('Pago para no generar intereses')).toBeVisible();
  await page.getByText('+ Agregar').click();
  await page.getByTestId('plan-desc').fill('Pantalla 55"');
  await page.getByTestId('plan-total').fill('12000');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Pantalla 55"')).toBeVisible();
  // usado ahora 4200 + 12000 = 16200
  await expect(page.locator('.card .num.bold').first()).toContainText('16,200');
  await page.screenshot({ path: `${SHOTS}/06-detalle-tarjeta.png`, fullPage: false });

  await page.getByTestId('card-pay').click();
  await page.getByTestId('pay-amount').fill('5200');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.card .num.bold').first()).toContainText('11,000');

  // Gasto con tarjeta desde el detalle
  await page.getByTestId('card-add-expense').click();
  await page.getByTestId('expense-amount').fill('850');
  await page.getByTestId('expense-category').selectOption('super');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.card .num.bold').first()).toContainText('11,850');

  // Regresar a la lista (la barra de pestañas se oculta en pantallas de detalle)
  await page.getByRole('button', { name: 'Atrás' }).click();
  await expect(page.locator('.cc.full')).toHaveCount(2);

  // Deuda
  await page.getByTestId('tab-deudas').click();
  await page.locator('.nav-btn[aria-label="Agregar deuda"]').click();
  await page.getByTestId('debt-name').fill('Crédito auto');
  await page.getByTestId('debt-principal').fill('180000');
  await page.getByTestId('debt-balance').fill('120000');
  await page.locator('input[type="number"]').first().fill('14'); // tasa
  await page.getByTestId('debt-monthly').fill('5200');
  await page.getByTestId('debt-save').click();
  await expect(page.getByTestId('debt-total')).toContainText('143,850');
  await page.screenshot({ path: `${SHOTS}/07-deudas.png` });

  // Plan
  await page.getByTestId('tab-plan').click();
  await expect(page.getByText('Cuánto aporta cada quien')).toBeVisible();
  await expect(page.getByText('Antonio').first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/08-plan.png` });

  // Movimientos
  await page.getByTestId('tab-movimientos').click();
  await expect(page.getByTestId('expense-row')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/09-movimientos.png` });

  // Inicio final
  await page.getByTestId('tab-inicio').click();
  await page.screenshot({ path: `${SHOTS}/10-inicio.png` });
  // Balance: 16000 ingreso - 5200 pago tarjeta = 10800 (el gasto fue con tarjeta)
  await expect(page.getByTestId('home-balance')).toContainText('10,800');

  // Persistencia tras recargar
  await page.reload();
  await expect(page.getByTestId('home-balance')).toContainText('10,800');
});

test('modo oscuro y ajustes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await onboarding(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `${SHOTS}/11-inicio-oscuro.png` });
  await page.locator('.nav-btn[aria-label="Ajustes"]').click();
  await expect(page.getByText('Respaldar y restaurar')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-ajustes-oscuro.png` });
  await page.getByText('Claro').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
