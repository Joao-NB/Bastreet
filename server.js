require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { createStore } = require('./storage');
const port = Number(process.env.PORT) || 4173;
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const dbFile = path.join(dataDir, 'db.json');
const courtsCacheFile = path.join(dataDir, 'courts-cache.json');
const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@teste.com').trim().toLowerCase();
let adminEnsured = false;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml; charset=utf-8', '.ico':'image/x-icon' };
const courts = [
  {id:'parque-santana',name:'Parque Santana Ariano Suassuna',area:'Santana',lat:-8.0298,lon:-34.9147,light:true,surface:'Piso esportivo',open:'22h',source:'verified'},
  {id:'parque-jaqueira',name:'Parque da Jaqueira',area:'Jaqueira',lat:-8.0363,lon:-34.9045,light:true,surface:'Concreto',open:'22h',source:'verified'}
];
const recifeOsmSnapshot=[
  {id:'osm-way-580987421',name:'Quadra de basquete — Zona Oeste',area:'Recife',lat:-8.03396,lon:-34.951406,light:false,surface:'Não informada',open:'Não informado',access:'yes',source:'osm'},
  {id:'osm-way-580987424',name:'Quadra de basquete — Cordeiro',area:'Recife',lat:-8.036322,lon:-34.9471202,light:false,surface:'Não informada',open:'Não informado',access:'yes',source:'osm'},
  {id:'osm-way-678531211',name:'Quadra de basquete — Torre',area:'Torre',lat:-8.0439104,lon:-34.9149406,light:false,surface:'Não informada',open:'Não informado',access:'yes',source:'osm'},
  {id:'osm-way-969854180',name:'Quadra da Igreja dos Mórmons',area:'Recife',lat:-8.0551282,lon:-34.8900594,light:false,surface:'Pavimentada',open:'Não informado',access:'permissive',hoops:'2',source:'osm'}
];
const olindaRegionalCourts=[
  {id:'olinda-vila-olimpica',name:'Vila Olímpica de Rio Doce',area:'Rio Doce',lat:-7.9591785,lon:-34.8470931,light:true,surface:'Quadra poliesportiva',open:'Consulte os horários',access:'public',source:'regional'},
  {id:'olinda-milton-pina',name:'Quadra Poliesportiva Milton Pina',area:'Bultrins',lat:-7.9975092,lon:-34.8498435,light:true,surface:'Quadra poliesportiva',open:'Não informado',access:'public',source:'regional'},
  {id:'olinda-ouro-preto',name:'Quadra de Basquete de Ouro Preto',area:'Ouro Preto',lat:-7.9872912,lon:-34.8578441,light:false,surface:'Quadra comunitária',open:'Não informado',access:'public',source:'regional'}
];
const metroCenter={lat:-8.0084,lon:-34.8911};
const MATCH_SIZE=6, QUEUE_TTL=30000;
const cityCenters={recife:{lat:-8.0476,lon:-34.9084},olinda:{lat:-7.9938,lon:-34.8416},paulista:{lat:-7.9408,lon:-34.8731},jaboatao:{lat:-8.1128,lon:-35.0148},camaragibe:{lat:-8.0217,lon:-34.9812},igarassu:{lat:-7.8348,lon:-34.9064},'abreu e lima':{lat:-7.9012,lon:-34.8991},'sao lourenco':{lat:-8.0014,lon:-35.0189},'cabo de santo agostinho':{lat:-8.2839,lon:-35.0321}};
const workouts={
  'controle-bola':{name:'Controle de bola',difficulty:'Iniciante',seconds:60,xp:40},
  'passe-parede':{name:'Passe na parede',difficulty:'Iniciante',seconds:75,xp:45},
  'agilidade':{name:'Explosão e agilidade',difficulty:'Intermediário',seconds:120,xp:65},
  'finalizacoes':{name:'Finalizações',difficulty:'Avançado',seconds:180,xp:90}
};
function cityOf(location){const value=String(location||'').split(',')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return Object.keys(cityCenters).find(city=>value.includes(city))||value||'recife'}
async function coordinatesForCity(city){if(cityCenters[city])return cityCenters[city];try{const response=await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({q:`${city}, Pernambuco, Brasil`,format:'json',limit:'1'})}`,{headers:{'User-Agent':'BASTREET-Academic-MVP/1.0'},signal:AbortSignal.timeout(6000)});if(!response.ok)throw new Error('Serviço indisponível');const [place]=await response.json();if(!place)throw new Error('Cidade não encontrada');cityCenters[city]={lat:Number(place.lat),lon:Number(place.lon)};return cityCenters[city]}catch{const error=new Error(`Não foi possível localizar ${city}. Confira a cidade no perfil e tente novamente.`);error.public=true;throw error}}
function weekStart(value=new Date()){const day=new Date(value);day.setUTCHours(0,0,0,0);day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));return day.toISOString().slice(0,10)}
function trainingState(db,user){const today=new Date().toISOString().slice(0,10),week=weekStart();const own=(db.trainings||[]).filter(item=>item.userId===user.id);const weekly=own.filter(item=>weekStart(item.day)===week).length;return {weekly,goal:5,today:own.filter(item=>item.day===today).map(item=>item.workoutId),sessions:own.length,unlocked:{Iniciante:true,Intermediário:weekly>=3,Avançado:weekly>=5}}}
function activeQueue(db){const now=Date.now();db.queue=(db.queue||[]).filter(item=>db.users.some(user=>user.id===item.userId)&&now-new Date(item.lastSeen||item.createdAt).getTime()<QUEUE_TTL);return db.queue}
function memberIds(match){return match.teams.flat().map(player=>player.id)}
function publicPlayer(user){return {id:user.id,name:user.name,location:user.location,position:user.position}}
function publicMatch(match){return {...match,teams:match.teams.map(team=>team.map(publicPlayer))}}
async function pickCourtForPlayers(players){
  const cities=players.map(player=>cityOf(player.location));const counts={};cities.forEach(city=>counts[city]=(counts[city]||0)+1);
  for(const city of [...new Set(cities)])await coordinatesForCity(city);
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const majority=sorted[0][1]>players.length/2?sorted[0][0]:null;
  const center=majority?cityCenters[majority]:{lat:cities.reduce((sum,city)=>sum+cityCenters[city].lat,0)/cities.length,lon:cities.reduce((sum,city)=>sum+cityCenters[city].lon,0)/cities.length};
  const live=await searchOsmCourts(center.lat,center.lon,12000);
  const candidates=[...courts,...recifeOsmSnapshot,...olindaRegionalCourts,...live.results].filter((court,index,list)=>list.findIndex(other=>other.id===court.id)===index&&court.access!=='private'&&km(center.lat,center.lon,court.lat,court.lon)<20);
  const ranked=candidates.map(court=>{const distances=cities.map(city=>km(court.lat,court.lon,cityCenters[city].lat,cityCenters[city].lon));const sameCity=majority&&km(court.lat,court.lon,cityCenters[majority].lat,cityCenters[majority].lon)<5;return {court,score:Math.max(...distances)*.65+distances.reduce((a,b)=>a+b,0)/distances.length*.35+(majority&&!sameCity?15:0)} }).sort((a,b)=>a.score-b.score);
  if(!ranked.length){const error=new Error('Nenhuma quadra de basquete foi encontrada perto das cidades do grupo.');error.public=true;throw error}
  return {court:ranked[0].court,region:majority?majority[0].toUpperCase()+majority.slice(1):sorted.map(item=>item[0][0].toUpperCase()+item[0].slice(1)).join(' / ')};
}
const inRecifeOlinda=(lat,lon)=>km(lat,lon,metroCenter.lat,metroCenter.lon)<=40;
const regionalLiveCache=new Map(),regionalRefreshes=new Map(),regionalRefreshFailures=new Map();
let mutationQueue=Promise.resolve();
function serializeMutation(task){const run=mutationQueue.catch(()=>undefined).then(task);mutationQueue=run.catch(()=>undefined);return run}
function adminSeed(){const password=process.env.ADMIN_PASSWORD;if(!password)return null;const pass=secure(password);return {id:crypto.randomUUID(),name:'Administrador BASTREET',email:adminEmail,passwordHash:pass.hash,salt:pass.salt,age:21,height:180,location:'Recife, PE',position:'Administrador',gender:'Prefiro não informar',level:'Intermediário',availability:['Ter','Qui','Sáb'],skill:85,xp:0,semesterPoints:0,role:'admin',createdAt:new Date().toISOString()}}
function demoUsers(){return [['Ruan Deud','ruan@bastreet.demo','quadra123','Homem',184,'Armador',76],['João Guilherme','joao@bastreet.demo','quadra123','Homem',182,'Ala-armador',78],['Daniel Moura','daniel@bastreet.demo','quadra123','Homem',191,'Pivô',74],['Bárbara Menezes','barbara@bastreet.demo','quadra123','Mulher',177,'Ala',80]].map(([name,email,password,gender,height,position,skill])=>{const pass=secure(password);return {id:crypto.randomUUID(),name,email,passwordHash:pass.hash,salt:pass.salt,age:21,height,location:'Recife, PE',position,gender,level:'Intermediário',availability:['Ter','Qui','Sáb'],skill,xp:0,semesterPoints:0,role:'player',createdAt:new Date().toISOString()}})}
function initialDb(){
  const shouldSeedDemo = !process.env.DATABASE_URL && process.env.SEED_DEMO === 'true';
  return {
    users: shouldSeedDemo ? demoUsers() : [],
    sessions: [],
    trainings: [],
    checkins: [],
    messages: [],
    queue: [],
    matches: [],
    eventParticipants: []
  };
}
function ensureAdmin(db){
  if(adminEnsured)return false;
  adminEnsured=true;
  let user=db.users.find(item=>item.email===adminEmail),changed=false;
  if(!user){user=adminSeed();if(user){db.users.push(user);changed=true}}
  if(!user)return changed;
  if(user.role!=='admin'){user.role='admin';changed=true}
  return changed;
}
function initialStoredState(){try{return JSON.parse(fs.readFileSync(dbFile,'utf8'))}catch{return initialDb()}}
const store=createStore({connectionString:process.env.DATABASE_URL,file:dbFile,initialState:initialStoredState});
async function readDb(){return store.read()}
async function writeDb(db){await store.write(db)}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
function body(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>1e6)reject(new Error('Payload grande'))});req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch{reject(new Error('JSON inválido'))}})})}
function secure(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function safe(user){const {passwordHash,salt,...result}=user;return result}
function currentUser(req,db){const token=(req.headers.authorization||'').replace(/^Bearer /,'');const session=db.sessions.find(item=>item.token===token);return session?db.users.find(user=>user.id===session.userId):null}
function requireUser(req,res,db){const user=currentUser(req,db);if(!user)json(res,401,{error:'Faça login para continuar.'});return user}
function km(a,b,c,d){const r=v=>v*Math.PI/180;const x=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function readCourtCache(){try{return JSON.parse(fs.readFileSync(courtsCacheFile,'utf8'))}catch{return null}}
async function searchOsmCourts(lat,lon,radius=8000,force=false){
  const cache=readCourtCache(),fresh=cache&&Date.now()-new Date(cache.updatedAt).getTime()<86400000,sameArea=cache?.center&&km(lat,lon,cache.center.lat,cache.center.lon)<2,enoughRadius=(cache?.radius||0)>=radius;
  if(cache&&fresh&&sameArea&&enoughRadius&&!force)return {...cache,cache:true};
  const query=`[out:json][timeout:25];nwr(around:${radius},${lat},${lon})["sport"="basketball"];out center tags;`;
  try{
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
    const requests=endpoints.map(async endpoint=>{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BASTREET-Academic-MVP/1.0'},body:`data=${encodeURIComponent(query)}`,signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error(`${endpoint}: ${response.status}`);return response.json()});
    const data=await Promise.any(requests);
    const results=data.elements.map(item=>{const tags=item.tags||{},point=item.center||item;return {id:`osm-${item.type}-${item.id}`,name:tags.name||'Quadra de basquete',area:tags['addr:suburb']||tags['addr:neighbourhood']||'Região próxima',lat:point.lat,lon:point.lon,light:tags.lit==='yes',surface:tags.surface||'Não informada',open:tags.opening_hours||'Não informado',access:tags.access||'yes',hoops:tags.hoops||null,source:'osm'}}).filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lon));
    const value={updatedAt:new Date().toISOString(),center:{lat,lon},radius,results};fs.writeFileSync(courtsCacheFile,JSON.stringify(value,null,2));return {...value,cache:false};
  }catch(error){console.error('Falha no Overpass:',error.message);if(cache&&sameArea)return {...cache,cache:true,stale:true};if(km(lat,lon,-8.0476,-34.9084)<30)return {updatedAt:'2026-09-01T00:00:00.000Z',center:{lat:-8.0476,lon:-34.9084},radius:25000,results:recifeOsmSnapshot,cache:true,stale:true};return {updatedAt:null,results:[],cache:true,stale:true}}
}

function regionalCacheKey(lat,lon){return `${lat.toFixed(2)}:${lon.toFixed(2)}`}
function queueRegionalRefresh(lat,lon,radius){
  const key=regionalCacheKey(lat,lon),failedAt=regionalRefreshFailures.get(key)||0;
  if(regionalRefreshes.has(key))return true;
  if(Date.now()-failedAt<60000)return false;
  const task=searchOsmCourts(lat,lon,radius,true).then(value=>{if(value.stale){regionalRefreshFailures.set(key,Date.now());return}regionalLiveCache.set(key,value);regionalRefreshFailures.delete(key)}).catch(error=>{regionalRefreshFailures.set(key,Date.now());console.error('Atualização regional:',error.message)}).finally(()=>regionalRefreshes.delete(key));
  regionalRefreshes.set(key,task);return true;
}

async function api(req,res,url){
  const db=await readDb(),method=req.method;
  if(method==='GET'&&url.pathname==='/api/health')return json(res,200,{status:'ok',service:'bastreet',database:store.kind,persistent:store.persistent,time:new Date().toISOString()});
  if(method==='POST'&&url.pathname==='/api/auth/register'){
    const input=await body(req),email=String(input.email||'').trim().toLowerCase();
    if(!email.includes('@')||String(input.password||'').length<6||!String(input.name||'').trim())return json(res,400,{error:'Preencha nome, e-mail válido e senha com 6 caracteres.'});
    if(db.users.some(user=>user.email===email))return json(res,409,{error:'Este e-mail já está cadastrado.'});
    const pass=secure(input.password);
    const user={
      id:crypto.randomUUID(),
      name:String(input.name).trim(),
      email,
      passwordHash:pass.hash,
      salt:pass.salt,
      age:Number(input.age)||18,
      height:Number(input.height)||175,
      location:String(input.location||'').trim().slice(0,100),
      position:input.position||'Ala',
      gender:input.gender||'Prefiro não informar',
      level:0,
      availability:Array.isArray(input.availability)?input.availability:[],
      skill:0,
      xp:0,
      semesterPoints:0,
      role:'player',
      createdAt:new Date().toISOString()
    };
    if(!user.location)return json(res,400,{error:'Informe sua cidade no perfil.'});
    const token=crypto.randomBytes(24).toString('hex');
    db.users.push(user);
    db.sessions.push({token,userId:user.id});
    await writeDb(db);
    return json(res,201,{token,user:safe(user)});
  }
  if(method==='POST'&&url.pathname==='/api/auth/login'){
    const input=await body(req),user=db.users.find(item=>item.email===String(input.email||'').trim().toLowerCase());
    if(!user||secure(String(input.password||''),user.salt).hash!==user.passwordHash)return json(res,401,{error:'E-mail ou senha incorretos.'});
    const token=crypto.randomBytes(24).toString('hex');db.sessions=db.sessions.filter(item=>item.userId!==user.id);db.sessions.push({token,userId:user.id});await writeDb(db);return json(res,200,{token,user:safe(user)});
  }
  if(method==='GET'&&url.pathname==='/api/me'){const user=requireUser(req,res,db);if(user){const ranking=db.users.filter(item=>item.role!=='admin'&&cityOf(item.location)===cityOf(user.location)&&(item.semesterPoints||0)>0).sort((a,b)=>(b.semesterPoints||0)-(a.semesterPoints||0));return json(res,200,{user:safe(user),stats:{rank:ranking.findIndex(item=>item.id===user.id)+1,matches:(db.matches||[]).filter(match=>match.completed?.includes(user.id)).length,trainings:(db.trainings||[]).filter(item=>item.userId===user.id).length}})}return}
  if(method==='PATCH'&&url.pathname==='/api/me'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req),location=String(input.location||'').trim().slice(0,100);if(!location)return json(res,400,{error:'Informe sua cidade.'});user.location=location;await writeDb(db);return json(res,200,{user:safe(user)})}
  if(method==='GET'&&url.pathname==='/api/courts'){
    const lat=Number(url.searchParams.get('lat'))||-8.0476,lon=Number(url.searchParams.get('lon'))||-34.9084,now=Date.now(),force=url.searchParams.get('refresh')==='1',activeCheckins=db.checkins.filter(item=>now-new Date(item.createdAt).getTime()<14400000);db.checkins=activeCheckins;
    let radius=Math.min(30000,Math.max(8000,Number(url.searchParams.get('radius'))||8000)),osm,regional=inRecifeOlinda(lat,lon),refreshing=false;
    if(regional){
      const key=regionalCacheKey(lat,lon),diskCache=readCourtCache(),diskNearby=diskCache?.center&&km(lat,lon,diskCache.center.lat,diskCache.center.lon)<3&&(diskCache.radius||0)>=radius&&Date.now()-new Date(diskCache.updatedAt).getTime()<86400000,liveCache=regionalLiveCache.get(key)||(diskNearby?diskCache:null);
      if(liveCache)regionalLiveCache.set(key,liveCache);
      const liveResults=liveCache?.results||[],snapshot=[...recifeOsmSnapshot,...olindaRegionalCourts,...liveResults].filter((court,index,list)=>list.findIndex(item=>item.id===court.id)===index);
      let nearby=snapshot.filter(court=>km(lat,lon,court.lat,court.lon)<=radius/1000);
      if(nearby.length<3&&radius<25000){radius=25000;nearby=snapshot.filter(court=>km(lat,lon,court.lat,court.lon)<=25)}
      osm={updatedAt:liveCache?.updatedAt||'2026-09-01T00:00:00.000Z',results:nearby,cache:true,regional:true,live:Boolean(liveCache)};
      if(force||!liveCache)refreshing=queueRegionalRefresh(lat,lon,Math.min(radius,12000));
    }else{
      osm=await searchOsmCourts(lat,lon,radius,force);
      if(osm.results.length<3&&radius<25000){radius=25000;osm=await searchOsmCourts(lat,lon,radius,true)}
    }
    const verified=courts.filter(court=>km(lat,lon,court.lat,court.lon)<=radius/1000),seen=new Set(verified.map(court=>court.name.toLowerCase())),merged=[...verified,...osm.results.filter(court=>!seen.has(court.name.toLowerCase()))];
    return json(res,200,{courts:merged.map(court=>({...court,distance:km(lat,lon,court.lat,court.lon),players:db.checkins.filter(item=>item.courtId===court.id).length})).sort((a,b)=>a.distance-b.distance),meta:{cache:osm.cache,stale:Boolean(osm.stale),regional:Boolean(osm.regional),live:Boolean(osm.live),refreshing,updatedAt:osm.updatedAt,osmResults:osm.results.length,radius:radius/1000,expanded:radius>8000}});
  }
  const checkin=url.pathname.match(/^\/api\/courts\/([^/]+)\/checkin$/);
  if(method==='POST'&&checkin){const user=requireUser(req,res,db);if(!user)return;db.checkins=db.checkins.filter(item=>item.userId!==user.id);db.checkins.push({userId:user.id,userName:user.name,courtId:checkin[1],createdAt:new Date().toISOString()});await writeDb(db);return json(res,200,{ok:true})}
  if(method==='GET'&&url.pathname==='/api/chats'){const user=requireUser(req,res,db);if(!user)return;return json(res,200,{chats:[{id:'global',name:'Comunidade BASTREET',type:'global'},...(db.matches||[]).filter(match=>memberIds(match).includes(user.id)).reverse().map(match=>({id:match.id,name:`Partida • ${match.region||match.court?.area||'Quadra'}`,type:'private',court:match.court?.name,members:memberIds(match).length}))]})}
  const chatPath=url.pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
  if(chatPath&&(method==='GET'||method==='POST')){const user=requireUser(req,res,db);if(!user)return;const chatId=chatPath[1],match=chatId==='global'?null:(db.matches||[]).find(item=>item.id===chatId);if(chatId!=='global'&&(!match||!memberIds(match).includes(user.id)))return json(res,403,{error:'Você não participa desta conversa.'});db.messages=db.messages||[];if(method==='GET')return json(res,200,{messages:db.messages.filter(item=>item.chatId===chatId||(chatId==='global'&&!item.chatId&&!String(item.userId).startsWith('bot'))).slice(-100)});const input=await body(req),text=String(input.text||'').trim().slice(0,500);if(!text)return json(res,400,{error:'Mensagem vazia.'});const message={id:crypto.randomUUID(),chatId,userId:user.id,userName:user.name,text,createdAt:new Date().toISOString()};db.messages.push(message);await writeDb(db);return json(res,201,{message})}
  if(method==='GET'&&url.pathname==='/api/trainings'){const user=requireUser(req,res,db);if(!user)return;const state=trainingState(db,user);const ranking=Object.keys(workouts).reduce((all,id)=>{const difficulty=workouts[id].difficulty;all[difficulty]??=[];return all},{});for(const [difficulty] of Object.entries(ranking)){ranking[difficulty]=db.users.filter(item=>item.role!=='admin').map(item=>({id:item.id,name:item.name,completed:(db.trainings||[]).filter(session=>session.userId===item.id&&workouts[session.workoutId]?.difficulty===difficulty).length})).filter(item=>item.completed>0).sort((a,b)=>b.completed-a.completed).slice(0,10)}const inProgress=(db.trainingStarts||[]).find(item=>item.userId===user.id&&!state.today.includes(item.workoutId));return json(res,200,{state,workouts,ranking,inProgress:inProgress?{...inProgress,seconds:workouts[inProgress.workoutId]?.seconds}:null})}
  if(method==='POST'&&url.pathname==='/api/trainings/start'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req),workout=workouts[input.workoutId],state=trainingState(db,user);if(!workout)return json(res,404,{error:'Treino não encontrado.'});if(!state.unlocked[workout.difficulty])return json(res,403,{error:'Complete a meta semanal para liberar este treino.'});if(state.today.includes(input.workoutId))return json(res,409,{error:'Treino já concluído hoje.'});db.trainingStarts=db.trainingStarts||[];const startedAt=new Date().toISOString();db.trainingStarts=db.trainingStarts.filter(item=>!(item.userId===user.id&&item.workoutId===input.workoutId));db.trainingStarts.push({userId:user.id,workoutId:input.workoutId,startedAt});await writeDb(db);return json(res,200,{startedAt,seconds:workout.seconds})}
  if(method==='POST'&&url.pathname==='/api/trainings'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req),workout=workouts[input.workoutId],state=trainingState(db,user),start=(db.trainingStarts||[]).find(item=>item.userId===user.id&&item.workoutId===input.workoutId);if(!workout)return json(res,404,{error:'Treino não encontrado.'});if(state.today.includes(input.workoutId))return json(res,409,{error:'Treino já concluído hoje.'});if(!start||Date.now()-new Date(start.startedAt).getTime()<workout.seconds*1000)return json(res,400,{error:'Conclua o tempo do exercício antes de finalizar.'});const points=Math.round(workout.xp*.5);user.xp=(user.xp||0)+workout.xp;user.level=Math.floor(user.xp/1000);user.semesterPoints=(user.semesterPoints||0)+points;user.skill=Math.min(99,(user.skill||0)+1);db.trainings.push({id:crypto.randomUUID(),userId:user.id,workoutId:input.workoutId,day:new Date().toISOString().slice(0,10),xp:workout.xp,points,createdAt:new Date().toISOString()});db.trainingStarts=db.trainingStarts.filter(item=>item!==start);await writeDb(db);return json(res,201,{user:safe(user),xp:workout.xp,points,state:trainingState(db,user)})}
  if(method==='POST'&&url.pathname==='/api/matchmaking/join'){const user=requireUser(req,res,db);if(!user)return;await body(req);activeQueue(db);const existing=(db.matches||[]).find(match=>memberIds(match).includes(user.id)&&!match.confirmed?.includes(user.id));if(existing)return json(res,200,{waiting:db.queue.length,needed:MATCH_SIZE,match:publicMatch(existing),players:[]});db.queue=db.queue.filter(item=>item.userId!==user.id);db.queue.push({userId:user.id,createdAt:new Date().toISOString(),lastSeen:new Date().toISOString()});let match=null;if(db.queue.length>=MATCH_SIZE){const selected=db.queue.slice(0,MATCH_SIZE).map(item=>db.users.find(player=>player.id===item.userId));const picked=await pickCourtForPlayers(selected);match={id:crypto.randomUUID(),slot:'Horário a combinar no chat',teams:[selected.slice(0,3).map(publicPlayer),selected.slice(3,6).map(publicPlayer)],court:picked.court,region:picked.region,confirmed:[],completed:[],createdAt:new Date().toISOString()};db.matches.push(match);db.queue=db.queue.filter(item=>!selected.some(player=>player.id===item.userId))}await writeDb(db);return json(res,200,{waiting:db.queue.length,needed:MATCH_SIZE,match:match?publicMatch(match):null,players:db.queue.map(item=>({name:db.users.find(user=>user.id===item.userId)?.name||'Jogador',location:db.users.find(user=>user.id===item.userId)?.location||''}))})}
  if(method==='POST'&&url.pathname==='/api/matchmaking/leave'){const user=requireUser(req,res,db);if(!user)return;db.queue=(db.queue||[]).filter(item=>item.userId!==user.id);await writeDb(db);return json(res,200,{ok:true})}
  if(method==='POST'&&url.pathname==='/api/matchmaking/heartbeat'){const user=requireUser(req,res,db);if(!user)return;activeQueue(db);const entry=db.queue.find(item=>item.userId===user.id);if(entry){entry.lastSeen=new Date().toISOString();await writeDb(db)}const match=[...(db.matches||[])].reverse().find(item=>memberIds(item).includes(user.id)&&!item.confirmed?.includes(user.id));return json(res,200,{match:match?publicMatch(match):null,waiting:db.queue.length,needed:MATCH_SIZE,queued:Boolean(entry),players:db.queue.map(item=>({name:db.users.find(player=>player.id===item.userId)?.name||'Jogador',location:db.users.find(player=>player.id===item.userId)?.location||''}))})}
  if(method==='GET'&&url.pathname==='/api/matchmaking/status'){const user=requireUser(req,res,db);if(!user)return;activeQueue(db);const match=[...(db.matches||[])].reverse().find(item=>memberIds(item).includes(user.id)&&!item.confirmed?.includes(user.id));return json(res,200,{match:match?publicMatch(match):null,waiting:db.queue.length,needed:MATCH_SIZE,queued:db.queue.some(item=>item.userId===user.id),players:db.queue.map(item=>({name:db.users.find(player=>player.id===item.userId)?.name||'Jogador',location:db.users.find(player=>player.id===item.userId)?.location||''}))})}
  const confirmMatch=url.pathname.match(/^\/api\/matches\/([^/]+)\/confirm$/);if(method==='POST'&&confirmMatch){const user=requireUser(req,res,db);if(!user)return;const match=(db.matches||[]).find(item=>item.id===confirmMatch[1]);if(!match||!memberIds(match).includes(user.id))return json(res,403,{error:'Partida não encontrada para sua conta.'});match.confirmed=match.confirmed||[];if(!match.confirmed.includes(user.id))match.confirmed.push(user.id);await writeDb(db);return json(res,200,{match:publicMatch(match)})}
  const completeMatch=url.pathname.match(/^\/api\/matches\/([^/]+)\/complete$/);if(method==='POST'&&completeMatch){const user=requireUser(req,res,db);if(!user)return;const match=(db.matches||[]).find(item=>item.id===completeMatch[1]);if(!match||!memberIds(match).includes(user.id))return json(res,403,{error:'Partida não encontrada para sua conta.'});if((match.confirmed||[]).length!==MATCH_SIZE||!match.confirmed.includes(user.id))return json(res,409,{error:'Aguarde a confirmação dos seis jogadores antes de registrar o jogo.'});match.completed=match.completed||[];if(!match.completed.includes(user.id)){match.completed.push(user.id);user.xp=(user.xp||0)+100;user.level=Math.floor(user.xp/1000);user.semesterPoints=(user.semesterPoints||0)+50;user.skill=Math.min(99,(user.skill||0)+1);await writeDb(db)}return json(res,200,{match:publicMatch(match),user:safe(user)})}
  if(method==='GET'&&url.pathname==='/api/matches'){const user=requireUser(req,res,db);if(!user)return;return json(res,200,{matches:(db.matches||[]).filter(match=>memberIds(match).includes(user.id)).reverse().map(publicMatch)})}
  if(method==='GET'&&url.pathname==='/api/ranking'){const user=requireUser(req,res,db);if(!user)return;return json(res,200,{users:db.users.filter(item=>item.role!=='admin'&&(item.semesterPoints||0)>0).map(item=>({id:item.id,name:item.name,location:item.location,position:item.position,semesterPoints:item.semesterPoints||0})).sort((a,b)=>b.semesterPoints-a.semesterPoints)})}
  const eventJoin=url.pathname.match(/^\/api\/events\/([^/]+)\/join$/);
  if(method==='POST'&&eventJoin){const user=requireUser(req,res,db);if(!user)return;db.eventParticipants=db.eventParticipants||[];const exists=db.eventParticipants.some(item=>item.eventId===eventJoin[1]&&item.userId===user.id);if(!exists){db.eventParticipants.push({eventId:eventJoin[1],userId:user.id,userName:user.name,joinedAt:new Date().toISOString()});await writeDb(db)}const participants=db.eventParticipants.filter(item=>item.eventId===eventJoin[1]);return json(res,200,{joined:true,count:participants.length,participants})}
  const eventStatus=url.pathname.match(/^\/api\/events\/([^/]+)$/);
  if(method==='GET'&&eventStatus){db.eventParticipants=db.eventParticipants||[];return json(res,200,{participants:db.eventParticipants.filter(item=>item.eventId===eventStatus[1])})}
  return json(res,404,{error:'Rota não encontrada.'});
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);try{if(url.pathname.startsWith('/api/'))return req.method==='GET'?await api(req,res,url):await serializeMutation(()=>api(req,res,url))}catch(error){console.error(error);return json(res,error.public?422:500,{error:error.public?error.message:'Erro interno do servidor.'})}
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),allowed=['index.html','app.js','styles.css','assets/favicon.svg','assets/og-bastreet.png','node_modules/leaflet/dist/leaflet.js','node_modules/leaflet/dist/leaflet.css','node_modules/leaflet/dist/images/marker-icon.png','node_modules/leaflet/dist/images/marker-icon-2x.png','node_modules/leaflet/dist/images/marker-shadow.png'];if(!allowed.includes(relative)){res.writeHead(404);res.end('Not found');return}const file=path.resolve(root,relative);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return}if(relative==='index.html'){const protocol=String(req.headers['x-forwarded-proto']||'http').split(',')[0],host=String(req.headers.host||`localhost:${port}`).replace(/[^a-zA-Z0-9.:-]/g,''),base=`${protocol}://${host}`,html=fs.readFileSync(file,'utf8').replaceAll('__BASE_URL__',base);res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-cache'});res.end(html);return}const longCache=relative.startsWith('node_modules/')||relative.startsWith('assets/');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':longCache?'public, max-age=604800':'no-cache'});fs.createReadStream(file).pipe(res);
});

async function start(){
  await store.init();
  const db=await store.read();if(ensureAdmin(db))await store.write(db);
  server.listen(port,'0.0.0.0',()=>{const addresses=Object.values(os.networkInterfaces()).flat().filter(item=>item&&item.family==='IPv4'&&!item.internal).map(item=>`http://${item.address}:${port}`);console.log(`BASTREET local: http://localhost:${port}`);console.log(`Banco: ${store.kind}${store.persistent?' (persistente)':' (somente desenvolvimento)'}`);addresses.forEach(address=>console.log(`BASTREET na rede: ${address}`))});
}

start().catch(error=>{console.error('Falha ao iniciar o BASTREET:',error.message);process.exit(1)});
