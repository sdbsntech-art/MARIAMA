/* export.js */
document.getElementById('btn-export-notes')?.addEventListener('click', () => {
  showToast('Export CSV des résultats en cours...', 'info', 2000);
  Api.exportCSV('notes')
    .then(() => showToast('Fichier résultats.csv téléchargé !', 'success'))
    .catch(err => showToast(err.message, 'error'));
});
