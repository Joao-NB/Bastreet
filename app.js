const pages = [...document.querySelectorAll('.page')];
const navButtons = [...document.querySelectorAll('[data-page]')];
const overlay = document.querySelector('#match-overlay');
const searchingState = document.querySelector('#searching-state');
const foundState = document.querySelector('#found-state');
const timerLabel = document.querySelector('#search-time');
const toast = document.querySelector('#toast');
let matchTimeout;
let timerInterval;
let elapsed = 0;

const authScreen = document.querySelector('#auth-screen');
const authTabs = [...document.querySelectorAll('[data-auth-tab]')];
const authForms = [...document.querySelectorAll('.auth-form')];
const registerSteps = [...document.querySelectorAll('.register-step')];

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
document.querySelector('#login-form').addEventListener('submit', event => { event.preventDefault(); if (validFields(event.currentTarget)) enterApp('Bem-vindo de volta, João! 🏀'); });
document.querySelector('#register-form').addEventListener('submit', event => { event.preventDefault(); if (validFields(document.querySelector('[data-step="2"]'))) enterApp('Perfil criado! Seu Elo provisório é 1.200.'); });
document.querySelectorAll('.toggle-password').forEach(button => button.addEventListener('click', () => { const input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? '◉' : '◌'; }));
document.querySelector('#logout-button').addEventListener('click', () => { localStorage.removeItem('bastreet-session'); authScreen.hidden = false; setAuthTab('login'); });
document.querySelector('#brand-home').addEventListener('click', event => { event.preventDefault(); showPage('inicio'); history.replaceState(null, '', '#inicio'); });
if (localStorage.getItem('bastreet-session') === 'active') authScreen.hidden = true;

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

function openMatchmaking() {
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  searchingState.hidden = false;
  foundState.hidden = true;
  elapsed = 0;
  timerLabel.textContent = '00:00';
  clearTimeout(matchTimeout); clearInterval(timerInterval);
  timerInterval = setInterval(() => { elapsed += 1; timerLabel.textContent = `00:${String(elapsed).padStart(2, '0')}`; }, 1000);
  matchTimeout = setTimeout(() => { searchingState.hidden = true; foundState.hidden = false; clearInterval(timerInterval); }, 4200);
}

function closeMatchmaking() {
  overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
  clearTimeout(matchTimeout); clearInterval(timerInterval);
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

const courts = [
  { name: 'Quadra da Beira-Mar', area: 'Meireles', distance: 2.4, players: 8, light: true, surface: 'Piso esportivo', open: 'Aberta até 22h' },
  { name: 'Praça da Gentilândia', area: 'Benfica', distance: 4.1, players: 12, light: true, surface: 'Concreto', open: 'Aberta 24h' },
  { name: 'Areninha do Papicu', area: 'Papicu', distance: 5.7, players: 5, light: false, surface: 'Piso esportivo', open: 'Aberta até 20h' }
];

function renderCourts(sort = 'distance') {
  const list = [...courts].sort((a, b) => sort === 'activity' ? b.players - a.players : sort === 'lighting' ? Number(b.light) - Number(a.light) : a.distance - b.distance);
  document.querySelector('#court-list').innerHTML = list.map((court, index) => `<article class="court-card ${index === 0 ? 'selected' : ''}"><div class="court-photo"><span>🏀</span><i>${court.players} jogando</i></div><div class="court-copy"><small>${court.distance.toFixed(1).replace('.', ',')} KM • ${court.area.toUpperCase()}</small><h3>${court.name}</h3><p>${court.surface} • ${court.light ? 'Com iluminação' : 'Sem iluminação'} • ${court.open}</p><div><button class="court-route" data-court-name="${court.name}">Ver rota</button><button class="court-group" data-page="chat">Falar com grupo</button></div></div></article>`).join('');
  document.querySelectorAll('.court-route').forEach(button => button.addEventListener('click', () => showToast(`Rota para ${button.dataset.courtName} calculada.`)));
  document.querySelectorAll('.court-group').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
}

renderCourts();
document.querySelector('#court-filter').addEventListener('change', event => renderCourts(event.target.value));
document.querySelector('#locate-me').addEventListener('click', () => {
  const button = document.querySelector('#locate-me'); button.textContent = '⌛ Localizando...';
  if (!navigator.geolocation) { document.querySelector('#location-label').textContent = 'Geolocalização indisponível. Exibindo Fortaleza, CE.'; button.textContent = '⌖ Usar minha localização'; return; }
  navigator.geolocation.getCurrentPosition(position => {
    document.querySelector('#location-label').textContent = `Localização atualizada (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}). Distâncias recalculadas.`;
    button.textContent = '✓ Localização ativa'; button.classList.add('located'); showToast('Quadras próximas atualizadas!');
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

let xp = Number(localStorage.getItem('bastreet-xp')) || 760;
function updateXp() { document.querySelector('#xp-value').textContent = xp; document.querySelector('#xp-bar').style.width = `${Math.min(100, xp / 10)}%`; }
updateXp();
document.querySelectorAll('.start-workout').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.workout-card'); const gain = Number(card.dataset.xp);
  if (card.classList.contains('done')) { showToast('Este treino já foi concluído hoje.'); return; }
  button.textContent = 'Treino em andamento...'; button.disabled = true;
  setTimeout(() => { xp += gain; localStorage.setItem('bastreet-xp', xp); updateXp(); card.classList.add('done'); button.textContent = '✓ Concluído hoje'; showToast(`Treino concluído! +${gain} XP`); }, 1600);
}));

const botReplies = ['Fechado! Vou confirmar minha presença agora 🏀','Boa! Tem mais duas vagas no treino de quinta.','Perfeito. A quadra está livre a partir das 19h.','Bora! Levo a bola e encontro vocês lá.'];
document.querySelector('#chat-form').addEventListener('submit', event => {
  event.preventDefault(); const input = document.querySelector('#chat-input'); const text = input.value.trim(); if (!text) return;
  const messages = document.querySelector('#messages'); messages.insertAdjacentHTML('beforeend', `<div class="bubble user">${text.replace(/[<>]/g,'')}<small>agora</small></div>`); input.value = ''; messages.scrollTop = messages.scrollHeight;
  setTimeout(() => { const reply = botReplies[Math.floor(Math.random() * botReplies.length)]; messages.insertAdjacentHTML('beforeend', `<div class="typing">•••</div>`); messages.scrollTop = messages.scrollHeight; setTimeout(() => { messages.querySelector('.typing')?.remove(); messages.insertAdjacentHTML('beforeend', `<div class="bubble bot"><b>Rafael</b>${reply}<small>agora</small></div>`); messages.scrollTop = messages.scrollHeight; }, 800); }, 500);
});
