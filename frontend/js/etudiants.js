/* etudiants.js */

let etudiantsData = [];
let currentPage = 1;
const PER_PAGE = 10;
let etudiantsLoaded = false;

async function loadEtudiants(params = {}) {
  try {
    const result = await Api.etudiants.getAll(params);
    etudiantsData = result.data || result;
    renderEtudiantsTable(etudiantsData);
    buildFilierFilter();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderEtudiantsTable(data) {
  const tbody = document.getElementById('tbody-etudiants');
  if (!tbody) return;

  const start = (currentPage - 1) * PER_PAGE;
  const slice = data.slice(start, start + PER_PAGE);

  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Aucun étudiant trouvé</td></tr>';
    renderPagination('pagination-etudiants', data.length, currentPage, (p) => {
      currentPage = p; renderEtudiantsTable(etudiantsData);
    });
    return;
  }

  tbody.innerHTML = slice.map(e => `
    <tr>
      <td>
        <div style="font-weight:600">${escHtml(e.prenom)} ${escHtml(e.nom)}</div>
        <div style="font-size:11px;color:var(--text-faint)">${escHtml(e.email || '')}</div>
      </td>
      <td><span class="badge badge-planifie">${escHtml(e.filiere)}</span></td>
      <td style="max-width:240px">
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(e.sujet)}">
          ${escHtml(e.sujet)}
        </div>
      </td>
      <td>${escHtml(e.encadreur_nom || '—')}</td>
      <td><span class="badge ${e.soutenance_id ? 'badge-termine' : 'badge-reporte'}">${e.soutenance_id ? 'Planifié' : 'En attente'}</span></td>
      <td>
        <div class="table-actions">
          <button class="table-btn edit" onclick="editEtudiant(${e.id})" title="Modifier">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="table-btn delete" onclick="deleteEtudiant(${e.id})" title="Supprimer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');

  renderPagination('pagination-etudiants', data.length, currentPage, (p) => {
    currentPage = p; renderEtudiantsTable(etudiantsData);
  });
}

function buildFilierFilter() {
  const filieres = [...new Set(etudiantsData.map(e => e.filiere).filter(Boolean))];
  const sel = document.getElementById('filter-filiere');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Toutes les filières</option>'
    + filieres.map(f => `<option value="${escHtml(f)}" ${f === current ? 'selected' : ''}>${escHtml(f)}</option>`).join('');
}

function renderPagination(id, total, current, onPage) {
  const container = document.getElementById(id);
  if (!container) return;
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn${i === current ? ' active' : ''}" onclick="(${onPage})(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}
window.renderPagination = renderPagination;

// Search
document.getElementById('search-etudiants')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = etudiantsData.filter(et =>
    `${et.prenom} ${et.nom} ${et.sujet} ${et.email}`.toLowerCase().includes(q)
  );
  currentPage = 1;
  renderEtudiantsTable(filtered);
});

document.getElementById('filter-filiere')?.addEventListener('change', (e) => {
  const f = e.target.value;
  const filtered = f ? etudiantsData.filter(et => et.filiere === f) : etudiantsData;
  currentPage = 1;
  renderEtudiantsTable(filtered);
});

// Add button
document.getElementById('btn-add-etudiant')?.addEventListener('click', () => {
  resetEtudiantForm();
  document.getElementById('modal-etudiant-title').textContent = 'Ajouter un étudiant';
  loadEncadreurOptions('etudiant-encadreur');
  openModal('modal-etudiant');
});

// Form submit
document.getElementById('form-etudiant')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('etudiant-id').value;
  const data = {
    prenom:      document.getElementById('etudiant-prenom').value.trim(),
    nom:         document.getElementById('etudiant-nom').value.trim(),
    email:       document.getElementById('etudiant-email').value.trim(),
    filiere:     document.getElementById('etudiant-filiere').value,
    numero:      document.getElementById('etudiant-numero').value.trim(),
    sujet:       document.getElementById('etudiant-sujet').value.trim(),
    encadreur_id: document.getElementById('etudiant-encadreur').value || null,
  };
  try {
    if (id) {
      await Api.etudiants.update(id, data);
      showToast('Étudiant mis à jour avec succès', 'success');
    } else {
      await Api.etudiants.create(data);
      showToast('Étudiant ajouté avec succès', 'success');
    }
    closeModal('modal-etudiant');
    loadEtudiants();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function editEtudiant(id) {
  try {
    const e = await Api.etudiants.getById(id);
    document.getElementById('etudiant-id').value = e.id;
    document.getElementById('etudiant-prenom').value = e.prenom;
    document.getElementById('etudiant-nom').value = e.nom;
    document.getElementById('etudiant-email').value = e.email || '';
    document.getElementById('etudiant-filiere').value = e.filiere;
    document.getElementById('etudiant-numero').value = e.numero || '';
    document.getElementById('etudiant-sujet').value = e.sujet;
    await loadEncadreurOptions('etudiant-encadreur', e.encadreur_id);
    document.getElementById('modal-etudiant-title').textContent = 'Modifier l\'étudiant';
    openModal('modal-etudiant');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.editEtudiant = editEtudiant;

async function deleteEtudiant(id) {
  if (!await confirmDelete('Supprimer cet étudiant ?')) return;
  try {
    await Api.etudiants.delete(id);
    showToast('Étudiant supprimé', 'success');
    loadEtudiants();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.deleteEtudiant = deleteEtudiant;

function resetEtudiantForm() {
  document.getElementById('form-etudiant').reset();
  document.getElementById('etudiant-id').value = '';
}

async function loadEncadreurOptions(selectId, selectedId = null) {
  try {
    const data = await Api.encadreurs.getAll();
    const list = data.data || data;
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Sélectionner un encadreur...</option>'
      + list.map(enc => `<option value="${enc.id}" ${enc.id == selectedId ? 'selected' : ''}>${escHtml(enc.prenom)} ${escHtml(enc.nom)}</option>`).join('');
  } catch {}
}
window.loadEncadreurOptions = loadEncadreurOptions;

// Navigate listener
window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'etudiants' && !etudiantsLoaded) {
    etudiantsLoaded = true;
    loadEtudiants();
  } else if (e.detail.page === 'etudiants') {
    loadEtudiants();
  }
});
