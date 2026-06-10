import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

type SurveyState = 'survey' | 'queue' | 'timeout' | 'error';

type VirtualUser = {
  context: BrowserContext;
  durationMs: number;
  error?: string;
  page: Page;
  pageErrors: string[];
  responseStatus: number | null;
  state: SurveyState;
  submitted: boolean;
  userNumber: number;
};

const QUEUE_THRESHOLD_USERS = 30;
const TEST_COMMENT = 'esto es una prueba';
const DEFAULT_USER_STEPS = [10, 20, 30];
const READY_TIMEOUT_MS = Number(process.env.STRESS_READY_TIMEOUT_MS ?? 45_000);
const USER_STEPS = parseUserSteps(process.env.STRESS_USER_STEPS) ?? DEFAULT_USER_STEPS;

test.describe.configure({ mode: 'serial' });

for (const userCount of USER_STEPS) {
  const shouldQueue = userCount >= QUEUE_THRESHOLD_USERS;
  const title = `encuesta genera ${userCount} respuestas aleatorias en Vercel`;

  test(title, async ({ browser }) => {
    test.setTimeout(Math.max(120_000, userCount * 5_000));

    const users: VirtualUser[] = [];

    try {
      const openedUsers = await Promise.all(
        Array.from({ length: userCount }, (_, index) => openSurveyUser(browser, index + 1)),
      );
      users.push(...openedUsers);

      await settleAndRefreshUserStates(users, shouldQueue ? 10_000 : 2_000);

      const unstableUsers = users.filter(user => user.state === 'timeout' || user.state === 'error');
      const badResponses = users.filter(user => user.responseStatus !== null && user.responseStatus >= 400);
      const usersWithPageErrors = users.filter(user => user.pageErrors.length > 0);
      const queueUsers = users.filter(user => user.state === 'queue');
      const surveyUsers = users.filter(user => user.state === 'survey');

      printScenarioSummary(userCount, users);

      expect(unstableUsers, buildFailureMessage('Usuarios sin estado estable', unstableUsers)).toEqual([]);
      expect(badResponses, buildFailureMessage('Usuarios con respuesta HTTP fallida', badResponses)).toEqual([]);
      expect(usersWithPageErrors, buildFailureMessage('Usuarios con errores de JavaScript', usersWithPageErrors)).toEqual([]);

      if (shouldQueue && queueUsers.length === 0) {
        console.warn(`stress:${userCount} no se mostró cola en Vercel al llegar a ${QUEUE_THRESHOLD_USERS} usuarios.`);
      }

      await Promise.all(surveyUsers.map(user => submitRandomSurvey(user)));

      for (const queueUser of queueUsers) {
        await expect(queueUser.page.getByTestId('queue-alert')).toContainText(/Te encuentras en cola/i);
      }

      const submittedUsers = users.filter(user => user.submitted);
      printSubmissionSummary(userCount, submittedUsers.length, queueUsers.length);
      expect(submittedUsers.length, buildScenarioMessage(userCount, users)).toBe(surveyUsers.length);
    } finally {
      await Promise.all(users.map(user => user.context.close().catch(() => undefined)));
    }
  });
}

async function openSurveyUser(browser: Browser, userNumber: number): Promise<VirtualUser> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const startedAt = Date.now();
  let responseStatus: number | null = null;

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    const response = await page.goto('/encuesta', { waitUntil: 'domcontentloaded' });
    responseStatus = response?.status() ?? null;
    const state = await waitForSurveyState(page, READY_TIMEOUT_MS);

    return {
      context,
      durationMs: Date.now() - startedAt,
      page,
      pageErrors,
      responseStatus,
      state,
      submitted: false,
      userNumber,
    };
  } catch (error) {
    return {
      context,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      page,
      pageErrors,
      responseStatus,
      state: 'error',
      submitted: false,
      userNumber,
    };
  }
}

async function submitRandomSurvey(user: VirtualUser) {
  const page = user.page;

  await selectRating(page, 'color');
  await selectRating(page, 'aroma');
  await selectRating(page, 'sabor');
  await selectRating(page, 'textura');
  await selectRating(page, 'nivel_salado');
  await selectRating(page, 'sabor_garbanzo');
  await selectRating(page, 'aceptacion_global');

  await selectBoolean(page, 'consumiria_nuevamente', randomBoolean());

  const buysAtBar = randomBoolean();
  await selectBoolean(page, 'compraria_en_bar', buysAtBar);

  if (buysAtBar) {
    await page.getByPlaceholder('0').fill(String(randomPrice()));
  }

  await page.getByPlaceholder('Comparte tus opiniones, sugerencias o comentarios...').fill(TEST_COMMENT);
  await page.getByRole('button', { name: /Enviar Respuestas/i }).click();
  await expect(page.getByRole('heading', { name: /¡Gracias por participar!/i })).toBeVisible({ timeout: 20_000 });

  user.submitted = true;
}

