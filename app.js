const pages = [...document.querySelectorAll('.page')];
const navButtons = [...document.querySelectorAll('[data-page]')];
const overlay = document.querySelector('#match-overlay');
const searchingState = document.querySelector('#searching-state');
const foundState = document.querySelector('#found-state');
const timerLabel = document.querySelector('#search-time');
const toast = document.querySelector('#toast');
let matchTimeout;
let timerInterval;
let matchPoll;
let currentMatch=null;
let lastNotifiedMatchId=null;
let activeChat='global';
let ownUserId='';
let elapsed = 0;
let searchMode='5v5',queueSearchActive=false,lastQueueState=null;
const modeLabels={'2v2':'2 × 2','3v3':'3 × 3','4v4':'4 × 4','5v5':'5 × 5'};
let locationWatch;
let lastLocationUpdate = 0;

const authScreen = document.querySelector('#auth-screen');
const authTabs = [...document.querySelectorAll('[data-auth-tab]')];
const authForms = [...document.querySelectorAll('.auth-form')];
const registerSteps = [...document.querySelectorAll('.register-step')];
// Keep existing logins when changing the brand. Database identifiers remain stable too.
for (const key of ['token','session']) { const previous=localStorage.getItem('bastreet-'+key); if(previous&&!localStorage.getItem('futstreet-'+key))localStorage.setItem('futstreet-'+key,previous); localStorage.removeItem('bastreet-'+key); }
const apiToken = () => localStorage.getItem('futstreet-token') || '';
async function api(path, options = {}) {
  let response;
  try { response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken()}`, ...(options.headers || {}) } }); }
  catch { throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'); }
  const raw = await response.text();
  let result = {};
  try { result = raw ? JSON.parse(raw) : {}; } catch {
    const localPreview = location.protocol === 'file:' || (['localhost','127.0.0.1','[::1]'].includes(location.hostname) && ['5500','5501'].includes(location.port));
    if (localPreview) throw new Error('Abra http://localhost:4173 para entrar ou criar sua conta. Esta prévia não oferece cadastro.');
    throw new Error('O servidor respondeu em um formato inválido. Atualize a página e tente novamente.');
  }
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result;
}

function showRegisterStep(step) {
  registerSteps.forEach(item => item.classList.toggle('active', item.dataset.step === String(step)));
  document.querySelector('#step-number').textContent = step;
  document.querySelectorAll('.register-progress i').forEach((item, index) => item.classList.toggle('active', index < step));
  document.querySelector('#auth-back').hidden = step === 1;
}

function setAuthTab(tab) {
  authTabs.forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
  authForms.forEach(form => form.classList.toggle('active', form.id === `${tab}-form`));
  showRegisterStep(1);
}

function validFields(container) {
  const fields = [...container.querySelectorAll('input, select')];
  fields.forEach(field => field.closest('label')?.classList.toggle('invalid', !field.checkValidity()));
  return fields.every(field => field.checkValidity());
}

function enterApp(message) {
  authScreen.classList.add('leaving');
  setTimeout(() => { authScreen.hidden = true; authScreen.classList.remove('leaving'); }, 350);
  localStorage.setItem('futstreet-session', 'active');
  showPage('inicio');
  if (message) setTimeout(() => showToast(message), 400);
}

authTabs.forEach(button => button.addEventListener('click', () => setAuthTab(button.dataset.authTab)));
document.querySelector('#next-register').addEventListener('click', () => { if (validFields(document.querySelector('[data-step="1"]'))) showRegisterStep(2); });
document.querySelector('#auth-back').addEventListener('click', () => showRegisterStep(1));
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!validFields(event.currentTarget)) return;
  const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Entrando...';
  try { const form = new FormData(event.currentTarget); const result = await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password')})}); localStorage.setItem('futstreet-token',result.token); enterApp(`Bem-vindo, ${result.user.name}! ⚽`); applyUser(result.user); }
  catch(error){ showToast(error.message); } finally { button.disabled=false; button.innerHTML='Entrar na quadra <span>→</span>'; }
});
document.querySelector('#register-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!validFields(document.querySelector('[data-step="1"]'))) { showRegisterStep(1); return; }
  if (!validFields(document.querySelector('[data-step="2"]'))) return;
  const button = event.currentTarget.querySelector('[type="submit"]');
  if (button.disabled) return;
  const buttonContent = button.innerHTML;
  button.disabled = true; button.textContent = 'Criando conta...';
  const form=new FormData(event.currentTarget),days=[...event.currentTarget.querySelectorAll('.day-picker input:checked')].map(item=>item.parentElement.textContent.trim());
  const payload=Object.fromEntries(form.entries());payload.availability=days;payload.location=`${String(form.get('city')).trim()}, ${form.get('state')}`;delete payload.city;delete payload.state;
  try { const result=await api('/api/auth/register',{method:'POST',body:JSON.stringify(payload)});localStorage.setItem('futstreet-token',result.token);enterApp('Conta criada e salva no servidor!');applyUser(result.user); }
  catch(error){showToast(error.message)}
  finally { button.disabled = false; button.innerHTML = buttonContent; }
});
document.querySelectorAll('.toggle-password').forEach(button => button.addEventListener('click', () => { const input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? '◉' : '◌'; }));
document.querySelector('#logout-button').addEventListener('click', () => { if(searchingState&&!searchingState.hidden)api('/api/matchmaking/leave',{method:'POST'}).catch(()=>{});closeMatchmaking(false);localStorage.removeItem('futstreet-session'); localStorage.removeItem('futstreet-token'); authScreen.hidden = false; setAuthTab('login');clearInterval(workoutTimer);activeWorkout=null; });
document.querySelector('#brand-home').addEventListener('click', event => { event.preventDefault(); showPage('inicio'); history.replaceState(null, '', '#inicio'); });
if (apiToken()) { authScreen.hidden = true; api('/api/me').then(result=>applyUser(result.user,result.stats)).catch(()=>{localStorage.removeItem('futstreet-token');authScreen.hidden=false}); }

function applyUser(user,stats){
  ownUserId=user.id;
  const first=user.name.split(' ')[0],initials=user.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase(),availability=(user.availability||[]).map(day=>day.toLowerCase()).join(', ')||'não informada';
  document.querySelector('#welcome-title').innerHTML=`E aí, <span>${escapeHtml(first)}!</span><br>Pronto pro jogo?`;
  document.querySelector('.hero-copy .eyebrow').textContent=user.location||'SUA REGIÃO';
  document.querySelectorAll('.avatar-button span').forEach(item=>item.textContent=initials);
  document.querySelector('#profile-title').textContent=user.name;
  document.querySelector('.profile-photo').firstChild.nodeValue=initials;
  document.querySelector('#profile-summary').textContent=`⌖ ${user.location} • ${user.gender} • ${user.position}`;
  const [profileCity,profileState='PE']=(user.location||'').split(',');document.querySelector('#profile-city').value=profileCity.trim();document.querySelector('#profile-state').value=profileState.trim().toUpperCase();
  const safeSkill = Number(user.skill ?? 0);
  document.querySelector('#profile-tags').innerHTML=`<span>Nível ${Number(user.level||0)}</span><span>Disponível: ${escapeHtml(availability)}</span><span>Nível técnico ${safeSkill}</span>`;
  document.querySelector('#profile-points').textContent=Number(user.semesterPoints ?? 0).toLocaleString('pt-BR');
  document.querySelector('#home-skill').textContent=Number(user.skill||0);
  document.querySelector('#home-points-count').textContent=Number(user.semesterPoints||0);
  xp=Number(user.xp ?? 0);updateXp();
  if(stats)applyStats(stats);else refreshProfile();
  loadMatches();loadTraining();loadChats();loadQueueCount();loadRanking();
}
function applyStats(stats){document.querySelector('#profile-rank').textContent=stats.rank?`#${stats.rank}`:'0';document.querySelector('#profile-matches').textContent=stats.matches;document.querySelector('#profile-trainings').textContent=stats.trainings;document.querySelector('#home-matches-count').textContent=stats.matches;document.querySelector('#home-training-count').textContent=stats.trainings;const active=stats.matches+stats.trainings>0;document.querySelector('.history-panel h2').textContent=active?'Sua evolução':'Comece a jogar';document.querySelector('.history-panel p:last-child').textContent=active?`${stats.matches} partida${stats.matches===1?'':'s'} jogada${stats.matches===1?'':'s'} e ${stats.trainings} treino${stats.trainings===1?'':'s'} concluído${stats.trainings===1?'':'s'}.`:'Busque uma partida ou conclua um treino para acompanhar seu progresso aqui.'}
document.querySelector('#edit-profile').addEventListener('click',()=>{const form=document.querySelector('#profile-edit-form');form.hidden=!form.hidden;if(!form.hidden)document.querySelector('#profile-city').focus()});
document.querySelector('#profile-edit-form').addEventListener('submit',async event=>{event.preventDefault();try{const result=await api('/api/me',{method:'PATCH',body:JSON.stringify({location:document.querySelector('#profile-city').value.trim()+', '+document.querySelector('#profile-state').value})});document.querySelector('#profile-edit-form').hidden=true;applyUser(result.user);showToast('Cidade atualizada no perfil.')}catch(error){showToast(error.message)}});
async function refreshProfile(){try{const result=await api('/api/me');applyStats(result.stats);document.querySelector('#profile-points').textContent=Number(result.user.semesterPoints||0).toLocaleString('pt-BR');document.querySelector('#home-points-count').textContent=result.user.semesterPoints||0}catch{}}
async function loadQueueCount(){if(!apiToken())return;try{const state=await api('/api/matchmaking/status');renderModeCounts(state);if(state.queued){const resume=!queueSearchActive;queueSearchActive=true;updateQueue(state);if(resume)beginMatchPolling()}else if(!state.match){queueSearchActive=false;renderTrainingQueue()}if(state.match&&!overlay.classList.contains('open')&&lastNotifiedMatchId!==state.match.id){lastNotifiedMatchId=state.match.id;showRealMatch(state.match)}}catch{}}

function showPage(id) {
  pages.forEach(page => page.classList.toggle('active', page.id === id));
  document.querySelectorAll('.bottom-nav [data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if(id==='quadras') openCourtsPage();
  if(id==='chat') loadChats();
  if(id==='partidas') loadMatches();
  if(id==='treinos') loadTraining();
}

navButtons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));

