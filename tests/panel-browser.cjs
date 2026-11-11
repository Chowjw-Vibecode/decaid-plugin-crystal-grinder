const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'dist/thiscup-crystal.reaplugin/plugin.js'),'utf8'),ctx);const assets=vm.runInContext('PANEL_ASSETS',ctx);
 const deviceId='plugin:thiscup-crystal.reaplugin:crystal:fixture-a';
 const profile={title:'HyperEx 2.1',steps:[{flow:3,seconds:7}],target_weight:100};
 const state={available:true,connected:true,state:'idle',busy:false,deviceId,deviceName:'CRYSTAL',deviceAlias:'我的 Crystal',multiDevice:true,preferencesReady:true,workflowReady:true,initialized:true,parametersConfirmed:true,commandFence:{instanceId:'test',revision:1},values:{targetAngle:550,servoAngle:550,motorRpm:900,feedRpm:30,sysState:0,bootSign:1},config:{grindSize:550,motorRpm:900,feedRpm:30,bootMode:'manual'},devices:[{id:deviceId,name:'CRYSTAL',alias:'我的 Crystal'},{id:'plugin:thiscup-crystal.reaplugin:crystal:fixture-b',name:'小方'}],operations:[]};
 const writes=[],errors=[];const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.WebSocket=class{constructor(){setTimeout(()=>this.onopen?.(),5)}close(){}};});
 await page.route('http://fixture.test/**',async route=>{
  const url=new URL(route.request().url()),asset=url.searchParams.get('asset');
  if(url.pathname.endsWith('/ui')&&route.request().method()==='GET'&&url.searchParams.get('state')!=='1'){const a=assets[asset||'index.html'];return route.fulfill({status:a?200:404,contentType:a?.type||'text/plain',body:a?.body||'missing'});}
  let data=null;
  if(route.request().method()!=='GET'){writes.push(route.request().postDataJSON());return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:'fixture blocks motor writes'})});}
  if(url.pathname.endsWith('/workflow'))data={id:'w1',profile};
  else if(url.pathname.endsWith('/profiles'))data=[{id:'p1',profile}];
  else if(url.pathname.endsWith('/ui'))data=state;
  else if(url.pathname.endsWith('/devices'))data=state.devices;
  else if(url.searchParams.has('full'))data={};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const output=path.join(root,'verification');fs.mkdirSync(output,{recursive:true});
 await page.goto('http://fixture.test/api/v1/plugins/thiscup-crystal.reaplugin/ui?view=grinder');
 await page.locator('[data-gp="start"]:not([disabled])').waitFor();
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.screenshot({path:path.join(output,`panel-${theme}.png`)});}
 await page.locator('[data-gp="devices"]').click();await page.locator('.gp-device-card').first().waitFor();assert.equal(await page.locator('.gp-device-card').count(),2);await page.screenshot({path:path.join(output,'devices.png')});
 assert.equal(writes.length,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({loaded:true,dualDevices:2,noWrites:true,errors,output}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
