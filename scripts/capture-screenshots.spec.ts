import { test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

type CaptureName = 'hero' | 'map-air-defense' | 'intel-feed' | 'sitrep' | 'historical';

async function ensureScreenshotsDir() {
  await fs.mkdir(path.join(process.cwd(), 'docs', 'screenshots'), { recursive: true });
}

function resolutionSuffix(viewport: { width: number; height: number } | null | undefined): string {
  const width = viewport?.width ?? 0;
  const height = viewport?.height ?? 0;
  return `${width}x${height}`;
}

async function capture(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, name: CaptureName) {
  const suffix = resolutionSuffix(page.viewportSize());
  const outPath = path.join(process.cwd(), 'docs', 'screenshots', `${name}-${suffix}.png`);
  // Give the renderer a moment to settle (WebGL-heavy UI).
  await page.waitForTimeout(500);
  // Element screenshots tend to be more reliable than full-page captures on WebGL-heavy pages.
  const root = page.locator('html');
  await root.waitFor({ state: 'visible', timeout: 5_000 });
  await root.screenshot({ path: outPath, timeout: 60_000 });
}

async function safeClickByRole(
  page: import('@playwright/test').Page,
  role: Parameters<import('@playwright/test').Page['getByRole']>[0],
  options: Parameters<import('@playwright/test').Page['getByRole']>[1]
) {
  const loc = page.getByRole(role, options);
  if (await loc.count()) {
    await loc.first().click();
    return true;
  }
  return false;
}

async function ensurePressed(
  page: import('@playwright/test').Page,
  role: Parameters<import('@playwright/test').Page['getByRole']>[0],
  options: Parameters<import('@playwright/test').Page['getByRole']>[1]
) {
  const loc = page.getByRole(role, options).first();
  if (!(await loc.count())) return false;
  const pressed = await loc.getAttribute('aria-pressed');
  if (pressed !== 'true') {
    await loc.click();
  }
  return true;
}

test.describe('README screenshot capture', () => {
  test('captures hero, layers, panels, and historical mode', async ({ page }, testInfo) => {
    testInfo.setTimeout(240_000);
    await ensureScreenshotsDir();

    // Hero — basic landing state.
    await page.goto('/');
    // No data-testid on map controls; we use the stable "Map layers" region aria-label.
    await page.getByRole('region', { name: 'Map layers' }).waitFor({ state: 'visible', timeout: 60_000 });
    await capture(page, testInfo, 'hero');

    // Map Air Defense — toggle the Air Defense layer.
    // The layer toggle buttons have stable, descriptive aria-label strings.
    // Use Middle East theater for denser AD coverage (more likely to show rings/markers).
    await page.getByRole('combobox', { name: 'Active theater' }).selectOption('middle-east');
    await page.getByRole('region', { name: 'Map layers' }).waitFor({ state: 'visible', timeout: 60_000 });

    const adEnsured = await ensurePressed(page, 'button', { name: /Air defense installations and range rings layer/i });
    if (!adEnsured) {
      console.log('[skip] map-air-defense: no stable selector for Air Defense toggle');
    } else {
      try {
        // Wait for markers to appear (markers are DOM elements with class "ad-marker").
        // This is a stable CSS class created by AirDefenseLayer specifically for markers.
        await page.locator('.ad-marker').first().waitFor({ state: 'visible', timeout: 30_000 });
      } catch {
        console.log('[note] map-air-defense: Air Defense markers did not appear (capturing UI anyway)');
      }
      await capture(page, testInfo, 'map-air-defense');
    }

    // Intel Feed — ensure events are visible (right column always present).
    // We wait for the "INTEL FILTERS" heading and at least one event card (article).
    try {
      await page.getByRole('heading', { name: 'INTEL FILTERS' }).waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator('article[aria-labelledby^="event-card-title-"]').first().waitFor({ state: 'visible', timeout: 120_000 });
    } catch {
      console.log('[note] intel-feed: feed did not render events in time (capturing panel anyway)');
    }
    await capture(page, testInfo, 'intel-feed');

    // SITREP / Briefing Generator — capture the panel UI (LLM output not required).
    // The panel may be offline (no Ollama); both states are fine for a UI capture.
    try {
      await page.getByRole('button', { name: 'GENERATE SITREP' }).waitFor({ state: 'visible', timeout: 60_000 });
    } catch {
      await page.getByRole('heading', { name: 'Briefing Generator' }).waitFor({ state: 'visible', timeout: 60_000 });
    }
    await capture(page, testInfo, 'sitrep');

    // Historical — switch to a historical theater and enable EVENTS to show the year timeline.
    // Theater select has stable aria-label "Active theater".
    await page.getByRole('combobox', { name: 'Active theater' }).selectOption('hist-yugoslav');
    await page.getByText(/^HISTORICAL MODE/i).waitFor({ state: 'visible', timeout: 60_000 });

    // Enable EVENTS layer so the HistoricalTimeline becomes visible.
    const eventsEnsured = await ensurePressed(page, 'button', { name: /Geoconfirmed conflict events layer/i });
    if (!eventsEnsured) {
      // In Historical Mode the same layer is still named "events" and the control is rendered with the same aria label.
      console.log('[skip] historical: could not toggle EVENTS layer (no stable selector)');
      await capture(page, testInfo, 'historical');
      return;
    }

    // The historical timeline includes a stable label "HISTORICAL:".
    try {
      await page.getByText('HISTORICAL:').waitFor({ state: 'visible', timeout: 60_000 });
    } catch {
      console.log('[note] historical: year timeline not visible after toggling EVENTS (capturing UI anyway)');
    }
    await capture(page, testInfo, 'historical');
  });
});

