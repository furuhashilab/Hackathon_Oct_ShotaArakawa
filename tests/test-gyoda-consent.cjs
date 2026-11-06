const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const screenshots = require('node:os').tmpdir();
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
 try {
  const page = await browser.newPage(); let payload; let fail = true; const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.hostname === 'script.google.com') {
    payload = route.request().postDataJSON();
    return route.fulfill({ contentType:'application/json', body: JSON.stringify(fail ? {ok:false,error:'test'} : {ok:true}) });
   }
   if (url.pathname.endsWith('maplibre-gl.js')) return route.fulfill({body:`window.maplibregl={Map:class{touchZoomRotate={disableRotation(){}};on(t,f){if(t==='load')setTimeout(f,0)}resize(){}addControl(){}},NavigationControl:class{},GeolocateControl:class{},Marker:class{setLngLat(){return this}addTo(){return this}}};`});
   if (url.pathname.endsWith('terra-draw.umd.js')) return route.fulfill({body:`
    class Draw { constructor(){window.testDraw=this;this.features=[];this.events={}} start(){}setMode(){}on(t,f){this.events[t]=f}getSnapshot(){return this.features}getSnapshotFeature(id){return this.features.find(f=>f.id===id)}addFeatures(fs){this.features.push(...fs)}updateFeatureProperties(id,p){Object.assign(this.getSnapshotFeature(id).properties,p)}clear(){this.features=[]} }
    window.terraDraw={TerraDraw:Draw,TerraDrawPointMode:class{},TerraDrawLineStringMode:class{},TerraDrawPolygonMode:class{},TerraDrawSelectMode:class{}};`});
   if (url.pathname.endsWith('terra-draw-maplibre-gl-adapter.umd.js')) return route.fulfill({body:'window.terraDrawMaplibreGlAdapter={TerraDrawMapLibreGLAdapter:class{}};'});
   if (url.hostname==='localhost' && ['/index.html','/config.js'].includes(url.pathname)) return route.fulfill({contentType:url.pathname.endsWith('.js')?'application/javascript':'text/html',body:await fs.readFile(path.join(root,url.pathname.slice(1)))});
   return route.fulfill({body:''});
  });
  await page.goto('http://localhost/index.html');
  await page.waitForFunction(()=>window.testDraw);
  assert.equal(await page.locator('#reviewBtn').isDisabled(),true);
  for (const [id,mode,geometry] of [['p','point',{type:'Point',coordinates:[139.45,36.14]}],['l','linestring',{type:'LineString',coordinates:[[139.45,36.14],[139.46,36.15]]}]]) {
   await page.evaluate(({id,mode,geometry})=>{testDraw.addFeatures([{id,type:'Feature',geometry,properties:{mode}}]);testDraw.events.finish(id,{action:'draw'})},{id,mode,geometry});
   await page.locator('#fTitle').fill(id==='p'?'<img src=x>':'Route');
   await page.locator('#dlgSave').click();
   assert.equal(await page.locator('#dlg').isVisible(),true);
   assert.equal(await page.locator('#fDiscovery').evaluate(el=>el.validity.valueMissing),true);
   await page.locator('#fDiscovery').selectOption(id==='p'?'SNS・動画で':'自分で考えたルート・エリア');
   await page.locator('#dlgSave').click();
  }
  await page.locator('#items [data-act="edit"]').first().click();
  assert.equal(await page.locator('#fDiscovery').inputValue(),'SNS・動画で');
  await page.locator('#dlgSave').click();
  // 古い下書きや「あとで」で残った未回答も確認画面へ進ませない。
  await page.evaluate(()=>{testDraw.getSnapshotFeature('l').properties.discovery='';});
  await page.locator('#reviewBtn').click();
  assert.equal(await page.locator('#dlg').isVisible(),true);
  assert.equal(await page.locator('#reviewDialog').isVisible(),false);
  await page.locator('button[value="skip"]').click();
  assert.equal(await page.locator('#dlg').isVisible(),false);
  await page.locator('#reviewBtn').click();
  assert.equal(await page.locator('#dlg').isVisible(),true);
  await page.locator('#fDiscovery').selectOption('自分で考えたルート・エリア');
  await page.locator('#dlgSave').click();
  await page.locator('#reviewBtn').click();
  assert.equal(await page.locator('#reviewItems li').count(),2);
  assert.equal(await page.locator('#reviewItems img').count(),0);
  await page.screenshot({path:path.join(screenshots,'gyoda-review-desktop.png')});
  assert.equal(await page.locator('#sendBtn').isDisabled(),true);
  await page.locator('#licenseConsent').check(); await page.locator('#sendBtn').click();
  assert.equal(payload,undefined);
  await page.getByLabel('今、住んでいる',{exact:true}).first().check();
  await page.getByLabel('行ったことがない',{exact:true}).check();
  await page.locator('#sendBtn').click(); assert.equal(payload,undefined);
  await page.getByLabel('行ったことがない',{exact:true}).uncheck();
  await page.locator('input[name="frequency"]').first().check();
  await page.locator('#reviewBack').click(); await page.locator('#reviewBtn').click();
  assert.equal(await page.locator('#licenseConsent').isChecked(),false);
  await page.locator('#licenseConsent').check();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#reviewDialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.screenshot({path:path.join(screenshots,'gyoda-review-mobile.png')});
  await page.locator('#reviewDialog').evaluate(el=>{el.scrollTop=0});
  await page.screenshot({path:path.join(screenshots,'gyoda-review-mobile-top.png')});
  await page.locator('#sendBtn').click();
  await page.getByText('うまく送れませんでした。電波の良いところでもう一度お試しください。').waitFor();
  assert.equal(payload.metadata.research.discoveries[0].answer,'SNS・動画で');
  assert.equal(payload.metadata.research.discoveries[1].featureId,'l');
  assert.equal(payload.features[0].properties.discovery,undefined);
  assert.equal(payload.metadata.research.respondent.ageGroup,null);
  assert.equal(await page.locator('#reviewDialog').isVisible(),true);
  fail=false; await page.locator('#sendBtn').click();
  await page.locator('#reviewDialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#reviewBtn').isDisabled(),true);
  assert.equal(await page.locator('input[name="relationship"]:checked').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: feature editing, review, private metadata, consent reset, contradictory selection, retry, mobile, success reset');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
