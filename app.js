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
