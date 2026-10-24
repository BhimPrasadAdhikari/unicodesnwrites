import { expect, test } from '@playwright/test';

test.describe('publication-first public experience', () => {
  test('home leads with the publication and its core product areas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Make complex systems click.' })).toBeVisible();
    if (test.info().project.name === 'desktop-chromium') {
      const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' });
      await expect(primaryNavigation.getByRole('link', { name: 'Read', exact: true })).toHaveAttribute('href', '/blog');
      await expect(primaryNavigation.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects');
      await expect(primaryNavigation.getByRole('link', { name: 'Products', exact: true })).toHaveAttribute('href', '/products');
    }
    await expect(page.getByRole('link', { name: 'Open the field notes' })).toHaveAttribute('href', '/blog');
  });

  test('mobile navigation exposes every product area and the personal portfolio', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-chromium', 'mobile-only contract');
    await page.goto('/');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const mobileNavigation = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileNavigation.getByRole('link', { name: 'Portfolio', exact: true })).toHaveAttribute('href', '/portfolio');
    await expect(mobileNavigation.getByRole('link', { name: 'Newsletter', exact: true })).toHaveAttribute('href', '/newsletter');
  });

  test('every top-level product surface has its own clear destination', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'desktop route audit');
    test.setTimeout(240_000);

    const destinations = [
      { path: '/projects', heading: 'Systems, shipped.' },
      { path: '/products', heading: 'Useful things, packaged carefully.' },
      { path: '/newsletter', heading: 'One useful letter when there is something worth sharing.' },
      { path: '/portfolio', heading: 'The person behind the notes, articles, and shipped systems' },
    ];

    for (const destination of destinations) {
      await page.goto(destination.path);
      await expect(page.getByRole('heading', { name: destination.heading })).toBeVisible();
    }
  });

  test('the private studio redirects unauthenticated visitors to the responsive sign-in', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?from=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });
});