﻿document.querySelectorAll('[data-mode]').forEach(card=>card.addEventListener('click',()=>openMatchmaking(card.dataset.mode)));
function renderModeCounts(state){
  const counts=state.modeCounts||{};
  document.querySelectorAll('[data-mode-count]').forEach(node=>node.textContent=counts[node.dataset.modeCount]||0);
  const quickCount=counts['5v5']??(state.mode==='5v5'?state.waiting:0);
  document.querySelector('#home-queue-count').textContent=`${quickCount} jogador${quickCount===1?'':'es'}`;
}
function renderTrainingQueue(){
  const banner=document.querySelector('#training-queue');banner.hidden=!queueSearchActive;
  if(queueSearchActive&&lastQueueState)document.querySelector('#training-queue-label').textContent=`${modeLabels[searchMode]} · ${lastQueueState.waiting} / ${lastQueueState.needed}`;
}
function updateQueue(state){
  lastQueueState=state;searchMode=state.mode||'5v5';
  document.querySelectorAll('[data-mode]').forEach(node=>node.classList.toggle('selected',node.dataset.mode===searchMode));
  document.querySelector('#queue-needed').textContent=state.needed;
  document.querySelector('#search-title').textContent='Buscando '+modeLabels[searchMode];
  document.querySelector('#queue-description').textContent=`${state.waiting} / ${state.needed} atletas conectados`;
  document.querySelector('#queue-players').innerHTML=(state.players||[]).map(player=>`<span><img src="/assets/ball-flat.svg?v=graphic-3" alt="" width="20" height="20"> ${escapeHtml(player.name)} <small>${escapeHtml(player.location)}</small></span>`).join('');
  renderModeCounts(state);renderTrainingQueue();
}
function beginMatchPolling(){
  clearInterval(timerInterval);clearInterval(matchPoll);
  elapsed=lastQueueState?.queuedAt?Math.max(0,Math.floor((Date.now()-new Date(lastQueueState.queuedAt).getTime())/1000)):0;
  timerInterval=setInterval(()=>{elapsed+=1;timerLabel.textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`},1000);
  matchPoll=setInterval(async()=>{if(!queueSearchActive)return;try{const status=await api('/api/matchmaking/heartbeat',{method:'POST'});if(status.match)showRealMatch(status.match);else if(status.queued)updateQueue(status);else{closeMatchmaking(false);showToast('Sua busca expirou. Entre na fila novamente.')}}catch(error){showToast(error.message)}},4000);
}
async function openMatchmaking(mode='5v5'){
  if(!Object.hasOwn(modeLabels,mode))mode='5v5';
  overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');searchingState.hidden=false;foundState.hidden=true;
  document.querySelector('#search-title').textContent='Buscando '+modeLabels[mode];
  document.querySelector('#queue-description').textContent='Conectando sua comunidade...';
  try{
    const result=await api('/api/matchmaking/join',{method:'POST',body:JSON.stringify({mode})});
    queueSearchActive=Boolean(result.queued);updateQueue(result);
    if(result.match)return showRealMatch(result.match);
    beginMatchPolling();
  }catch(error){closeMatchmaking(false);showToast(error.message)}
}

function showRealMatch(match){lastNotifiedMatchId=match.id;currentMatch=match;queueSearchActive=false;renderTrainingQueue();clearInterval(matchPoll);clearInterval(timerInterval);overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');searchingState.hidden=true;foundState.hidden=false;const panels=foundState.querySelectorAll('.team-balance div');panels[0].querySelector('strong').textContent=match.teams[0].length;panels[1].querySelector('strong').textContent=match.teams[1].length;foundState.querySelector('p:not(.eyebrow)').textContent=`${match.slot} • ${match.court.name} • ${match.region}`;
  if (match.court) {
    const selectedCourt = { ...match.court, players: match.teams.flat().length, distance: distanceKm(userLocation, match.court) };
    courts = [selectedCourt, ...courts.filter(court => court.id !== selectedCourt.id)];
    document.querySelector('#court-count').textContent = Math.max(1, courts.length);
    renderCourts(document.querySelector('#court-filter').value);
    updateMap();
  }
}

function closeMatchmaking(leave=true){
  if(leave&&queueSearchActive&&apiToken())api('/api/matchmaking/leave',{method:'POST'}).catch(()=>{});
  overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');
  clearTimeout(matchTimeout);clearInterval(timerInterval);clearInterval(matchPoll);queueSearchActive=false;renderTrainingQueue();
}
function minimizeMatchmaking(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');showPage('treinos')}
document.querySelector('#train-while-waiting').addEventListener('click',minimizeMatchmaking);
document.querySelector('#resume-search').addEventListener('click',()=>{overlay.classList.add('open');overlay.setAttribute('aria-hidden','false')});
document.querySelector('#leave-training-queue').addEventListener('click',()=>closeMatchmaking(true));
document.querySelector('#find-match').addEventListener('click',()=>openMatchmaking('5v5'));
document.querySelector('#nav-match').addEventListener('click',()=>openMatchmaking('5v5'));
document.querySelector('#close-modal').addEventListener('click',()=>closeMatchmaking());
document.querySelector('#cancel-search').addEventListener('click',()=>closeMatchmaking());
document.querySelector('#confirm-match').addEventListener('click',async()=>{if(!currentMatch)return;try{await api(`/api/matches/${currentMatch.id}/confirm`,{method:'POST'});closeMatchmaking(false);showPage('partidas');showMatchDetails(currentMatch.id);refreshProfile();showToast('Presença confirmada! Veja a quadra e o chat da partida.')}catch(error){showToast(error.message)}});
overlay.addEventListener('click', event => { if (event.target === overlay) closeMatchmaking(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMatchmaking(); });

let myMatches=[];
async function loadMatches(){if(!apiToken())return;try{const result=await api('/api/matches');myMatches=result.matches;const render=match=>`<article class="featured-match"><div><span class="status-pill">${match.completed?.includes(ownUserId)?'PARTIDA JOGADA':match.confirmed?.includes(ownUserId)?'PRESENÇA CONFIRMADA':'AGUARDANDO SUA CONFIRMAÇÃO'}</span><p>${escapeHtml(match.slot)}</p><h2>Futsal ${match.teams[0].length} × ${match.teams[1].length}</h2><p>⌖ ${escapeHtml(match.court.name)} • ${escapeHtml(match.region||'Região próxima')}</p></div><div class="versus"><span>TIME LIMA</span><strong>VS</strong><span>TIME AZUL</span></div><button class="primary-cta compact" data-match-id="${match.id}">Ver partida <span>→</span></button></article>`;document.querySelector('#matches-list').innerHTML=myMatches.length?myMatches.map(render).join(''):'<div class="empty-note">Você ainda não tem partidas. Escolha um formato para encontrar seu próximo time.</div>';document.querySelector('#home-matches').innerHTML=myMatches.length?myMatches.slice(0,2).map(render).join(''):'<p class="empty-note">Nenhuma partida formada ainda. Entre na fila para começar.</p>';document.querySelectorAll('[data-match-id]').forEach(button=>button.addEventListener('click',()=>{showPage('partidas');showMatchDetails(button.dataset.matchId)}))}catch(error){showToast(error.message)}}
function showMatchDetails(id){
  const match=myMatches.find(item=>item.id===id)||currentMatch;
  if(!match)return;
  const detail=document.querySelector('#match-details'),confirmed=match.confirmed?.includes(ownUserId),completed=match.completed?.includes(ownUserId),allConfirmed=(match.confirmed||[]).length===match.teams.flat().length;
  detail.hidden=false;
  detail.innerHTML=`<div class="detail-head"><div><p class="eyebrow">FUTSAL ${match.teams[0].length} × ${match.teams[1].length} • ${escapeHtml(match.region||'REGIÃO')}</p><h2>${escapeHtml(match.court.name)}</h2><p>${escapeHtml(match.slot)} • ${escapeHtml(match.court.area)} • ${match.confirmed?.length||0}/${match.teams.flat().length} presenças confirmadas</p></div><button class="secondary-button" id="close-details">Fechar</button></div><div class="detail-teams">${match.teams.map((team,index)=>`<div><h3>TIME ${index===0?'LIMA':'AZUL'}</h3>${team.map(player=>`<p>⚽ ${escapeHtml(player.name)} <small>${escapeHtml(player.location)}</small></p>`).join('')}</div>`).join('')}</div><div class="detail-actions">${confirmed?'':'<button class="primary-cta" id="detail-confirm">Confirmar presença</button>'}${confirmed&&allConfirmed&&!completed?'<button class="primary-cta" id="detail-complete">Registrar jogo concluído</button>':''}<a class="secondary-button" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(match.court.lat+','+match.court.lon)}">Ir para a quadra no Maps ↗</a><button class="secondary-button" id="detail-chat">Abrir chat privado ↗</button></div><p class="court-caveat">${completed?'Jogo registrado: +100 XP e +50 pontos.':confirmed&&!allConfirmed?'Aguarde todas as confirmações. Após jogar, registre sua participação aqui.':'Confira horário e acesso da quadra com o grupo antes de sair.'}</p>`;
  document.querySelector('#close-details').onclick=()=>detail.hidden=true;
  document.querySelector('#detail-chat').onclick=()=>{activeChat=match.id;showPage('chat')};
  document.querySelector('#detail-confirm')?.addEventListener('click',async()=>{try{await api(`/api/matches/${match.id}/confirm`,{method:'POST'});await loadMatches();showMatchDetails(match.id);refreshProfile()}catch(error){showToast(error.message)}});
  document.querySelector('#detail-complete')?.addEventListener('click',async()=>{try{const result=await api(`/api/matches/${match.id}/complete`,{method:'POST'});xp=result.user.xp;updateXp();document.querySelector('#profile-tags span:first-child').textContent=`Nível ${result.user.level}`;document.querySelector('#home-skill').textContent=result.user.skill;await loadMatches();showMatchDetails(match.id);refreshProfile();loadRanking();showToast('Partida registrada: +100 XP e +50 pontos.')}catch(error){showToast(error.message)}});
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
document.querySelectorAll('.filter-chips button, .tabs button').forEach(button => button.addEventListener('click', () => {
  button.parentElement.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active');
}));

const regionalPreview=[{id:'olinda-vila-olimpica',name:'Vila Olímpica de Rio Doce',area:'Rio Doce · Olinda, PE',lat:-7.9591785,lon:-34.8470931,light:false,surface:'Quadra poliesportiva',open:'Consulte horários e acesso',source:'regional',project:true},{id:'olinda-milton-pina',name:'Quadra Poliesportiva Milton Pina',area:'Bultrins · Olinda, PE',lat:-7.9975092,lon:-34.8498435,light:true,surface:'Quadra poliesportiva',open:'Consulte horários e acesso',source:'regional'}];
let courts = [];
let userLocation = {lat:-7.9938,lon:-34.8416};
let courtsMap,courtMarkers,userMarker,courtsStarted=false,courtsRequest=0,regionalPreviewActive=false,hasLiveLocation=false,lastCourtLocation,courtRefreshTimer,courtRefreshAttempts=0;

function distanceKm(from,to){const rad=value=>value*Math.PI/180,a=Math.sin(rad(to.lat-from.lat)/2)**2+Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lon-from.lon)/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

function ensureCourtsMap(){
  if(courtsMap)return;
  courtsMap=L.map('courts-map',{zoomControl:false,preferCanvas:true,fadeAnimation:false}).setView([-7.9938,-34.8416],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:19,updateWhenIdle:true,keepBuffer:2,detectRetina:false,attribution:'&copy; OpenStreetMap contributors'}).addTo(courtsMap);
  L.control.zoom({position:'topright'}).addTo(courtsMap);
  courtMarkers=L.layerGroup().addTo(courtsMap);
}

function showRegionalPreview(){
  regionalPreviewActive=true;
  courts=regionalPreview.map(court=>({...court,players:0,distance:distanceKm(userLocation,court)}));
  document.querySelector('#court-count').textContent=courts.length;
  document.querySelector('#search-radius').textContent='25 km';
  document.querySelector('#map-source').textContent='Olinda, PE · referências do projeto';
  renderCourts(document.querySelector('#court-filter').value);
  updateMap();
}

function openCourtsPage(){
  ensureCourtsMap();
  if(!courts.length)showRegionalPreview();
  requestAnimationFrame(()=>courtsMap.invalidateSize());
  if(!courtsStarted){courtsStarted=true;loadCourts()}
  startLiveLocation();
}

function updateMap(){
  ensureCourtsMap();
  courtMarkers.clearLayers();const bounds=[];
  if(userMarker){userMarker.remove();userMarker=undefined}if(hasLiveLocation){userMarker=L.circleMarker([userLocation.lat,userLocation.lon],{radius:8,color:'#fff',weight:3,fillColor:'#2477ff',fillOpacity:1}).addTo(courtsMap).bindPopup('<strong>Você está aqui</strong>');bounds.push([userLocation.lat,userLocation.lon])}
  courts.forEach(court=>{const icon=L.divIcon({className:'court-leaflet-icon',html:`<span>⚽</span>${court.source==='verified'?'<i>✓</i>':''}`,iconSize:[42,42],iconAnchor:[21,42]});L.marker([court.lat,court.lon],{icon}).addTo(courtMarkers).bindPopup(`<strong>${escapeHtml(court.name)}</strong><br><small>${court.distance.toFixed(1)} km • ${court.source==='verified'?'Verificada':court.source==='regional'?'Base pública de Olinda':'OpenStreetMap'}</small>`);bounds.push([court.lat,court.lon])});
  if(bounds.length>1)courtsMap.fitBounds(bounds,{padding:[35,35],maxZoom:14});setTimeout(()=>courtsMap.invalidateSize(),30);
}

function renderCourts(sort = 'distance') {
  const filtered=sort==='verified'?courts.filter(court=>court.source==='verified'):[...courts];const list = filtered.sort((a, b) => sort === 'activity' ? b.players - a.players : sort === 'lighting' ? Number(b.light) - Number(a.light) : a.distance - b.distance);
  document.querySelector('#court-list').innerHTML = list.map((court, index) => `<article class="court-card ${index === 0 ? 'selected' : ''}"><div class="court-photo"><span>⚽</span><i>${court.players} presente${court.players===1?'':'s'}</i></div><div class="court-copy"><small>${court.distance.toFixed(1).replace('.', ',')} KM • ${escapeHtml(court.area).toUpperCase()}</small><h3>${escapeHtml(court.name)}</h3><span class="source-badge ${court.source}">${court.source==='verified'?'✓ Verificada pela equipe':court.source==='regional'?'Base pública de Olinda':'OpenStreetMap'}</span><p>${escapeHtml(court.surface)} • ${court.light ? 'Com iluminação' : 'Iluminação não confirmada'} • ${escapeHtml(court.open)}</p><div><button class="court-route" data-lat="${court.lat}" data-lon="${court.lon}" data-court-name="${escapeHtml(court.name)}">Como chegar</button><button class="court-checkin" data-court-id="${court.id}">Estou aqui</button><button class="court-group" data-page="chat">Grupo</button></div></div></article>`).join('')||'<div class="empty-teams"><p>Nenhuma quadra neste filtro.</p></div>';
  document.querySelectorAll('.court-route').forEach(button => button.addEventListener('click', () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${button.dataset.lat},${button.dataset.lon}`,'_blank','noopener')));
  document.querySelectorAll('.court-group').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
  document.querySelectorAll('.court-checkin').forEach(button => button.addEventListener('click', async()=>{try{await api(`/api/courts/${button.dataset.courtId}/checkin`,{method:'POST'});showToast('Presença registrada por 4 horas.');await loadCourts()}catch(error){showToast(error.message)}}));
}

function scheduleCourtRefresh(lat,lon){clearTimeout(courtRefreshTimer);if(courtRefreshAttempts>=3)return;courtRefreshAttempts+=1;courtRefreshTimer=setTimeout(()=>loadCourts(lat,lon,false,true),4500)}
async function loadCourts(lat=userLocation.lat,lon=userLocation.lon,refresh=false,background=false){if(!background){courtRefreshAttempts=0;clearTimeout(courtRefreshTimer)}const request=++courtsRequest;try{document.querySelector('#map-source').textContent=refresh?'Atualizando dados em segundo plano...':'Ajustando resultados à sua região...';const result=await api(`/api/courts?lat=${lat}&lon=${lon}${refresh?'&refresh=1':''}`);if(request!==courtsRequest)return;userLocation={lat,lon};lastCourtLocation={lat,lon};regionalPreviewActive=false;courts=result.courts;document.querySelector('#court-count').textContent=courts.length;document.querySelector('#search-radius').textContent=`${result.meta.radius} km`;document.querySelector('#map-source').textContent=result.meta.refreshing?'Exibindo a base local • buscando mais quadras pelo GPS':result.meta.live?'Quadras atualizadas ao redor do seu GPS':result.meta.regional?'Olinda, PE · referência regional':result.meta.stale?'Modo offline • cache + referência regional':result.meta.expanded?`Busca ampliada automaticamente • ${result.meta.osmResults} no OSM`:result.meta.cache?`Cache local • ${result.meta.osmResults} no OSM`:`Atualizado agora • ${result.meta.osmResults} no OSM`;renderCourts(document.querySelector('#court-filter').value);updateMap();if(result.meta.refreshing)scheduleCourtRefresh(lat,lon);else courtRefreshAttempts=0}catch(error){if(request!==courtsRequest)return;document.querySelector('#map-source').textContent='Base regional ativa • atualização indisponível';showToast(error.message)}}
document.querySelector('#court-filter').addEventListener('change', event => renderCourts(event.target.value));
document.querySelector('#refresh-courts').addEventListener('click',()=>loadCourts(userLocation.lat,userLocation.lon,true));
function startLiveLocation(){
  const button=document.querySelector('#locate-me');
  if(!navigator.geolocation){document.querySelector('#location-label').textContent='GPS indisponível. Exibindo Olinda, PE como referência.';return}
  if(locationWatch!==undefined)return;
  button.textContent='⌛ Solicitando GPS...';
  locationWatch=navigator.geolocation.watchPosition(position=>{
    const now=Date.now(),lat=position.coords.latitude,lon=position.coords.longitude,nextLocation={lat,lon},moved=!lastCourtLocation||distanceKm(lastCourtLocation,nextLocation)>.35;hasLiveLocation=true;userLocation=nextLocation;button.textContent='● GPS em tempo real';button.classList.add('located');
    document.querySelector('#location-label').textContent=`Quadras de futsal ao redor do seu GPS · precisão de ${Math.round(position.coords.accuracy)} m`;
    if(moved&&(now-lastLocationUpdate>15000||lastLocationUpdate===0)){lastLocationUpdate=now;loadCourts(lat,lon)}else updateMap();
  },error=>{if(locationWatch!==undefined)navigator.geolocation.clearWatch(locationWatch);locationWatch=undefined;hasLiveLocation=false;button.classList.remove('located');button.textContent='⌖ Permitir acesso ao GPS';document.querySelector('#location-label').textContent='GPS não autorizado. Usando Olinda, PE como referência.';loadCourts(-7.9938,-34.8416);showToast(error.code===1?'Permita o GPS nas configurações do navegador para resultados exatos.':'Não foi possível obter sua localização agora.')},{enableHighAccuracy:false,maximumAge:15000,timeout:6000});
}
document.querySelector('#locate-me').addEventListener('click',startLiveLocation);

document.querySelector('#build-teams').addEventListener('click',()=>openMatchmaking('5v5'));
let xp=0,workoutTimer=null,activeWorkout=null;
function updateXp(){const level=Math.floor(xp/1000),progress=xp%1000,percent=Math.round(progress/10);document.querySelector('#xp-value').textContent=progress;document.querySelector('#xp-bar').style.width=`${percent}%`;document.querySelector('#player-level').textContent=level;document.querySelector('.level-ring').style.background=`conic-gradient(var(--lime) 0 ${percent}%,#304440 ${percent}%)`;document.querySelector('#home-level').textContent=level;document.querySelector('#home-level-label').textContent=`Nível ${level}`;document.querySelector('#home-xp-label').textContent=`${percent}% para o nível ${level+1}`;document.querySelector('.elo-card .progress i').style.width=`${percent}%`}
updateXp();
﻿let trainingDefinitions={};
function workoutInstructions(workout){return `<div class="drill-prescription"><span><b>${workout.sets}</b> séries</span><span><b>${workout.work}s</b> de prática</span><span><b>${workout.rest}s</b> de pausa</span></div><details class="drill-details"><summary>Como treinar <span>↗</span></summary><p><strong>Prepare:</strong> ${escapeHtml(workout.equipment)}</p><p><strong>Execute:</strong> ${escapeHtml(workout.cue)}</p><p><strong>Acompanhe:</strong> ${escapeHtml(workout.target)}</p><p>O cronômetro inclui ${workout.timeline[0].seconds/60} min de aquecimento e ${workout.timeline.at(-1).seconds/60} min de volta à calma.</p></details>`}
function workoutVisual(id){const name=trainingDefinitions[id]?.name||id;return `<div class="workout-art ${id}"><img src="/assets/visuals/${id}.webp?v=graphic-3" width="960" height="640" loading="lazy" alt="Ilustração do treino: ${escapeHtml(name)}"><span class="art-corner" aria-hidden="true">FUTSTREET / LAB</span></div>`}

async function loadTraining(){if(!apiToken())return;try{const result=await api('/api/trainings'),{state,workouts,ranking}=result;trainingDefinitions=workouts;document.querySelector('#weekly-progress').textContent=`${state.weekly} / ${state.goal}`;document.querySelector('#training-total').textContent=state.sessions;const order=['controle-bola','passe-parede','agilidade','finalizacoes'];document.querySelector('#workout-grid').innerHTML=order.map(id=>{const workout=workouts[id],done=state.today.includes(id),locked=!state.unlocked[workout.difficulty],target=workout.difficulty==='Intermediário'?3:5;return `<article class="workout-card ${done?'done':''} ${locked?'locked':''}" data-workout="${id}">${workoutVisual(id)}<span class="drill-number">0${order.indexOf(id)+1} / FUTSAL LAB</span><span class="workout-place">${escapeHtml(workout.difficulty.toUpperCase())}</span><h3>${escapeHtml(workout.name)}</h3><p>${escapeHtml(workout.description)}</p>${workoutInstructions(workout)}<div class="workout-meta"><span>◷ ${Math.ceil(workout.seconds/60)} min</span><strong>+${workout.xp} XP</strong></div><div class="workout-phase" role="status">Aquecimento → séries → volta à calma</div><div class="session-progress" aria-hidden="true"><i></i></div><div class="workout-clock" role="timer" aria-live="off">${activeWorkout?.id===id?'Em andamento':'Bloco completo: '+Math.floor(workout.seconds/60)+' min'+(workout.seconds%60?' '+(workout.seconds%60)+' s':'')}</div><button class="start-workout" ${done||locked||activeWorkout?'disabled':''}>${done?'✓ Concluído hoje':locked?`🔒 Libera com ${target} treinos na semana`:'Iniciar treino'}</button></article>`}).join('');document.querySelectorAll('.start-workout:not([disabled])').forEach(button=>button.addEventListener('click',()=>startWorkout(button.closest('[data-workout]').dataset.workout)));document.querySelector('#training-ranking-list').innerHTML=Object.entries(ranking).map(([difficulty,players])=>`<div class="training-rank-group"><h3>${escapeHtml(difficulty)}</h3>${players.length?players.map((player,index)=>`<p><span>${index+1}. ${escapeHtml(player.name)}</span><strong>${player.completed} treino${player.completed===1?'':'s'}</strong></p>`).join(''):'<p>Sem treinos concluídos nessa dificuldade.</p>'}</div>`).join('');if(result.inProgress)runWorkoutTimer({id:result.inProgress.workoutId,startedAt:result.inProgress.startedAt,seconds:result.inProgress.seconds})}catch(error){showToast(error.message)}}
async function startWorkout(id){try{const result=await api('/api/trainings/start',{method:'POST',body:JSON.stringify({workoutId:id})});runWorkoutTimer({id,startedAt:result.startedAt,seconds:result.seconds})}catch(error){showToast(error.message)}}
function runWorkoutTimer(workout){activeWorkout=workout;document.querySelectorAll('.start-workout').forEach(button=>button.disabled=true);clearInterval(workoutTimer);const tick=()=>{if(!activeWorkout)return;const remaining=Math.max(0,activeWorkout.seconds-Math.floor((Date.now()-new Date(activeWorkout.startedAt).getTime())/1000)),card=document.querySelector(`[data-workout="${workout.id}"]`);if(card){card.classList.add('running');const elapsed=Math.min(activeWorkout.seconds,Math.max(0,Math.floor((Date.now()-new Date(activeWorkout.startedAt).getTime())/1000)));const definition=trainingDefinitions[workout.id];const phase=definition?.timeline.find(item=>elapsed<item.end)||definition?.timeline.at(-1);const phaseBox=card.querySelector('.workout-phase');if(phaseBox&&phase){phaseBox.textContent=remaining?phase.label+' · '+phase.cue:'Bloco completo. Confirme para salvar.';phaseBox.dataset.rest=String(phase.kind!=='work');}const progress=card.querySelector('.session-progress i');if(progress)progress.style.width=`${elapsed/activeWorkout.seconds*100}%`;card.querySelector('.workout-clock').textContent=remaining?`Tempo restante: ${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`:'Tempo concluído. Confirme o exercício.';const button=card.querySelector('.start-workout');button.textContent=remaining?'Treino em andamento...':'Concluir treino';if(!remaining&&button.disabled){const finishButton=button.cloneNode(true);finishButton.disabled=false;button.replaceWith(finishButton);finishButton.addEventListener('click',()=>finishWorkout(workout.id))}}if(!remaining)clearInterval(workoutTimer)};workoutTimer=setInterval(tick,1000);tick()}
async function finishWorkout(id){const button=document.querySelector(`[data-workout="${id}"] .start-workout`);if(button){button.disabled=true;button.textContent='Salvando...'}try{const result=await api('/api/trainings',{method:'POST',body:JSON.stringify({workoutId:id})});xp=result.user.xp;updateXp();document.querySelector('#profile-tags span:first-child').textContent=`Nível ${result.user.level}`;document.querySelector('#home-skill').textContent=result.user.skill;activeWorkout=null;await loadTraining();refreshProfile();loadRanking();showToast(`Treino concluído: +${result.xp} XP e +${result.points} pontos`)}catch(error){activeWorkout=null;await loadTraining();showToast(error.message)}}

function escapeHtml(value){const node=document.createElement('span');node.textContent=String(value??'');return node.innerHTML}
async function loadChats(){if(!apiToken())return;try{const result=await api('/api/chats');if(!result.chats.some(chat=>chat.id===activeChat))activeChat='global';document.querySelector('#chat-list').innerHTML=result.chats.map(chat=>`<button class="chat-person ${chat.type==='private'?'private-chat':'global-chat'} ${activeChat===chat.id?'active':''}" data-chat="${chat.id}"><span class="mini-avatar">${chat.type==='global'?'🌐':'⚽'}</span><span><strong>${escapeHtml(chat.name)}</strong><small>${chat.type==='global'?'Aberto à comunidade':`${chat.members} membros • ${escapeHtml(chat.court)}`}</small></span></button>`).join('');document.querySelectorAll('#chat-list [data-chat]').forEach(button=>button.addEventListener('click',()=>{activeChat=button.dataset.chat;loadChats()}));const selected=result.chats.find(chat=>chat.id===activeChat);document.querySelector('#chat-name').textContent=selected.name;document.querySelector('#chat-avatar').textContent=selected.type==='global'?'🌐':'⚽';document.querySelector('#chat-subtitle').textContent=selected.type==='global'?'Conversa global da comunidade':`Chat privado • ${selected.members} membros da partida`;document.querySelector('.chat-panel').classList.toggle('private-room',selected.type==='private');await loadMessages()}catch(error){showToast(error.message)}}
async function loadMessages(){if(!apiToken())return;try{const chatId=activeChat,result=await api(`/api/chats/${encodeURIComponent(chatId)}/messages`);if(chatId!==activeChat)return;const box=document.querySelector('#messages'),wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;box.innerHTML=result.messages.length?result.messages.map(message=>`<div class="bubble ${message.userId===ownUserId?'user':'bot'}"><b>${escapeHtml(message.userName)}</b>${escapeHtml(message.text)}<small>${new Date(message.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join(''):'<div class="chat-empty">Nenhuma mensagem ainda. Comece a conversa com jogadores reais.</div>';if(wasNearBottom)box.scrollTop=box.scrollHeight}catch{}}
document.querySelector('#chat-form').addEventListener('submit',async event=>{event.preventDefault();const input=document.querySelector('#chat-input'),message=input.value.trim();if(!message)return;try{await api(`/api/chats/${encodeURIComponent(activeChat)}/messages`,{method:'POST',body:JSON.stringify({text:message})});input.value='';await loadMessages()}catch(error){showToast(error.message)}});
setInterval(()=>{if(document.querySelector('#chat').classList.contains('active'))loadMessages();if(apiToken())loadQueueCount()},5000);
async function loadRanking(){if(!apiToken())return;try{const result=await api('/api/ranking');const users=result.users.filter(user=>user.role!=='admin');document.querySelector('#ranking-list').innerHTML=users.length?users.map((user,index)=>`<div class="rank-row ${user.id===ownUserId?'current':''}"><b>${index+1}</b><span class="mini-avatar">${escapeHtml(user.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase())}</span><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.location)} • ${escapeHtml(user.position)}</small></span><em>${user.semesterPoints||0} PTS</em><i>${index<3?'★':'—'}</i></div>`).join(''):'<p class="empty-note">Nenhum jogador cadastrado ainda.</p>'}catch{}}
