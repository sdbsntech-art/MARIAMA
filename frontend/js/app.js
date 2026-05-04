/* ── UTILS ── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escHtml = escHtml;

/* ============================================================
   app.js — Core: navigation, toasts, modals, layout
   ============================================================ */

/* ── USER INFO ── */
const user = Api.getUser();
if (user) {
  const el = document.getElementById('sidebar-username');
  const roleEl = document.querySelector('.user-role');
  const av = document.getElementById('user-avatar');
  if (el) el.textContent = user.username || 'Utilisateur';
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrateur' : 'Utilisateur';
  if (av) av.textContent = (user.username || 'U')[0].toUpperCase();

  // Restriction UI pour les non-admins
  if (user.role !== 'admin') {
    document.body.classList.add('role-user');
    // On cache les boutons d'action
    const style = document.createElement('style');
    style.innerHTML = `
      .role-user .btn-primary:not(#btn-add-etudiant), 
      .role-user .btn-sm, 
      .role-user #btn-export,
      .role-user .table-actions,
      .role-user .table-btn { display: none !important; }
    `;
    document.head.appendChild(style);
  }
}

/* ── LOGOUT ── */
document.getElementById('btn-logout')?.addEventListener('click', () => {
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) Api.logout();
});

/* ── SIDEBAR MOBILE TOGGLE ── */
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
toggleBtn?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});
document.addEventListener('click', (e) => {
  if (sidebar?.classList.contains('open')
      && !sidebar.contains(e.target)
      && !toggleBtn.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

/* ── NAVIGATION ── */
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('page-title');
const pageSub = document.getElementById('page-sub');

const PAGE_META = {
  dashboard:  { title: 'Tableau de bord',    sub: 'Vue d\'ensemble du système' },
  etudiants:  { title: 'Gestion des étudiants', sub: 'Enregistrer et gérer les étudiants' },
  encadreurs: { title: 'Gestion des encadreurs', sub: 'Équipe pédagogique' },
  soutenances:{ title: 'Soutenances',         sub: 'Planification et suivi' },
  planning:   { title: 'Planning',            sub: 'Vue calendrier des soutenances' },
  notes:      { title: 'Notes & Résultats',   sub: 'Saisie et consultation des notes' },
};

function navigateTo(pageId) {
  navItems.forEach(i => i.classList.toggle('active', i.dataset.page === pageId));
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
  const meta = PAGE_META[pageId] || {};
  if (pageTitle) pageTitle.textContent = meta.title || '';
  if (pageSub) pageSub.textContent = meta.sub || '';
  if (window.innerWidth < 900) sidebar.classList.remove('open');
  // Trigger page load
  window.dispatchEvent(new CustomEvent('navigate', { detail: { page: pageId } }));
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// card-link navigation
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (link && !link.classList.contains('nav-item')) {
    e.preventDefault();
    navigateTo(link.dataset.page);
  }
});

/* ── TOAST SYSTEM ── */
const toastContainer = document.getElementById('toast-container');

function showToast(msg, type = 'success', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '•'}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
window.showToast = showToast;

/* ── MODAL SYSTEM ── */
const overlay = document.getElementById('modal-overlay');

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  // Check if any modal is still open
  const any = document.querySelectorAll('.modal:not(.hidden)');
  if (any.length === 0) {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

overlay.addEventListener('click', closeAllModals);

document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.modal || btn.closest('.modal')?.id;
    if (target) closeModal(target);
  });
});

window.openModal = openModal;
window.closeModal = closeModal;

/* ── EXPORT BUTTON ── */
document.getElementById('btn-export')?.addEventListener('click', () => {
  // Show a small dropdown
  showToast('Export en cours...', 'info', 2000);
  const currentPage = document.querySelector('.nav-item.active')?.dataset.page;
  const map = {
    etudiants: 'etudiants', encadreurs: 'encadreurs',
    soutenances: 'soutenances', notes: 'notes',
  };
  const type = map[currentPage] || 'etudiants';
  Api.exportCSV(type)
    .then(() => showToast('Fichier CSV téléchargé !', 'success'))
    .catch(err => showToast(err.message, 'error'));
});

/* ── SETTINGS: CHANGE PASSWORD ── */
document.getElementById('btn-settings')?.addEventListener('click', () => {
  openModal('modal-password');
});

document.getElementById('form-password')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const current  = document.getElementById('pwd-current').value;
  const newPwd   = document.getElementById('pwd-new').value;
  const confirmP = document.getElementById('pwd-confirm').value;

  if (newPwd !== confirmP) {
    return showToast('Les nouveaux mots de passe ne correspondent pas.', 'error');
  }

  try {
    await Api.changePassword(current, newPwd);
    showToast('Mot de passe mis à jour avec succès !', 'success');
    closeModal('modal-password');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ── Confirm Delete helper ── */
async function confirmDelete(msg = 'Supprimer cet élément ?') {
  return confirm(msg);
}
window.confirmDelete = confirmDelete;

/* ── Init: go to dashboard ── */
navigateTo('dashboard');
