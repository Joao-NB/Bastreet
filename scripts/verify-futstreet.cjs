const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const net=require('node:net');
const {workouts}=require('../workouts');
const vm=require('node:vm');
async function verifyCourtMigration(){
  let cache={sport:'basketball',updatedAt:new Date().toISOString(),center:{lat:0,lon:0},radius:30000,results:[{name:'Quadra antiga'}]};let query='';
  const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');const definitions=source.slice(source.indexOf('function readCourtCache()'),source.indexOf('function regionalCacheKey('));
  const context=vm.createContext({Date,Promise,URLSearchParams,AbortSignal,encodeURIComponent,Number,console,Map,courtsCacheFile:'cache',recifeOsmSnapshot:[],km:()=>0,fs:{readFileSync:()=>JSON.stringify(cache),writeFileSync:(_,text)=>{cache=JSON.parse(text)}},fetch:async(_,options)=>{query=new URLSearchParams(options.body).get('data');return {ok:true,json:async()=>({elements:[{type:'way',id:1,center:{lat:0,lon:0},tags:{sport:'futsal',leisure:'pitch',surface:'concrete'}}]})}}});
  vm.runInContext(definitions,context);assert.equal(vm.runInContext('readCourtCache()',context),null);
  const result=await vm.runInContext('searchOsmCourts(0,0,8000)',context);assert.equal(result.results[0].sport,'futsal');assert.equal(cache.sport,'futsal');assert.ok(query.includes('futsal'));assert.ok(query.includes('surface'));assert.ok(!query.includes('basketball'));assert.ok(!query.includes('grass'));
}

const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  await verifyCourtMigration();
  fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
  const scratch=fs.mkdtempSync(path.join(root,'tmp','futstreet-api-'));
  const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  fs.writeFileSync(path.join(scratch,'courts-cache.json'),JSON.stringify({sport:'futsal',updatedAt:new Date().toISOString(),center:{lat:-8.0476,lon:-34.9084},radius:30000,results:[{id:'qa-futsal',name:'Quadra de futsal de teste',area:'Recife',lat:-8.0476,lon:-34.9084,access:'yes',sport:'futsal',source:'osm'}]}));
  const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:scratch,DATABASE_URL:'',SEED_DEMO:'false',ADMIN_PASSWORD:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let log='';server.stderr.on('data',chunk=>log+=chunk);
  const base=`http://127.0.0.1:${port}`;
  async function request(route,token,method='GET',body,status=200){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();assert.equal(response.status,status,route+': '+JSON.stringify(value));return value;}
  const dbRead=()=>JSON.parse(fs.readFileSync(path.join(scratch,'db.json'),'utf8'));
  const dbWrite=db=>fs.writeFileSync(path.join(scratch,'db.json'),JSON.stringify(db));
  try {
    for(let i=0;i<100;i++){try{await fetch(base+'/api/health');break}catch{await delay(100)}}
    const health=await request('/api/health');assert.equal(health.service,'futstreet');
    await request('/api/trainings',null,'GET',null,401);
    const users=[];
    for(let i=0;i<11;i++) users.push(await request('/api/auth/register',null,'POST',{name:`Atleta ${i+1}`,email:`player${i+1}@futstreet.test`,password:'quadra123',location:'Recife, PE',position:['Goleiro','Fixo','Ala','Pivô'][i%4]},201));
    const token=users[0].token;
    const training=await request('/api/trainings',token);assert.equal(Object.keys(training.workouts).length,4);assert.equal(training.state.sessions,0);
    for(const workout of Object.values(workouts)){assert.equal(workout.seconds,workout.timeline.reduce((sum,item)=>sum+item.seconds,0));assert.equal(workout.timeline.at(-1).end,workout.seconds);assert.ok(workout.timeline.some(item=>item.kind==='rest'));assert.ok(workout.seconds>=480);}
    await request('/api/trainings',token,'POST',{workoutId:'controle-bola'},400);
    await request('/api/trainings/start',token,'POST',{workoutId:'agilidade'},403);
    const start=await request('/api/trainings/start',token,'POST',{workoutId:'controle-bola'});assert.equal(start.seconds,480);
    await request('/api/trainings',token,'POST',{workoutId:'controle-bola'},400);
    assert.equal((await request('/api/trainings',token)).inProgress.workoutId,'controle-bola');
    let db=dbRead();db.trainingStarts[0].startedAt=new Date(Date.now()-481000).toISOString();dbWrite(db);
    const finish=await request('/api/trainings',token,'POST',{workoutId:'controle-bola'},201);assert.equal(finish.xp,40);assert.equal(finish.user.xp,40);
    await request('/api/trainings',token,'POST',{workoutId:'controle-bola'},409);
    const beforeThresholds=dbRead();const baseTrainings=[...beforeThresholds.trainings];const day=new Date().toISOString().slice(0,10);for(let i=0;i<4;i++){beforeThresholds.trainings.push({userId:users[0].user.id,workoutId:'passe-parede',day});dbWrite(beforeThresholds);const state=(await request('/api/trainings',token)).state;assert.equal(state.unlocked.Intermediário,i>=1);assert.equal(state.unlocked.Avançado,i>=3);}beforeThresholds.trainings=baseTrainings;dbWrite(beforeThresholds);
    const joined=[];let match;
    for(let i=0;i<10;i++){const state=await request('/api/matchmaking/join',users[i].token,'POST',{});assert.equal(state.needed,10);if(i<9){assert.equal(state.match,null);assert.equal(state.waiting,i+1);}else match=state.match;joined.push(state);}
    assert.equal(match.sport,'futsal');assert.deepEqual(match.teams.map(team=>team.length),[5,5]);assert.equal(new Set(match.teams.flat().map(player=>player.id)).size,10);
    await request(`/api/matches/${match.id}/complete`,token,'POST',{},409);
    for(let i=0;i<10;i++)await request(`/api/matches/${match.id}/confirm`,users[i].token,'POST',{});
    const complete=await request(`/api/matches/${match.id}/complete`,token,'POST',{});assert.equal(complete.user.xp,140);
    const again=await request(`/api/matches/${match.id}/complete`,token,'POST',{});assert.equal(again.user.xp,140);
    await request(`/api/chats/${match.id}/messages`,users[10].token,'GET',null,403);
    await request(`/api/chats/${match.id}/messages`,users[10].token,'POST',{text:'não autorizado'},403);
    await request(`/api/chats/${match.id}/messages`,token,'POST',{text:'Bora pro futsal!'},201);
    assert.equal((await request(`/api/chats/${match.id}/messages`,users[1].token)).messages[0].text,'Bora pro futsal!');
    assert.equal((await request('/api/chats',token)).chats[0].name,'Comunidade FUTSTREET');
    await request('/api/me',token,'PATCH',{location:'Olinda, PE'});assert.equal((await request('/api/me',token)).user.location,'Olinda, PE');
    db=dbRead();db.users[0].position='Armador';const legacy={...match,id:'legacy-match',sport:undefined,teams:match.teams.map(team=>team.slice(0,3)),confirmed:match.teams.map(team=>team.slice(0,3)).flat().map(player=>player.id),completed:[]};db.matches.push(legacy);db.trainingStarts.push({userId:users[1].user.id,workoutId:'controle-bola',startedAt:new Date(Date.now()-1000000).toISOString()});dbWrite(db);
    assert.equal((await request('/api/me',token)).user.position,'Fixo');
    await request(`/api/matches/legacy-match/complete`,token,'POST',{});
    assert.equal((await request('/api/trainings',users[1].token)).inProgress,null);
    await request('/api/trainings',users[1].token,'POST',{workoutId:'controle-bola'},400);
    const overview=await request('/api/me',token);assert.equal(overview.stats.trainings,1);assert.equal(overview.stats.matches,2);
    const html=await (await fetch(base)).text();assert.ok(html.includes('FUTSTREET — Sua rua. Seu jogo.'));assert.ok(!html.includes('__BASE_URL__'));assert.ok(!/basquete|BASTREET|🏀/.test(html));
    for(const asset of ['futstreet.css','assets/logo.svg','assets/ball-flat.svg','assets/brand-mark.svg','assets/favicon.svg','assets/court-art.svg','assets/og-futstreet.png'])assert.equal((await fetch(base+'/'+asset)).status,200,asset);
    assert.equal((await fetch(base+'/data/db.json')).status,404);
    console.log('PASS: cadastro, autenticação, 5 × 5, confirmações, chat privado, XP sem duplicação, treino cronometrado, retomada, histórico e recursos.');
  } finally {server.kill();if(log)console.log(log)}
}
main().catch(error=>{console.error(error);process.exitCode=1});
