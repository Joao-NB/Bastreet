const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {parseLocation,locationKey}=require('../locations');
const {MODES,queueMode}=require('../match-modes');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  assert.equal(parseLocation('Olinda'),null);assert.equal(parseLocation('Olinda, XX'),null);assert.equal(parseLocation('123, PE'),null);assert.equal(parseLocation(' São Paulo, sp ').location,'São Paulo, SP');assert.notEqual(locationKey('Paulista, PE'),locationKey('Paulista, PB'));assert.equal(queueMode({userId:'legacy'}),'5v5');
  fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const scratch=fs.mkdtempSync(path.join(root,'tmp','futstreet-modes-'));
  fs.writeFileSync(path.join(scratch,'courts-cache.json'),JSON.stringify({sport:'futsal',updatedAt:new Date().toISOString(),center:{lat:-7.9938,lon:-34.8416},radius:30000,results:[{id:'qa-futsal-olinda',name:'Quadra futsal QA',area:'Olinda',lat:-7.9938,lon:-34.8416,access:'public',sport:'futsal',source:'osm'}]}));
  const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:scratch,DATABASE_URL:'',SEED_DEMO:'false',ADMIN_PASSWORD:''},windowsHide:true,stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  const request=async(route,token,method='GET',body,status=200)=>{const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.equal(response.status,status,route+': '+JSON.stringify(result));return result};
  const read=()=>JSON.parse(fs.readFileSync(path.join(scratch,'db.json'),'utf8'));const write=db=>fs.writeFileSync(path.join(scratch,'db.json'),JSON.stringify(db));
  try{
    for(let i=0;i<100;i++){try{await fetch(base+'/api/health');break}catch{await delay(100)}}
    for(const location of ['Olinda','Olinda, XX',''])await request('/api/auth/register',null,'POST',{name:'Inválido',email:'invalid@test.dev',password:'quadra123',location},400);
    const users=[];for(let i=0;i<29;i++)users.push(await request('/api/auth/register',null,'POST',{name:`Atleta ${i+1}`,email:`mode${i+1}@test.dev`,password:'quadra123',location:'Olinda, PE',gender:'Outro',height:180},201));
    assert.equal(Object.hasOwn(users[0].user,'height'),false);
    await request('/api/me',users[0].token,'PATCH',{location:'São Paulo'},400);
    const first=await request('/api/matchmaking/join',users[0].token,'POST',{mode:'2v2'});assert.equal(first.needed,4);assert.equal(first.waiting,1);
    assert.equal((await request('/api/matchmaking/join',users[0].token,'POST',{mode:'2v2'})).waiting,1);
    await request('/api/matchmaking/join',users[1].token,'POST',{mode:'3v3'});await request('/api/matchmaking/join',users[2].token,'POST',{mode:'4v4'});await request('/api/matchmaking/join',users[3].token,'POST',{});
    await request('/api/matchmaking/join',users[0].token,'POST',{mode:'__proto__'},400);
    const mixed=await request('/api/matchmaking/status',users[0].token);assert.deepEqual(mixed.modeCounts,{'2v2':1,'3v3':1,'4v4':1,'5v5':1});assert.equal(mixed.players.length,1);
    const swapped=await request('/api/matchmaking/join',users[0].token,'POST',{mode:'3v3'});assert.equal(swapped.waiting,2);assert.equal(swapped.modeCounts['2v2'],0);await request('/api/matchmaking/join',users[0].token,'POST',{mode:'2v2'});
    let db=read();db.queue.find(entry=>entry.userId===users[1].user.id).lastSeen=new Date(Date.now()-31000).toISOString();write(db);
    assert.equal((await request('/api/matchmaking/status',users[0].token)).modeCounts['3v3'],0);await request('/api/matchmaking/join',users[1].token,'POST',{mode:'3v3'});
    const groups={'2v2':[0,4,5,6],'3v3':[1,7,8,9,10,11],'4v4':[2,12,13,14,15,16,17,18],'5v5':[3,19,20,21,22,23,24,25,26,27]};
    for(const [mode,indices]of Object.entries(groups)){
      let match;for(const index of indices.slice(1)){const result=await request('/api/matchmaking/join',users[index].token,'POST',{mode});assert.equal(result.needed,MODES[mode].needed);if(result.match)match=result.match;}
      assert.ok(match,mode+' não formou partida');assert.equal(match.mode,mode);assert.deepEqual(match.teams.map(team=>team.length),[MODES[mode].teamSize,MODES[mode].teamSize]);assert.deepEqual(new Set(match.teams.flat().map(player=>player.id)),new Set(indices.map(index=>users[index].user.id)));
      const token=users[indices[0]].token;const ready=await request('/api/matchmaking/heartbeat',token,'POST',{});assert.equal(ready.match.id,match.id);
      await request(`/api/chats/${match.id}/messages`,users[28].token,'GET',null,403);await request(`/api/matches/${match.id}/complete`,token,'POST',{},409);
      for(const index of indices)await request(`/api/matches/${match.id}/confirm`,users[index].token,'POST',{});
      const done=await request(`/api/matches/${match.id}/complete`,token,'POST',{});assert.equal(done.user.xp,100);assert.equal((await request(`/api/matches/${match.id}/complete`,token,'POST',{})).user.xp,100);
      await request(`/api/chats/${match.id}/messages`,token,'POST',{text:'Jogo '+mode},201);assert.equal((await request(`/api/chats/${match.id}/messages`,users[indices[1]].token)).messages[0].text,'Jogo '+mode);
    }
    const courts=await request('/api/courts?lat=-7.9938&lon=-34.8416');assert.ok(courts.courts.some(court=>court.id==='olinda-vila-olimpica'));assert.ok(courts.courts.every(court=>! /basquete/i.test(court.name)));
    for(const asset of ['login','home','ball','controle-bola','passe-parede','agilidade','finalizacoes']){const response=await fetch(`${base}/assets/visuals/${asset}.webp`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');}
    assert.equal((await fetch(base+'/assets/visuals/prompts.json')).status,404);
    console.log('PASS: filas 2 × 2, 3 × 3, 4 × 4 e 5 × 5 isoladas, troca e duplicação, expiração, usuários reais, chats, confirmação, pontos, cidade/UF, Olinda e imagens.');
  }finally{child.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
