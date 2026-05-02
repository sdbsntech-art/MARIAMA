/* theme.js — Mode Sombre Permanent */
document.addEventListener('DOMContentLoaded', () => {
  // On force le thème sombre sur la racine HTML
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme', 'dark');

  // On cache le bouton de changement de thème s'il existe dans le DOM
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.style.display = 'none';
  }
});
