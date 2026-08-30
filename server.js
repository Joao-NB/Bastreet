const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const port = Number(process.env.PORT) || 4173;
const root = __dirname;
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'db.json');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };
const courts = [
  {id:'beira-mar',name:'Quadra da Beira-Mar',area:'Meireles',lat:-3.7246,lon:-38.4854,light:true,surface:'Piso esportivo',open:'22h'},
  {id:'gentilandia',name:'Praça da Gentilândia',area:'Benfica',lat:-3.7445,lon:-38.5372,light:true,surface:'Concreto',open:'24h'},
  {id:'papicu',name:'Areninha do Papicu',area:'Papicu',lat:-3.7394,lon:-38.4565,light:false,surface:'Piso esportivo',open:'20h'}
];
function initialDb(){return {users:[],sessions:[],trainings:[],checkins:[],messages:[{id:crypto.randomUUID(),userId:'bot',userName:'Rafael (bot)',text:'Bem-vindos ao grupo! Quem topa um treino hoje às 19h?',createdAt:new Date().toISOString()}],queue:[],matches:[]}}
function readDb(){if(!fs.existsSync(dataDir))fs.mkdirSync(dataDir,{recursive:true});if(!fs.existsSync(dbFile))fs.writeFileSync(dbFile,JSON.stringify(initialDb(),null,2));return JSON.parse(fs.readFileSync(dbFile,'utf8'))}
function writeDb(db){const temp=`${dbFile}.tmp`;fs.writeFileSync(temp,JSON.stringify(db,null,2));fs.renameSync(temp,dbFile)}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
function body(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>1e6)reject(new Error('Payload grande'))});req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch{reject(new Error('JSON inválido'))}})})}
function secure(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function safe(user){const {passwordHash,salt,...result}=user;return result}
function currentUser(req,db){const token=(req.headers.authorization||'').replace(/^Bearer /,'');const session=db.sessions.find(item=>item.token===token);return session?db.users.find(user=>user.id===session.userId):null}
function requireUser(req,res,db){const user=currentUser(req,db);if(!user)json(res,401,{error:'Faça login para continuar.'});return user}
function km(a,b,c,d){const r=v=>v*Math.PI/180;const x=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function balance(players){const sorted=[...players].sort((a,b)=>b.skill-a.skill),teams=[[],[]],totals=[0,0];sorted.forEach(player=>{const target=totals[0]<=totals[1]?0:1;teams[target].push(safe(player));totals[target]+=player.skill});return teams}

async function api(req,res,url){
  const db=readDb(),method=req.method;
  if(method==='POST'&&url.pathname==='/api/auth/register'){
    const input=await body(req),email=String(input.email||'').trim().toLowerCase();
    if(!email.includes('@')||String(input.password||'').length<6||!String(input.name||'').trim())return json(res,400,{error:'Preencha nome, e-mail válido e senha com 6 caracteres.'});
    if(db.users.some(user=>user.email===email))return json(res,409,{error:'Este e-mail já está cadastrado.'});
    const pass=secure(input.password);const user={id:crypto.randomUUID(),name:String(input.name).trim(),email,passwordHash:pass.hash,salt:pass.salt,age:Number(input.age)||18,height:Number(input.height)||175,location:input.location||'Fortaleza, CE',position:input.position||'Ala',gender:input.gender||'Prefiro não informar',level:input.level||'Iniciante',availability:input.availability||[],skill:input.level==='Avançado'?82:input.level==='Intermediário'?72:60,xp:0,semesterPoints:0,createdAt:new Date().toISOString()};
    const token=crypto.randomBytes(24).toString('hex');db.users.push(user);db.sessions.push({token,userId:user.id});writeDb(db);return json(res,201,{token,user:safe(user)});
  }
  if(method==='POST'&&url.pathname==='/api/auth/login'){
    const input=await body(req),user=db.users.find(item=>item.email===String(input.email||'').trim().toLowerCase());
    if(!user||secure(String(input.password||''),user.salt).hash!==user.passwordHash)return json(res,401,{error:'E-mail ou senha incorretos.'});
    const token=crypto.randomBytes(24).toString('hex');db.sessions=db.sessions.filter(item=>item.userId!==user.id);db.sessions.push({token,userId:user.id});writeDb(db);return json(res,200,{token,user:safe(user)});
  }
  if(method==='GET'&&url.pathname==='/api/me'){const user=requireUser(req,res,db);if(user)return json(res,200,{user:safe(user)});return}
  if(method==='GET'&&url.pathname==='/api/courts'){
    const lat=Number(url.searchParams.get('lat'))||-3.7319,lon=Number(url.searchParams.get('lon'))||-38.5267,now=Date.now();db.checkins=db.checkins.filter(item=>now-new Date(item.createdAt).getTime()<14400000);writeDb(db);
    return json(res,200,{courts:courts.map(court=>({...court,distance:km(lat,lon,court.lat,court.lon),players:db.checkins.filter(item=>item.courtId===court.id).length}))});
  }
  const checkin=url.pathname.match(/^\/api\/courts\/([^/]+)\/checkin$/);
  if(method==='POST'&&checkin){const user=requireUser(req,res,db);if(!user)return;db.checkins=db.checkins.filter(item=>item.userId!==user.id);db.checkins.push({userId:user.id,userName:user.name,courtId:checkin[1],createdAt:new Date().toISOString()});writeDb(db);return json(res,200,{ok:true})}
  if(method==='GET'&&url.pathname==='/api/messages')return json(res,200,{messages:db.messages.slice(-60)});
  if(method==='POST'&&url.pathname==='/api/messages'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req),text=String(input.text||'').trim().slice(0,500);if(!text)return json(res,400,{error:'Mensagem vazia.'});const message={id:crypto.randomUUID(),userId:user.id,userName:user.name,text,createdAt:new Date().toISOString()};db.messages.push(message);writeDb(db);return json(res,201,{message})}
  if(method==='POST'&&url.pathname==='/api/trainings'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req),day=new Date().toISOString().slice(0,10);if(db.trainings.some(item=>item.userId===user.id&&item.workoutId===input.workoutId&&item.day===day))return json(res,409,{error:'Treino já concluído hoje.'});const xp=Math.max(10,Math.min(150,Number(input.xp)||40)),points=input.collective?xp*2:Math.round(xp*.5);user.xp+=xp;user.semesterPoints+=points;user.skill=Math.min(99,user.skill+(input.collective?2:1));db.trainings.push({id:crypto.randomUUID(),userId:user.id,workoutId:input.workoutId,day,xp,points,collective:Boolean(input.collective)});writeDb(db);return json(res,201,{user:safe(user),xp,points})}
  if(method==='POST'&&url.pathname==='/api/matchmaking/join'){const user=requireUser(req,res,db);if(!user)return;const input=await body(req);db.queue=db.queue.filter(item=>item.userId!==user.id);db.queue.push({userId:user.id,slot:input.slot||'Terça • 19h',createdAt:new Date().toISOString()});const queued=db.queue.map(item=>db.users.find(user=>user.id===item.userId)).filter(Boolean);let match=null;if(queued.length>=4){const selected=queued.slice(0,4);match={id:crypto.randomUUID(),teams:balance(selected),court:courts[0],createdAt:new Date().toISOString()};db.matches.push(match);db.queue=db.queue.filter(item=>!selected.some(user=>user.id===item.userId))}writeDb(db);return json(res,200,{waiting:match?0:queued.length,needed:4,match})}
  if(method==='GET'&&url.pathname==='/api/matchmaking/status'){const user=requireUser(req,res,db);if(!user)return;const match=[...db.matches].reverse().find(item=>item.teams.flat().some(player=>player.id===user.id));return json(res,200,{match,waiting:db.queue.length,needed:4})}
  if(method==='GET'&&url.pathname==='/api/ranking')return json(res,200,{users:db.users.map(safe).sort((a,b)=>b.semesterPoints-a.semesterPoints)});
  return json(res,404,{error:'Rota não encontrada.'});
}

http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);try{if(url.pathname.startsWith('/api/'))return await api(req,res,url)}catch(error){console.error(error);return json(res,500,{error:'Erro interno do servidor.'})}
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative);if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
}).listen(port,'0.0.0.0',()=>{const addresses=Object.values(os.networkInterfaces()).flat().filter(item=>item&&item.family==='IPv4'&&!item.internal).map(item=>`http://${item.address}:${port}`);console.log(`BASTREET local: http://localhost:${port}`);addresses.forEach(address=>console.log(`BASTREET na rede: ${address}`))});
