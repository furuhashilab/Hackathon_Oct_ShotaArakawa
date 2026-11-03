const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const rows = [];
const sheet = { getLastRow: () => rows.length, appendRow: row => rows.push(row), getRange: () => ({ getValues: () => rows.slice(1).map(r => [r[11]]) }) };
const ctx = vm.createContext({
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-only' }) },
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../gas/Code.gs'), 'utf8'), ctx);
const post = consent => ctx.doPost({ postData: { contents: JSON.stringify({ type: 'FeatureCollection', metadata: { name: 'Test', consent }, features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [139.45, 36.14] }, properties: {} }] }) } });
const good = { accepted: true, version: '2026-11-04', license: 'PDL-1.0', scope: 'features', acceptedAt: new Date().toISOString() };
for (const consent of [undefined, null, {}, { ...good, accepted: false }, { ...good, accepted: 'true' }, { ...good, version: 'old' }, { ...good, license: 'other' }, { ...good, scope: 'all' }, { ...good, acceptedAt: 'invalid' }]) {
  assert.equal(post(consent).error, 'consent_required');
  assert.equal(rows.length, 0);
}
assert.equal(post(good).ok, true);
assert.equal(rows.length, 2);
assert.equal(rows[1][2], 'Test');
assert.deepEqual(JSON.parse(rows[1][11]).metadata.consent, good);
rows.push([...rows[1].slice(0, 11), JSON.stringify({ type: 'FeatureCollection', metadata: { submissionId: 'legacy' }, features: [] })]);
assert.equal(ctx.doGet({ parameter: { key: 'wrong' } }).error, 'unauthorized');
const result = ctx.doGet({ parameter: { key: 'test-only' } });
assert.equal(result.submissions.length, 2);
assert.equal(result.submissions[1].metadata.consent, undefined);
console.log('PASS: consent rejection, accepted save, preserved name/consent, legacy read, admin authorization');
