const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('maplibre-gl.js')) {
        return route.fulfill({ contentType: 'application/javascript', body: `
          window.maplibregl = { Map: class {
            addControl() {} resize() {} on() {} getSource() { return null; }
          }, NavigationControl: class {} };
        ` });
      }
      if (url.hostname === 'localhost' && ['/admin.html', '/config.js'].includes(url.pathname)) {
        return route.fulfill({ contentType: url.pathname.endsWith('.js') ? 'application/javascript' : 'text/html', body: await fs.readFile(path.join(root, url.pathname.slice(1))) });
      }
      return route.fulfill({ body: '' });
    });
    await page.goto('http://localhost/admin.html');
    const fixture = (id, date) => ({ type: 'FeatureCollection', metadata: { submissionId: id, submittedAt: date, name: 'Test', feedback: 'Test feedback' }, features: [
      { type: 'Feature', id: 'p', geometry: { type: 'Point', coordinates: [139.45, 36.14] }, properties: { kind: 'point', title: '<img src=x onerror=alert(1)>', comment: '<script>bad</script>' } },
      { type: 'Feature', id: 'l', geometry: { type: 'LineString', coordinates: [[139.45, 36.14], [139.46, 36.15]] }, properties: { kind: 'linestring', title: 'Route' } },
      { type: 'Feature', id: 'a', geometry: { type: 'Polygon', coordinates: [[[139.45, 36.14], [139.46, 36.14], [139.46, 36.15], [139.45, 36.14]]] }, properties: { kind: 'polygon', title: 'Area' } },
    ] });
    const a = fixture('old', '2026-01-01'), b = fixture('new', '2026-02-01');
    await page.locator('#file').setInputFiles([a, b].map((s, i) => ({ name: `${i}.geojson`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(s)) })));
    await page.locator('#subs li').first().waitFor();
    assert.equal(await page.locator('#subs img, #subs script').count(), 0);
    async function download(locator) {
      const promise = page.waitForEvent('download');
      await locator.click();
      const result = await promise;
      return JSON.parse(await fs.readFile(await result.path(), 'utf8'));
    }
    assert.deepEqual(await download(page.locator('#subs button[data-submission]').first()), b);
    for (let i = 0; i < 3; i++) {
      const single = await download(page.locator('#subs li').first().locator(`[data-feature="${i}"]`));
      assert.deepEqual(single.features, [b.features[i]]);
      assert.equal(single.metadata.originalSubmissionId, 'new');
      assert.equal(single.metadata.submissionId, `new-feature-${i + 1}`);
    }
    assert.equal((await download(page.locator('#exportBtn'))).features.length, 6);
    await page.locator('[data-cat="none"]').uncheck();
    assert.equal((await download(page.locator('#exportBtn'))).features.length, 0);
    assert.deepEqual((await download(page.locator('#subs li').first().locator('[data-feature="0"]'))).features, [b.features[0]]);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log('PASS: per-submission, point/line/polygon, sorted mapping, filter isolation, escaping, mobile width');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
