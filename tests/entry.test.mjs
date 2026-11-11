import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolveProfileIdentity,profileExecutionKey} from '../src/profile-identity.js';
const source=readFileSync(new URL('../src/entry.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
function fixture(){
 const elements=new Map(),events={},docEvents={},intervals=new Map(),calls=[],posts=[];let i=0,delay=null,options;
 const document={hidden:false,documentElement:{lang:'zh',dataset:{}},getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id);},addEventListener(n,fn){docEvents[n]=fn;}};
 const grinder={cachedState:{deviceId:'a',commandFence:{instanceId:'test',revision:0}},observe(){calls.push('observe');return()=>calls.push('unobserve');},async start(){calls.push('start');},async apply(){calls.push('apply');},async saveRecipe(){calls.push('save');},async stop(){calls.push('stop');}};
 const window={addEventListener(n,fn){events[n]=fn;}},parent={postMessage(m){posts.push(m);}};
 const context=vm.createContext({console,URL,URLSearchParams,AbortSignal,document,window,parent,location:{origin:'http://localhost:8080',hostname:'localhost',search:'?embed=1',reload(){},replace(){calls.push('replace');}},createGrinderClient:()=>grinder,resolveProfileIdentity,
 mountGrinderUI(_el,o){options=o;return{destroy(){calls.push('destroy');o.onClose();},suspend(){},resume(){}};},
 fetch:async url=>{if(url.endsWith('/workflow')&&delay)await delay;return{ok:true,json:async()=>url.includes('/profiles')?[]:{id:'w',profile:{title:'test',steps:[{}]}}};},
 setInterval(fn){intervals.set(++i,fn);return i;},clearInterval(id){intervals.delete(id);}});
 vm.runInContext(source,context);
 return{grinder,calls,posts,intervals,document,events,docEvents,get options(){return options;},hold(){let release;delay=new Promise(r=>release=r);return()=>{delay=null;release();};}};
}
for(const method of ['start','apply','saveRecipe'])for(const change of ['local-stop','external-stop','device-change','close','hidden'])test(`${method} cancels preflight on ${change}`,async()=>{
 const f=fixture();await flush();const release=f.hold();const action=f.grinder[method]();const rejection=assert.rejects(action,/取消|关闭/);
 if(change==='local-stop')await f.grinder.stop();if(change==='external-stop')f.grinder.cachedState.commandFence.revision++;
 if(change==='device-change')f.grinder.cachedState.deviceId='b';if(change==='close')f.events.pagehide();if(change==='hidden'){f.document.hidden=true;f.docEvents.visibilitychange();}release();await rejection;
 assert(!f.calls.includes(({start:'start',apply:'apply',saveRecipe:'save'})[method]));
});
test('ready handshake is immediate and closing destroys only once without secondary navigation',async()=>{const f=fixture();assert.equal(f.posts[0].type,'streamline:ready');await flush();f.events.pagehide();assert.equal(f.calls.filter(x=>x==='destroy').length,1);assert.equal(f.posts.filter(x=>x.type==='streamline:close').length,0);assert.equal(f.intervals.size,0);});
test('slow boot visibility changes keep one timer and clean it after return',async()=>{const f=fixture();f.document.hidden=true;f.docEvents.visibilitychange();f.document.hidden=false;f.docEvents.visibilitychange();await flush();assert.equal(f.intervals.size,1);f.options.onClose();assert.equal(f.intervals.size,0);assert.equal(f.posts.filter(x=>x.type==='streamline:close').length,1);});
test('profile identity cannot substitute workflow or title for native id',()=>{const p={title:'a',steps:[{flow:3}]},entries=[{id:'p1',profile:p}];assert.equal(resolveProfileIdentity(p,entries), 'p1');assert.equal(resolveProfileIdentity(p,[...entries,{id:'p2',profile:p}]),null);assert.equal(resolveProfileIdentity(p,[...entries,{id:'p2',profile:p}],{id:'p2',execution:profileExecutionKey(p)}),'p2');});
