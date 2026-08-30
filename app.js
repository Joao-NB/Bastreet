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
let elapsed = 0;

const authScreen = document.querySelector('#auth-screen');
const authTabs = [...document.querySelectorAll('[data-auth-tab]')];
const authForms = [...document.querySelectorAll('.auth-form')];
const registerSteps = [...document.querySelectorAll('.register-step')];
const apiToken = () => localStorage.getItem('bastreet-token') || '';
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken()}`, ...(options.headers || {}) } });
  const result = await response.json();
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
  localStorage.setItem('bastreet-session', 'active');
  showPage('inicio');
  if (message) setTimeout(() => showToast(message), 400);
}

authTabs.forEach(button => button.addEventListener('click', () => setAuthTab(button.dataset.authTab)));
document.querySelector('#next-register').addEventListener('click', () => { if (validFields(document.querySelector('[data-step="1"]'))) showRegisterStep(2); });
document.querySelector('#auth-back').addEventListener('click', () => showRegisterStep(1));
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!validFields(event.currentTarget)) return;
  const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Entrando...';
  try { const form = new FormData(event.currentTarget); const result = await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password')})}); localStorage.setItem('bastreet-token',result.token); enterApp(`Bem-vindo, ${result.user.name}! 🏀`); applyUser(result.user); }
  catch(error){ showToast(error.message); } finally { button.disabled=false; button.innerHTML='Entrar na quadra <span>→</span>'; }
});
document.querySelector('#register-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!validFields(document.querySelector('[data-step="2"]'))) return;
  const form=new FormData(event.currentTarget),days=[...event.currentTarget.querySelectorAll('.day-picker input:checked')].map(item=>item.parentElement.textContent.trim());
  const payload=Object.fromEntries(form.entries());payload.availability=days;
  try { const result=await api('/api/auth/register',{method:'POST',body:JSON.stringify(payload)});localStorage.setItem('bastreet-token',result.token);enterApp('Conta criada e salva no servidor!');applyUser(result.user); }
  catch(error){showToast(error.message)}
});
document.querySelectorAll('.toggle-password').forEach(button => button.addEventListener('click', () => { const input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? '◉' : '◌'; }));
document.querySelector('#logout-button').addEventListener('click', () => { localStorage.removeItem('bastreet-session'); localStorage.removeItem('bastreet-token'); authScreen.hidden = false; setAuthTab('login'); });
document.querySelector('#brand-home').addEventListener('click', event => { event.preventDefault(); showPage('inicio'); history.replaceState(null, '', '#inicio'); });
if (apiToken()) { authScreen.hidden = true; api('/api/me').then(result=>applyUser(result.user)).catch(()=>{localStorage.removeItem('bastreet-token');authScreen.hidden=false}); }

function applyUser(user){
  const first=user.name.split(' ')[0];document.querySelector('#welcome-title').innerHTML=`E aí, <span>${first}!</span><br>Pronto pro jogo?`;
  document.querySelectorAll('.avatar-button span').forEach(item=>item.textContent=user.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase());
  document.querySelector('#profile-title').textContent=user.name;document.querySelector('#xp-value').textContent=user.xp||0;
}

function showPage(id) {
  pages.forEach(page => page.classList.toggle('active', page.id === id));
  document.querySelectorAll('.bottom-nav [data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));

document.querySelectorAll('[data-mode]').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('[data-mode]').forEach(item => item.classList.remove('selected'));
  card.classList.add('selected');
}));

async function openMatchmaking() {
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  searchingState.hidden = false;
  foundState.hidden = true;
  elapsed = 0;
  timerLabel.textContent = '00:00';
  clearTimeout(matchTimeout); clearInterval(timerInterval); clearInterval(matchPoll);
  timerInterval = setInterval(() => { elapsed += 1; timerLabel.textContent = `00:${String(elapsed).padStart(2, '0')}`; }, 1000);
  try {
    const slot=document.querySelector('.availability button.active')?.textContent||'Terça • 19h';const result=await api('/api/matchmaking/join',{method:'POST',body:JSON.stringify({slot})});
    searchingState.querySelector('p:not(.eyebrow)').innerHTML=`<strong>${result.waiting}/${result.needed} pessoas reais</strong> na fila. Abra outras contas nos celulares do grupo.`;
    if(result.match)return showRealMatch(result.match);
    matchPoll=setInterval(async()=>{try{const status=await api('/api/matchmaking/status');if(status.match)showRealMatch(status.match);else searchingState.querySelector('p:not(.eyebrow)').innerHTML=`<strong>${status.waiting}/${status.needed} pessoas reais</strong> na fila. Aguardando o grupo...`;}catch{}},2500);
  } catch(error){closeMatchmaking();showToast(error.message)}
}

function showRealMatch(match){clearInterval(matchPoll);clearInterval(timerInterval);searchingState.hidden=true;foundState.hidden=false;const averages=match.teams.map(team=>Math.round(team.reduce((sum,user)=>sum+user.skill,0)/team.length));const panels=foundState.querySelectorAll('.team-balance div');panels[0].querySelector('strong').textContent=averages[0];panels[1].querySelector('strong').textContent=averages[1];foundState.querySelector('p:not(.eyebrow)').textContent=`Agora • ${match.court.name} • ${match.teams.flat().length} participantes reais`;}

function closeMatchmaking() {
  overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
  clearTimeout(matchTimeout); clearInterval(timerInterval); clearInterval(matchPoll);
}

document.querySelector('#find-match').addEventListener('click', openMatchmaking);
document.querySelector('#nav-match').addEventListener('click', openMatchmaking);
document.querySelector('#close-modal').addEventListener('click', closeMatchmaking);
document.querySelector('#cancel-search').addEventListener('click', closeMatchmaking);
document.querySelector('#confirm-match').addEventListener('click', () => { closeMatchmaking(); showPage('partidas'); showToast('Presença confirmada! Nos vemos na quadra 🏀'); });
overlay.addEventListener('click', event => { if (event.target === overlay) closeMatchmaking(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMatchmaking(); });

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
document.querySelectorAll('.filter-chips button, .tabs button').forEach(button => button.addEventListener('click', () => {
  button.parentElement.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active');
}));

let courts = [];

function renderCourts(sort = 'distance') {
  const list = [...courts].sort((a, b) => sort === 'activity' ? b.players - a.players : sort === 'lighting' ? Number(b.light) - Number(a.light) : a.distance - b.distance);
  document.querySelector('#court-list').innerHTML = list.map((court, index) => `<article class="court-card ${index === 0 ? 'selected' : ''}"><div class="court-photo"><span>🏀</span><i>${court.players} presente${court.players===1?'':'s'}</i></div><div class="court-copy"><small>${court.distance.toFixed(1).replace('.', ',')} KM • ${court.area.toUpperCase()}</small><h3>${court.name}</h3><p>${court.surface} • ${court.light ? 'Com iluminação' : 'Sem iluminação'} • Aberta até ${court.open}</p><div><button class="court-route" data-court-name="${court.name}">Ver rota</button><button class="court-checkin" data-court-id="${court.id}">Estou aqui</button><button class="court-group" data-page="chat">Grupo</button></div></div></article>`).join('');
  document.querySelectorAll('.court-route').forEach(button => button.addEventListener('click', () => showToast(`Rota para ${button.dataset.courtName} calculada.`)));
  document.querySelectorAll('.court-group').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
  document.querySelectorAll('.court-checkin').forEach(button => button.addEventListener('click', async()=>{try{await api(`/api/courts/${button.dataset.courtId}/checkin`,{method:'POST'});showToast('Presença registrada por 4 horas.');await loadCourts()}catch(error){showToast(error.message)}}));
}

async function loadCourts(lat=-3.7319,lon=-38.5267){try{const result=await api(`/api/courts?lat=${lat}&lon=${lon}`);courts=result.courts;document.querySelector('#court-count').textContent=courts.length;renderCourts(document.querySelector('#court-filter').value)}catch(error){showToast(error.message)}}
loadCourts();
document.querySelector('#court-filter').addEventListener('change', event => renderCourts(event.target.value));
document.querySelector('#locate-me').addEventListener('click', () => {
  const button = document.querySelector('#locate-me'); button.textContent = '⌛ Localizando...';
  if (!navigator.geolocation) { document.querySelector('#location-label').textContent = 'Geolocalização indisponível. Exibindo Fortaleza, CE.'; button.textContent = '⌖ Usar minha localização'; return; }
  navigator.geolocation.getCurrentPosition(position => {
    document.querySelector('#location-label').textContent = `Localização atualizada (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}). Distâncias recalculadas.`;
    button.textContent = '✓ Localização ativa'; button.classList.add('located'); loadCourts(position.coords.latitude,position.coords.longitude); showToast('Distâncias reais atualizadas!');
  }, () => { document.querySelector('#location-label').textContent = 'Sem permissão de localização. Exibindo quadras em Fortaleza, CE.'; button.textContent = '⌖ Tentar novamente'; showToast('Permita o acesso à localização no navegador.'); }, { enableHighAccuracy: true, timeout: 7000 });
});

const players = [
  {n:'João', s:78, h:182, g:'H', p:'Ala-armador'}, {n:'Mariana', s:82, h:176, g:'M', p:'Armadora'},
  {n:'Rafael', s:75, h:190, g:'H', p:'Pivô'}, {n:'Bárbara', s:76, h:181, g:'M', p:'Ala'},
  {n:'Pedro', s:84, h:186, g:'H', p:'Ala'}, {n:'Luana', s:70, h:169, g:'M', p:'Armadora'},
  {n:'Bruno', s:72, h:194, g:'H', p:'Pivô'}, {n:'Camila', s:79, h:178, g:'M', p:'Ala-pivô'},
  {n:'Lucas', s:80, h:188, g:'H', p:'Ala-pivô'}, {n:'Ana', s:74, h:172, g:'M', p:'Ala-armadora'}
];

function playerRow(player) { return `<li><span class="mini-avatar">${player.n.slice(0,2).toUpperCase()}</span><span><strong>${player.n}</strong><small>${player.p} • ${player.h / 100} m • ${player.g}</small></span><em>${player.s} nível</em></li>`; }
document.querySelector('#build-teams').addEventListener('click', () => {
  const sorted = [...players].sort((a,b) => b.s - a.s); const teams = [[],[]]; let totals = [0,0];
  sorted.forEach(player => { const target = totals[0] <= totals[1] ? 0 : 1; teams[target].push(player); totals[target] += player.s; });
  const average = team => Math.round(team.reduce((sum,p) => sum + p.s,0) / team.length);
  document.querySelector('#team-output').innerHTML = `<div class="formed-team"><header><span>TIME LARANJA</span><strong>Nível médio ${average(teams[0])}</strong></header><ul>${teams[0].map(playerRow).join('')}</ul></div><div class="balance-score"><span>98%</span><small>equilíbrio</small><i>✓</i></div><div class="formed-team blue"><header><span>TIME PRETO</span><strong>Nível médio ${average(teams[1])}</strong></header><ul>${teams[1].map(playerRow).join('')}</ul></div>`;
  showToast('10 perfis compatíveis encontrados!');
});
document.querySelectorAll('.availability button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.availability button').forEach(item => item.classList.remove('active')); button.classList.add('active'); }));

let xp = 0;
function updateXp() { document.querySelector('#xp-value').textContent = xp; document.querySelector('#xp-bar').style.width = `${Math.min(100, xp / 10)}%`; }
updateXp();
document.querySelectorAll('.start-workout').forEach((button,index) => button.addEventListener('click', () => {
  const card = button.closest('.workout-card'); const gain = Number(card.dataset.xp);
  if (card.classList.contains('done')) { showToast('Este treino já foi concluído hoje.'); return; }
  button.textContent = 'Treino em andamento...'; button.disabled = true;
  setTimeout(async() => { try{const result=await api('/api/trainings',{method:'POST',body:JSON.stringify({workoutId:`individual-${index+1}`,xp:gain,collective:false})});xp=result.user.xp;updateXp();card.classList.add('done');button.textContent='✓ Concluído hoje';showToast(`Salvo: +${result.xp} XP e +${result.points} pontos`)}catch(error){button.disabled=false;button.textContent='Iniciar treino';showToast(error.message)} }, 900);
}));

const botReplies = ['Fechado! Vou confirmar minha presença agora 🏀','Boa! Tem mais duas vagas no treino de quinta.','Perfeito. A quadra está livre a partir das 19h.','Bora! Levo a bola e encontro vocês lá.'];
document.querySelector('#chat-form').addEventListener('submit', async event => {
  event.preventDefault(); const input = document.querySelector('#chat-input'); const text = input.value.trim(); if (!text) return;
  input.value='';try{await api('/api/messages',{method:'POST',body:JSON.stringify({text})});await loadMessages()}catch(error){showToast(error.message)}
});

function escapeHtml(value){const node=document.createElement('span');node.textContent=value;return node.innerHTML}
async function loadMessages(){try{const result=await api('/api/messages'),ownId=(await api('/api/me').catch(()=>({user:{id:''}}))).user.id;document.querySelector('#messages').innerHTML='<div class="date-divider">Hoje • atualiza automaticamente</div>'+result.messages.map(message=>`<div class="bubble ${message.userId===ownId?'user':'bot'}"><b>${escapeHtml(message.userName)}</b>${escapeHtml(message.text)}<small>${new Date(message.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('');const box=document.querySelector('#messages');box.scrollTop=box.scrollHeight}catch{}}
loadMessages();setInterval(()=>{if(document.querySelector('#chat').classList.contains('active'))loadMessages()},3000);

async function loadRanking(){try{const result=await api('/api/ranking');if(!result.users.length)return;document.querySelector('#ranking-list').innerHTML=result.users.map((user,index)=>`<div class="rank-row"><b>${index+1}</b><span class="mini-avatar">${user.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.position)} • nível técnico ${user.skill}</small></span><em>${user.semesterPoints} PTS</em><i>${index<3?'★':'—'}</i></div>`).join('')}catch{}}
loadRanking();
