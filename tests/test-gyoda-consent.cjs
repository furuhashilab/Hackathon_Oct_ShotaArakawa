const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('function buildSubmission'));
new vm.Script(script);
const nodes = Object.fromEntries(['name', 'feedback', 'sendBtn', 'sendMsg', 'licenseConsent'].map(id => [id, { value: '', checked: false, handlers: {}, addEventListener(event, fn) { this.handlers[event] = fn; } }]));
let features = [{ geometry: { type: 'Point', coordinates: [139.45, 36.14] }, properties: { mode: 'point', title: 'Test' } }];
let posts = [], fail = false;
const context = vm.createContext({
  document: { getElementById: id => nodes[id] }, window: { addEventListener() {} },
  crypto: { randomUUID: () => 'test-id' }, Date, Math, JSON,
  CFG: { SUBMIT_URL: 'https://example.test' }, rating: null, stats: {}, selectedId: null,
  userFeatures: () => features, matchMedia: () => ({ matches: false }),
  fetch: async (_, options) => { posts.push(JSON.parse(options.body)); if (fail) throw Error('offline'); return { json: async () => ({ ok: true }) }; },
  draw: { clear() { features = []; } }, localStorage: { removeItem() {} }, DRAFT_KEY: 'test', render() {},
});
vm.runInContext(script.slice(script.indexOf('  // ---- 送信 ----'), script.lastIndexOf('})();')), context);
(async () => {
  vm.runInContext('updateSendState()', context);
  assert.equal(nodes.sendBtn.disabled, true);
  await nodes.sendBtn.handlers.click(); assert.equal(posts.length, 0);
  nodes.licenseConsent.checked = true; nodes.name.value = 'Test nickname';
  nodes.licenseConsent.handlers.change(); assert.equal(nodes.sendBtn.disabled, false);
  fail = true; await nodes.sendBtn.handlers.click(); assert.equal(nodes.sendBtn.disabled, false);
  fail = false; await nodes.sendBtn.handlers.click();
  assert.equal(posts[1].metadata.name, 'Test nickname');
  assert.equal(posts[1].metadata.consent.scope, 'features');
  assert.equal(posts[1].metadata.consent.accepted, true);
  assert.equal(posts[1].features[0].properties.name, undefined);
  assert.equal(nodes.licenseConsent.checked, false);
  assert.equal(nodes.sendBtn.disabled, true);
  console.log('PASS: syntax, unchecked block, consent metadata, name separation, retry, reset');
})().catch(e => { console.error(e); process.exitCode = 1; });
