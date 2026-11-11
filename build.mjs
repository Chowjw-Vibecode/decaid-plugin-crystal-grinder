import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const output = path.join(root, 'dist', 'thiscup-crystal.reaplugin');
mkdirSync(output, {recursive: true});
const read = name => readFileSync(path.join(src, name), 'utf8');
const assets = {};
for (const name of ['entry.js','grinder.js','grinder-panel.js','profile-identity.js','dismiss-guard.js','brand.js']) {
  assets[name] = {type:'text/javascript; charset=utf-8', body:read(name)};
}
assets['style.css'] = {type:'text/css; charset=utf-8', body:read('base.css')+'\n'+read('standalone.css')};
assets['index.html'] = {type:'text/html; charset=utf-8', body:read('index.html')};
const source = read('plugin.js');
const marker = "        if(request.endpoint!=='ui')return json({ok:false,error:'Unknown endpoint'},404);";
if (source.split(marker).length !== 2) throw new Error('Driver HTTP entry changed; check the panel integration.');
const transport = `        if(request.endpoint==='skin') {
          if(request.method!=='GET')return json({ok:false,error:'Method not allowed'},405);
          const current=state();
          return json({version:1,live:{endpoint:'changed'},settingsOpen:{type:'open',view:'grinder',presentation:'overlay',size:'full',closeOnShot:true},surfaces:[
            {id:'grinder',kind:'header-button',label:'研磨',action:{type:'open',view:'grinder',presentation:'overlay',size:'full',closeOnShot:true}},
            {id:'grinder-device',kind:'tile-hint',tile:'grind',text:current.deviceAlias||current.deviceName||'选择磨豆机',action:{type:'open',view:'grinder',presentation:'overlay',size:'full',closeOnShot:true}}
          ]});
        }
        if(request.endpoint==='ui'&&request.method==='GET') {
          const query=request.query||{};
          const accept=String(request.headers?.accept||request.headers?.Accept||'');
          const wantsPage=query.view==='grinder'||query.embed==='1'||typeof query.returnTo==='string'||accept.includes('text/html');
          const assetName=query.asset||(query.state!=='1'&&wantsPage?'index.html':null);
          if(assetName) {
            const asset=Object.prototype.hasOwnProperty.call(PANEL_ASSETS,assetName)?PANEL_ASSETS[assetName]:null;
            if(!asset)return json({ok:false,error:'Unknown resource'},404);
            return {status:200,headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:asset.body};
          }
        }
`;
writeFileSync(path.join(output,'plugin.js'), 'const PANEL_ASSETS = '+JSON.stringify(assets)+';\n'+source.replace(marker, transport+marker));
copyFileSync(path.join(src,'manifest.json'),path.join(output,'manifest.json'));
copyFileSync(path.join(root,'README.md'),path.join(output,'README.md'));
const archive=path.join(root,'dist','thiscup-crystal.reaplugin.zip');
// Python writes a fresh archive, so removed assets cannot survive a rebuild.
execFileSync('python3',['-c','import pathlib,sys,zipfile; root=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED); [z.write(p,root.name+"/"+p.name) for p in root.iterdir() if p.is_file()]; z.close()',output,archive]);
console.log(archive);
