import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const logbookFile = `${import.meta.dirname}/fixtures/logbook.txt`;

/** Scans the whole page with axe, colour contrast included. */
async function expectNoAccessibilityProblems(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}

// The only end-to-end test (ADR 0006): the main flow, against the built app on one port.
// The accessibility checks sit inside it as steps, so there is still one flow and one test.
test('choose a vehicle, upload a logbook and see the result', async ({
  page,
}) => {
  await test.step('the form loads, and its accessibility tree and axe scan are clean', async () => {
    await page.goto('/');
    await expect(page.getByLabel('Make')).toBeEnabled();

    await expect(page.locator('main')).toMatchAriaSnapshot(`
      - main:
        - heading "Vehicle logbook" [level=1]
        - region "Quick select":
          - list:
            - listitem:
              - button "Ford Ranger Raptor"
            - listitem:
              - button "Tesla Model 3 Long Range"
        - form "Choose a vehicle":
          - combobox "Make"
          - combobox "Model" [disabled]
          - combobox "Badge" [disabled]
          - region "Upload your logbook":
            - button "Upload logbook" [disabled]
    `);
    await expectNoAccessibilityProblems(page);
  });

  await test.step('the dropdowns cascade', async () => {
    await page.getByLabel('Make').selectOption({ label: 'Ford' });
    await page.getByLabel('Model').selectOption('Ranger');
    await page.getByLabel('Badge').selectOption('Raptor');
    await page.getByLabel('Logbook file').setInputFiles(logbookFile);
    await expect(
      page.getByRole('button', { name: 'Upload logbook' }),
    ).toBeEnabled();
  });

  await test.step('the upload reaches the server and the result shows what came back', async () => {
    await page.getByRole('button', { name: 'Upload logbook' }).click();

    await expect(page).toHaveURL('/result');
    const heading = page.getByRole('heading', {
      name: 'Your logbook',
      exact: true,
    });
    await expect(heading).toBeFocused();
    await expect(
      page.getByRole('region', { name: 'Logbook', exact: true }),
    ).toContainText('Front brake pads replaced');
    await expect(page.locator('main')).toMatchAriaSnapshot(`
      - main:
        - heading "Vehicle logbook" [level=1]
        - region "Your logbook":
          - heading "Your logbook" [level=2]
          - term: Make
          - definition: Ford
          - term: Model
          - definition: Ranger
          - term: Badge
          - definition: Raptor
          - heading "Logbook" [level=3]
          - region "Logbook": /.*Front brake pads replaced.*/
          - paragraph:
            - link "Back to the form":
              - /url: /
    `);
    await expectNoAccessibilityProblems(page);
  });

  await test.step('Back returns to the form with the choices kept', async () => {
    await page.goBack();
    await expect(page.getByLabel('Make')).toHaveValue('ford');
    await expect(page.getByLabel('Model')).toHaveValue('Ranger');
    await expect(page.getByLabel('Badge')).toHaveValue('Raptor');
  });

  await test.step('a refresh on the result page returns to the form', async () => {
    await page.goto('/result');
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('form', { name: 'Choose a vehicle' }),
    ).toBeVisible();
  });
});