async function selectRating(page: Page, fieldName: string) {
  await page.locator(`input[name="${fieldName}"][value="${randomRating()}"]`).check({ force: true });
}

async function selectBoolean(page: Page, fieldName: string, value: boolean) {
  await page.locator(`input[name="${fieldName}"]`).nth(value ? 0 : 1).check({ force: true });
}

function randomRating() {
  return Math.floor(Math.random() * 5) + 1;
}

function randomBoolean() {
  return Math.random() >= 0.5;
}

function randomPrice() {
  return Math.floor(Math.random() * 16 + 15) * 100;
}

async function waitForSurveyState(page: Page, timeoutMs: number): Promise<SurveyState> {
  const startedAt = Date.now();
  const surveyHeading = page.getByRole('heading', { name: /Evaluación de Producto/i });
  const queueAlert = page.getByTestId('queue-alert');

  while (Date.now() - startedAt < timeoutMs) {
    if (await queueAlert.isVisible().catch(() => false)) {
      return 'queue';
    }

    if (await surveyHeading.isVisible().catch(() => false)) {
      return 'survey';
    }

    await page.waitForTimeout(250);
  }

  return 'timeout';
}

async function settleAndRefreshUserStates(users: VirtualUser[], settleMs: number) {
  await Promise.all(users.map(user => user.page.waitForTimeout(settleMs).catch(() => undefined)));
  await Promise.all(
    users.map(async user => {
      if (user.state === 'error') return;

      user.state = await readCurrentSurveyState(user.page);
    }),
  );
}

async function readCurrentSurveyState(page: Page): Promise<SurveyState> {
  const queueAlert = page.getByTestId('queue-alert');
  const surveyHeading = page.getByRole('heading', { name: /Evaluación de Producto/i });

  if (await queueAlert.isVisible().catch(() => false)) {
    return 'queue';
  }

  if (await surveyHeading.isVisible().catch(() => false)) {
    return 'survey';
  }

  return 'timeout';
}

function parseUserSteps(rawValue?: string): number[] | null {
  if (!rawValue) return null;

  const parsedSteps = rawValue
    .split(',')
    .map(value => Number(value.trim()))
    .filter(value => Number.isInteger(value) && value > 0);

  return parsedSteps.length > 0 ? parsedSteps : null;
}

function printScenarioSummary(userCount: number, users: VirtualUser[]) {
  const durations = users.map(user => user.durationMs).sort((a, b) => a - b);
  const p95 = percentile(durations, 95);
  const max = durations[durations.length - 1] ?? 0;
  const surveyCount = users.filter(user => user.state === 'survey').length;
  const queueCount = users.filter(user => user.state === 'queue').length;
  const failedCount = users.filter(user => user.state === 'timeout' || user.state === 'error').length;

  console.log(
    [
      `stress:${userCount}`,
      `survey=${surveyCount}`,
      `queue=${queueCount}`,
      `failed=${failedCount}`,
      `p95=${p95}ms`,
      `max=${max}ms`,
    ].join(' | '),
  );
}

function printSubmissionSummary(userCount: number, submittedCount: number, queueCount: number) {
  console.log(`stress:${userCount} submitted=${submittedCount} queue=${queueCount} comment="${TEST_COMMENT}"`);
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;

  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

function buildFailureMessage(title: string, users: VirtualUser[]) {
  return `${title}:\n${users.map(formatUser).join('\n')}`;
}

function buildScenarioMessage(userCount: number, users: VirtualUser[]) {
  return `Resultado para ${userCount} usuarios:\n${users.map(formatUser).join('\n')}`;
}

function formatUser(user: VirtualUser) {
  const details = [
    `#${user.userNumber}`,
    `state=${user.state}`,
    `status=${user.responseStatus ?? 'n/a'}`,
    `duration=${user.durationMs}ms`,
    `submitted=${user.submitted}`,
  ];

  if (user.error) {
    details.push(`error=${user.error}`);
  }

  if (user.pageErrors.length > 0) {
    details.push(`pageErrors=${user.pageErrors.join(' | ')}`);
  }

  return details.join(' ');
}
