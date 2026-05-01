/* login.js */

// Redirect if already logged in
if (Api.isAuthenticated()) window.location.href = '/dashboard.html';

const form = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const btnText = loginBtn.querySelector('.btn-text');
const errorDiv = document.getElementById('login-error');
const errorMsg = document.getElementById('login-error-msg');
const successDiv = document.getElementById('login-success');
const successMsg = document.getElementById('login-success-msg');
const togglePw = document.getElementById('toggle-pw');
const pwInput = document.getElementById('password');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
let isLoginMode = true;

tabLogin.addEventListener('click', () => {
  isLoginMode = true;
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  btnText.textContent = 'Se connecter';
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
  isLoginMode = false;
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  btnText.textContent = 'S\'inscrire';
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');
});

togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  togglePw.querySelector('svg').innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) return;

  setLoading(true);
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');

  try {
    if (isLoginMode) {
      await Api.login(username, password);
      window.location.href = '/dashboard.html';
    } else {
      const res = await Api.register(username, password);
      successMsg.textContent = res.message || 'Compte créé avec succès !';
      successDiv.classList.remove('hidden');
      form.reset();
      // Switch back to login mode
      setTimeout(() => tabLogin.click(), 2000);
    }
  } catch (err) {
    errorMsg.textContent = err.message || 'Erreur lors de l\'opération';
    errorDiv.classList.remove('hidden');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
  } finally {
    setLoading(false);
  }
});

function setLoading(state) {
  const spinner = loginBtn.querySelector('.btn-spinner');
  loginBtn.disabled = state;
  btnText.classList.toggle('hidden', state);
  spinner.classList.toggle('hidden', !state);
}

// Shake animation
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}.shake{animation:shake .4s ease}`;
document.head.appendChild(style);
