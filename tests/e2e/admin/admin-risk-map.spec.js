import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Spatial Risk Map E2E User Journey', () => {
  test('Admin can view geographic risk distribution, interactive map controls, and area details', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Risk Map
    await page.goto('/risk-map');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/risk-map/);

    // 2. Verify Page Header & Command Bar
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Spatial view of predicted future complaint risk/i)).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Verify KPI Summary Cards
    await expect(page.locator('.heatmap-summary-compact-grid, .risk-summary-grid, .kpi-card-inner').first()).toBeVisible();

    // 4. Verify Map Container & Leaflet Canvas/Tiles
    const mapWrapper = page.locator('.heatmap-map-wrapper, [aria-label*="Spatial Risk Map"]');
    await expect(mapWrapper).toBeVisible();
    await expect(page.locator('.leaflet-container, .heatmap-map-container')).toBeVisible();

    // 5. Verify Floating Map Controls & Risk Legend
    const mapControls = page.locator('.map-floating-controls');
    await expect(mapControls).toBeVisible();
    await expect(page.locator('.map-control-btn[aria-label="Zoom in"]')).toBeVisible();
    await expect(page.locator('.map-control-btn[aria-label="Zoom out"]')).toBeVisible();
    await expect(page.locator('.risk-floating-legend, [aria-label="Risk Level Legend"]')).toBeVisible();

    // 6. Test Zoom Control Click
    await page.locator('.map-control-btn[aria-label="Zoom in"]').click();
    await page.waitForTimeout(500);

    // 7. Verify Side Intelligence Column (Selected Area & Top Risk Hotspots)
    const sideColumn = page.locator('.heatmap-side-column');
    await expect(sideColumn).toBeVisible();

    // Verify Top Risk Areas Panel
    const topHotspots = page.locator('.top-risk-item, .hotspot-item, .risk-area-card');
    const hotspotCount = await topHotspots.count();
    if (hotspotCount > 0) {
      // 8. Click a hotspot in the panel
      await topHotspots.first().click();
      await page.waitForTimeout(500);

      // Verify Selected Area Details Card updates
      const detailsCard = page.locator('.risk-area-details-card, .selected-area-card, .area-detail-panel');
      await expect(detailsCard.first()).toBeVisible();
    }

    // 9. Test Refresh Map Action
    const refreshBtn = page.getByRole('button', { name: /Refresh Map/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle');
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
