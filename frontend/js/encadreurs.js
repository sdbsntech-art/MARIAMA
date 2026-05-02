/* ============================================================
   encadreurs.js
   ============================================================ */
let encadreursData = [];

async function loadEncadreurs() {
  try {
    const result = await Api.encadreurs.getAll();
    encadreursData = result.data || result;
    renderEncadreursTable(encadreursData);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderEncadreursTable(data) {
  const tbody = document.getElementById('tbody-encadreurs');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Aucun encadreur trouvé</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(enc => `
    <tr>
      <td data-label="Nom complet">
        <div style="font-weight:600">${escHtml(enc.prenom)} ${escHtml(enc.nom)}</div>
      </td>
      <td data-label="Grade"><span class="badge badge-en_cours">${escHtml(enc.grade || '—')}</span></td>
      <td data-label="Département">${escHtml(enc.departement || '—')}</td>
      <td data-label="Email" style="color:var(--text-muted)">${escHtml(enc.email || '—')}</td>
      <td data-label="Encadrés">
        <span style="font-weight:600;color:var(--gold)">${enc.nb_etudiants || 0}</span>
        <span style="color:var(--text-faint)"> étudiant(s)</span>
      </td>
      <td data-label="Actions">
        <div class="table-actions">
          <button class="table-btn edit" onclick="editEncadreur(${enc.id})" title="Modifier">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="table-btn delete" onclick="deleteEncadreur(${enc.id})" title="Supprimer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('search-encadreurs')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderEncadreursTable(encadreursData.filter(enc =>
    `${enc.prenom} ${enc.nom} ${enc.email} ${enc.departement}`.toLowerCase().includes(q)
  ));
});

document.getElementById('btn-add-encadreur')?.addEventListener('click', () => {
  document.getElementById('form-encadreur').reset();
  document.getElementById('encadreur-id').value = '';
  document.getElementById('modal-encadreur-title').textContent = 'Ajouter un encadreur';
  openModal('modal-encadreur');
});

document.getElementById('form-encadreur')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('encadreur-id').value;
  const data = {
    prenom:      document.getElementById('encadreur-prenom').value.trim(),
    nom:         document.getElementById('encadreur-nom').value.trim(),
    email:       document.getElementById('encadreur-email').value.trim(),
    grade:       document.getElementById('encadreur-grade').value,
    departement: document.getElementById('encadreur-dept').value.trim(),
  };
  try {
    if (id) { await Api.encadreurs.update(id, data); showToast('Encadreur mis à jour', 'success'); }
    else     { await Api.encadreurs.create(data);    showToast('Encadreur ajouté',      'success'); }
    closeModal('modal-encadreur');
    loadEncadreurs();
  } catch (err) { showToast(err.message, 'error'); }
});

async function editEncadreur(id) {
  try {
    const enc = await Api.encadreurs.getById(id);
    document.getElementById('encadreur-id').value  = enc.id;
    document.getElementById('encadreur-prenom').value = enc.prenom;
    document.getElementById('encadreur-nom').value    = enc.nom;
    document.getElementById('encadreur-email').value  = enc.email || '';
    document.getElementById('encadreur-grade').value  = enc.grade || '';
    document.getElementById('encadreur-dept').value   = enc.departement || '';
    document.getElementById('modal-encadreur-title').textContent = 'Modifier l\'encadreur';
    openModal('modal-encadreur');
  } catch (err) { showToast(err.message, 'error'); }
}
window.editEncadreur = editEncadreur;

async function deleteEncadreur(id) {
  if (!await confirmDelete('Supprimer cet encadreur ?')) return;
  try {
    await Api.encadreurs.delete(id);
    showToast('Encadreur supprimé', 'success');
    loadEncadreurs();
  } catch (err) { showToast(err.message, 'error'); }
}
window.deleteEncadreur = deleteEncadreur;

window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'encadreurs') loadEncadreurs();
});
