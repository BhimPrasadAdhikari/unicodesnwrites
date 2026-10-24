import { expect, test } from '@playwright/test';

test.describe('AIML course platform', () => {
  test('learners can discover the concept-first academy', async ({ page }) => {
    await page.goto('/courses');

    await expect(page.getByRole('heading', { name: 'Learn the systems behind modern AI.' })).toBeVisible();
    await expect(page.getByText('No generic coding tracks.')).toBeVisible();

    if (test.info().project.name === 'desktop-chromium') {
      await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/courses');
    } else {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.getByRole('dialog', { name: 'Site navigation' }).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/courses');
    }
  });

  test('the course studio remains admin-only', async ({ page }) => {
    await page.goto('/dashboard/courses');
    await expect(page).toHaveURL(/\/login\?from=%2Fdashboard%2Fcourses/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  });

  test('learner identity surfaces are responsive and enrollment requires authentication', async ({ page, request }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Build understanding that lasts.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create learning account' })).toBeVisible();

    await page.goto('/learn');
    await expect(page).toHaveURL(/\/login\?from=%2Flearn/);

    const enrollment = await request.post('/api/courses/not-a-course/enroll');
    expect(enrollment.status()).toBe(401);
  });

  test('course authoring and quiz grading reject unsafe public requests', async ({ request }) => {
    const authoringResponse = await request.post('/api/courses', { data: {} });
    expect(authoringResponse.status()).toBe(401);

    const quizResponse = await request.post('/api/courses/not-a-course/lessons/not-a-lesson/quiz', {
      data: { answers: [] },
    });
    expect(quizResponse.ok()).toBeFalsy();

    const notesResponse = await request.post('/api/courses/not-a-course/lessons/not-a-lesson/notes', {
      data: { focus: '' },
    });
    expect(notesResponse.ok()).toBeFalsy();

    const stateResponse = await request.patch('/api/courses/not-a-course/lessons/not-a-lesson/state', {
      data: { notes: 'Anonymous notes must not persist.' },
    });
    expect(stateResponse.status()).toBe(401);
  });

  test('private publishing and delivery endpoints reject anonymous callers', async ({ request }) => {
    const objectId = '000000000000000000000001';

    const postResponse = await request.get(`/api/posts/${objectId}`);
    expect(postResponse.status()).toBe(401);

    const newsletterResponse = await request.post(`/api/newsletters/${objectId}/send`);
    expect(newsletterResponse.status()).toBe(401);

    const accountUpdate = await request.patch('/api/account', { data: { name: 'Anonymous learner' } });
    expect(accountUpdate.status()).toBe(401);

    const accountExport = await request.get('/api/account/export');
    expect(accountExport.status()).toBe(401);
  });
});
