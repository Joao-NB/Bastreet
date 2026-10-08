const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),net=require('node:net'),assert=require('node:assert/strict');
const root=process.cwd(),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
async function main(){
 const out=path.join(root,'tmp','futstreet-v2-qa');fs.mkdirSync(out,{recursive:true});const userData=fs.mkdtempSync(path.join(root,'tmp','futstreet-v2-chrome-')),data=fs.mkdtempSync(path.join(root,'tmp','futstreet-v2-data-')),debugPort=await freePort(),port=await freePort();
 fs.writeFileSync(path.join(data,'courts-cache.json'),JSON.stringify({sport:'futsal',updatedAt:new Date().toISOString(),center:{lat:-7.9938,lon:-34.8416},radius:30000,results:[{id:'qa-futsal-olinda',name:'Quadra futsal QA',area:'Olinda',lat:-7.9938,lon:-34.8416,access:'public',sport:'futsal',source:'osm'}]}));
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${userData}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:data,DATABASE_URL:'',SEED_DEMO:'false',ADMIN_PASSWORD:''},windowsHide:true,stdio:'ignore'});
 let ws;const errors=[],requests=[];
 try{
  let targets;for(let i=0;i<100;i++){try{targets=await(await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();if(targets.length)break}catch{}await delay(100)}
  assert.ok(targets?.length);ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));let seq=0;const pending=new Map();
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(new Error(JSON.stringify(message.error))):task.resolve(message.result)}
   if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
   if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
   if(message.method==='Fetch.requestPaused'){
     const paused=message.params;
     const body={courts:[{id:'qa-sp',name:'Quadra São Paulo QA',area:'São Paulo',lat:-23.5505,lon:-46.6333,surface:'Quadra poliesportiva',source:'osm',distance:0,players:0}],meta:{radius:8,live:true,osmResults:1,cache:false,refreshing:false}};
     cdp('Fetch.fulfillRequest',{requestId:paused.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')}).catch(()=>{});
   }
  });
  const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
  const viewport=(width,height)=>cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const screenshot=async file=>fs.writeFileSync(path.join(out,file),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const base=`http://127.0.0.1:${port}`;for(let i=0;i<100;i++){try{await fetch(base+'/api/health');break}catch{await delay(100)}}
  const register=async(index)=>{const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'QA '+index,email:`qa${index}@test.dev`,password:'quadra123',location:'Olinda, PE',gender:'Outro'})});assert.equal(response.status,201);return response.json()};
  await viewport(1440,960);await cdp('Page.navigate',{url:base});await delay(1200);await evaluate('document.fonts.ready');await screenshot('login-desktop.png');
  assert.equal(await evaluate("document.querySelector('.auth-generated-art img').naturalWidth>0"),true);
  await evaluate("setAuthTab('register');(()=>{const form=document.querySelector('#register-form');for(const[name,value]of Object.entries({name:'João QA',age:'21',city:'Olinda'}))form.elements.namedItem(name).value=value;document.querySelector('#next-register').click()})()");
  assert.equal(await evaluate("document.querySelector('[data-step=\"1\"]').classList.contains('active')"),true,'UF precisa ser obrigatória');
  assert.equal(await evaluate("Boolean(document.querySelector('[name=height]'))"),false);
  await evaluate("document.querySelector('[name=state]').value='PE';document.querySelector('#next-register').click()");
  assert.equal(await evaluate("document.querySelector('[data-step=\"2\"]').classList.contains('active')"),true);
  assert.deepEqual(await evaluate("Array.from(document.querySelector('[name=gender]').options).map(o=>o.value).filter(Boolean)"),['Mulher','Homem','Outro']);
  await evaluate("(()=>{const form=document.querySelector('#register-form');for(const[name,value]of Object.entries({position:'Fixo',gender:'Outro',email:'qa0@test.dev',password:'quadra123'}))form.elements.namedItem(name).value=value;form.requestSubmit()})()");await delay(800);
  assert.equal(await evaluate("document.querySelector('#auth-screen').hidden"),true);
  assert.equal(await evaluate("document.querySelector('#profile-summary').textContent.includes('Olinda, PE')"),true);
  await screenshot('home-desktop.png');await evaluate("showPage('perfil');document.querySelector('#edit-profile').click()");assert.equal(await evaluate("document.activeElement.id"),'profile-city');await evaluate("showPage('inicio')");
  await evaluate("document.querySelector('#inicio [data-mode=\"2v2\"]').click()");await delay(300);assert.equal(await evaluate("document.querySelector('#search-title').textContent"),'Buscando 2 × 2');assert.equal(await evaluate("document.querySelector('#queue-needed').textContent"),'4');await screenshot('queue-2v2.png');
  await evaluate("document.querySelector('#train-while-waiting').click()");await delay(400);assert.equal(await evaluate("document.querySelector('#treinos').classList.contains('active')"),true);assert.equal(await evaluate("document.querySelector('#training-queue').hidden"),false);await screenshot('training-queue-desktop.png');
  await delay(4100);assert.ok(requests.some(url=>url.endsWith('/api/matchmaking/heartbeat')),'Ir treinar deve manter heartbeat');
  await cdp('Page.reload');await delay(1200);await evaluate("showPage('treinos')");await delay(500);assert.equal(await evaluate("document.querySelector('#training-queue').hidden"),false,'Recarregar deve retomar fila');
  await evaluate("document.querySelector('#workout-grid').scrollIntoView({block:'start',behavior:'instant'})");await evaluate("Promise.all(Array.from(document.querySelectorAll('.workout-art img')).map(img=>img.decode()))");await screenshot('workouts-desktop.png');
  assert.equal(await evaluate("document.querySelectorAll('.workout-art img').length"),4);
  await evaluate("startWorkout('controle-bola')");await delay(300);assert.ok((await evaluate("document.querySelector('.workout-phase').textContent")).includes('Aquecimento'));
  await viewport(390,844);await screenshot('workout-mobile.png');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  for(const page of ['inicio','partidas','quadras','chat','perfil','ranking','treinos']){await evaluate(`showPage('${page}')`);await delay(100);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Overflow '+page);if(page==='inicio')await screenshot('home-mobile.png')}
  await evaluate("document.querySelector('.training-game-modes').scrollIntoView({block:'start',behavior:'instant'})");await screenshot('modes-mobile.png');
  for(let i=1;i<=3;i++){const registered=await register(i);const response=await fetch(base+'/api/matchmaking/join',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+registered.token},body:JSON.stringify({mode:'2v2'})});assert.equal(response.status,200)}
  for(let i=0;i<8;i++){if(await evaluate("document.querySelector('#found-state').hidden===false"))break;await delay(700)}
  assert.equal(await evaluate("document.querySelector('#match-overlay').classList.contains('open')"),true);assert.equal(await evaluate("document.querySelector('#found-state').hidden"),false);assert.equal(await evaluate("document.querySelector('.team-balance strong').textContent"),'2');
  await evaluate("document.querySelector('#confirm-match').click()");await delay(400);assert.equal(await evaluate("document.querySelector('#partidas').classList.contains('active')"),true);
  await evaluate("document.querySelector('#nav-match').click()");await delay(300);assert.equal(await evaluate("document.querySelector('#search-title').textContent"),'Buscando 5 × 5');assert.equal(await evaluate("document.querySelector('#queue-needed').textContent"),'10');await evaluate("document.querySelector('#cancel-search').click()");
  await cdp('Fetch.enable',{patterns:[{urlPattern:'*api/courts*',requestStage:'Request'}]});await cdp('Browser.grantPermissions',{origin:base,permissions:['geolocation']});await cdp('Emulation.setGeolocationOverride',{latitude:-23.5505,longitude:-46.6333,accuracy:15});await evaluate("showPage('quadras');startLiveLocation()");await delay(1200);
  assert.ok(requests.some(url=>url.includes('api/courts?lat=-23.5505&lon=-46.6333')),'Mapa deve usar GPS fora de Pernambuco');assert.ok((await evaluate("document.querySelector('#location-label').textContent")).includes('GPS'));
  await screenshot('gps-mobile.png');
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate("showPage('treinos')");await delay(100);assert.equal(await evaluate("getComputedStyle(document.querySelector('.running .workout-art img')).animationName"),'none');
  await evaluate("document.querySelector('#logout-button').click();document.querySelector('#auth-screen').scrollTo(0,0);document.querySelector('#toast').classList.remove('show')");await delay(100);await screenshot('login-mobile.png');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  await viewport(320,740);await screenshot('login-mobile-320.png');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Login 320px');
  assert.deepEqual(errors,[]);console.log('PASS navegador: artes, cidade/UF, cadastro, modos, fila em Treinos, heartbeat, retomada, 2 × 2 real, busca rápida 5 × 5, GPS fora de PE e responsividade.');console.log('Capturas em tmp/futstreet-v2-qa');
 }finally{ws?.close();chrome.kill();server.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
