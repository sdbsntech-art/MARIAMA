/* pwa.js — Registration du Service Worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker enregistré !', reg.scope))
      .catch(err => console.log('Échec de l\'enregistrement du Service Worker', err));
  });
}

// Gestion de l'installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('App ready to be installed');
});
