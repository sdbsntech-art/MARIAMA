/* ============================================================
   soutenances.js
   ============================================================ */
let soutenancesData = [];

async function loadSoutenances(params = {}) {
  try {
    const result = await Api.soutenances.getAll(params);
    soutenancesData = result.data || result;
    renderSoutenancesTable(soutenancesData);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderSoutenancesTable(data) {
  const tbody = document.getElementById('tbody-soutenances');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Aucune soutenance trouvée</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('fr', { day:'2-digit', month:'short', year:'numeric' });
    const statusMap = { planifie:'Planifiée', en_cours:'En cours', termine:'Terminée', reporte:'Reportée' };
    return `
      <tr>
        <td data-label="Étudiant">
          <div style="font-weight:600">${escHtml(s.etudiant_nom || '—')}</div>
          <div style="font-size:11px;color:var(--text-faint)">${escHtml(s.filiere || '')}</div>
        </td>
        <td data-label="Sujet" style="max-width:200px">
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(s.sujet||'')}">
            ${escHtml(s.sujet || '—')}
          </div>
        </td>
        <td data-label="Date">${dateStr}</td>
        <td data-label="Heure"><strong>${escHtml(s.heure || '—')}</strong></td>
        <td data-label="Salle">${escHtml(s.salle || '—')}</td>
        <td data-label="Jury" style="color:var(--text-muted);font-size:12px">${escHtml(s.jury || '—')}</td>
        <td data-label="Statut"><span class="badge badge-${s.statut || 'planifie'}">${statusMap[s.statut] || s.statut}</span></td>
        <td data-label="Actions">
          <div class="table-actions">
            <button class="table-btn edit" onclick="editSoutenance(${s.id})" title="Modifier">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="table-btn view" onclick="openNotesModal(${s.id},'${escHtml(s.etudiant_nom||'')}')" title="Notes">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <button class="table-btn delete" onclick="deleteSoutenance(${s.id})" title="Supprimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('search-soutenances')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderSoutenancesTable(soutenancesData.filter(s =>
    `${s.etudiant_nom} ${s.sujet} ${s.salle}`.toLowerCase().includes(q)
  ));
});

document.getElementById('filter-statut')?.addEventListener('change', (e) => {
  const st = e.target.value;
  renderSoutenancesTable(st ? soutenancesData.filter(s => s.statut === st) : soutenancesData);
});

document.getElementById('btn-add-soutenance')?.addEventListener('click', async () => {
  document.getElementById('form-soutenance').reset();
  document.getElementById('soutenance-id').value = '';
  document.getElementById('modal-soutenance-title').textContent = 'Planifier une soutenance';
  await loadEtudiantOptions('soutenance-etudiant');
  openModal('modal-soutenance');
});

document.getElementById('form-soutenance')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('soutenance-id').value;
  const data = {
    etudiant_id: document.getElementById('soutenance-etudiant').value,
    date:        document.getElementById('soutenance-date').value,
    heure:       document.getElementById('soutenance-heure').value,
    salle:       document.getElementById('soutenance-salle').value,
    duree:       document.getElementById('soutenance-duree').value,
    jury:        document.getElementById('soutenance-jury').value.trim(),
    statut:      document.getElementById('soutenance-statut').value,
  };
  try {
    if (id) { await Api.soutenances.update(id, data); showToast('Soutenance mise à jour', 'success'); }
    else     { await Api.soutenances.create(data);    showToast('Soutenance planifiée',   'success'); }
    closeModal('modal-soutenance');
    loadSoutenances();
  } catch (err) { showToast(err.message, 'error'); }
});

async function editSoutenance(id) {
  try {
    const s = await Api.soutenances.getById(id);
    document.getElementById('soutenance-id').value      = s.id;
    document.getElementById('soutenance-date').value    = s.date?.slice(0,10);
    document.getElementById('soutenance-heure').value   = s.heure;
    document.getElementById('soutenance-salle').value   = s.salle;
    document.getElementById('soutenance-duree').value   = s.duree || 60;
    document.getElementById('soutenance-jury').value    = s.jury || '';
    document.getElementById('soutenance-statut').value  = s.statut;
    await loadEtudiantOptions('soutenance-etudiant', s.etudiant_id);
    document.getElementById('modal-soutenance-title').textContent = 'Modifier la soutenance';
    openModal('modal-soutenance');
  } catch (err) { showToast(err.message, 'error'); }
}
window.editSoutenance = editSoutenance;

async function deleteSoutenance(id) {
  if (!await confirmDelete('Supprimer cette soutenance ?')) return;
  try {
    await Api.soutenances.delete(id);
    showToast('Soutenance supprimée', 'success');
    loadSoutenances();
  } catch (err) { showToast(err.message, 'error'); }
}
window.deleteSoutenance = deleteSoutenance;

async function loadEtudiantOptions(selectId, selectedId = null) {
  try {
    const data = await Api.etudiants.getAll();
    const list = data.data || data;
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Sélectionner un étudiant...</option>'
      + list.map(e => `<option value="${e.id}" ${e.id == selectedId ? 'selected' : ''}>${escHtml(e.prenom)} ${escHtml(e.nom)}</option>`).join('');
  } catch {}
}

window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'soutenances') loadSoutenances();
});


/* ============================================================
   planning.js
   ============================================================ */
let currentWeekStart = getMonday(new Date());

function getMonday(d) {
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

async function loadPlanning() {
  const label = document.getElementById('current-week-label');
  const end = addDays(currentWeekStart, 4);
  if (label) {
    label.textContent = `Du ${currentWeekStart.toLocaleDateString('fr', {day:'2-digit',month:'long'})} au ${end.toLocaleDateString('fr', {day:'2-digit',month:'long',year:'numeric'})}`;
  }

  try {
    const result = await Api.soutenances.getByWeek(formatDate(currentWeekStart));
    const soutenances = result.data || result;
    renderCalendar(soutenances);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCalendar(soutenances) {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const hours = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'];
  const today = formatDate(new Date());

  let html = '<div class="cal-header"></div>';
  for (let i = 0; i < 5; i++) {
    const d = addDays(currentWeekStart, i);
    const dateStr = formatDate(d);
    const isToday = dateStr === today;
    html += `<div class="cal-header ${isToday ? 'today-col' : ''}">
      ${days[i]}<br><span style="font-size:18px;font-family:var(--font-display);font-weight:700;color:${isToday?'var(--gold)':'var(--text)'}">${d.getDate()}</span>
    </div>`;
  }

  // Map soutenances by date+hour
  const sMap = {};
  soutenances.forEach(s => {
    const key = `${s.date?.slice(0,10)}_${s.heure?.slice(0,5)}`;
    if (!sMap[key]) sMap[key] = [];
    sMap[key].push(s);
  });

  hours.forEach(h => {
    html += `<div class="cal-time-col">${h}</div>`;
    for (let i = 0; i < 5; i++) {
      const d = addDays(currentWeekStart, i);
      const key = `${formatDate(d)}_${h}`;
      const events = sMap[key] || [];
      let evHtml = events.map(s =>
        `<div class="cal-event" title="${escHtml(s.etudiant_nom||'')} · ${escHtml(s.salle||'')}" onclick="editSoutenance(${s.id})">
          ${escHtml(s.etudiant_nom?.split(' ')[0]||'')} · ${escHtml(s.salle||'')}
        </div>`).join('');
      html += `<div class="cal-cell">${evHtml}</div>`;
    }
  });

  grid.innerHTML = html;
}

document.getElementById('prev-week')?.addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  loadPlanning();
});
document.getElementById('next-week')?.addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  loadPlanning();
});
document.getElementById('btn-today')?.addEventListener('click', () => {
  currentWeekStart = getMonday(new Date());
  loadPlanning();
});
document.getElementById('btn-print-planning')?.addEventListener('click', () => window.print());

window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'planning') loadPlanning();
});


/* ============================================================
   notes.js
   ============================================================ */
let notesData = [];

async function loadNotes() {
  try {
    const result = await Api.soutenances.getAll({ with_notes: true });
    notesData = result.data || result;
    renderNotesTable(notesData);
  } catch (err) { showToast(err.message, 'error'); }
}

function getMention(moy) {
  if (moy >= 16) return { label: 'Très Bien', cls: 'badge-mention-tb' };
  if (moy >= 14) return { label: 'Bien', cls: 'badge-mention-b' };
  if (moy >= 12) return { label: 'Assez Bien', cls: 'badge-mention-ab' };
  if (moy >= 10) return { label: 'Passable', cls: 'badge-mention-p' };
  return { label: 'Insuffisant', cls: 'badge-reporte' };
}

function renderNotesTable(data) {
  const tbody = document.getElementById('tbody-notes');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Aucune donnée</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s => {
    const hasNotes = s.note_memoire != null && s.note_oral != null;
    const moy = hasNotes ? ((parseFloat(s.note_memoire) + parseFloat(s.note_oral)) / 2).toFixed(2) : null;
    const mention = moy ? getMention(parseFloat(moy)) : null;
    return `
      <tr>
        <td data-label="Étudiant"><strong>${escHtml(s.etudiant_nom || '—')}</strong></td>
        <td data-label="Filière"><span class="badge badge-planifie">${escHtml(s.filiere||'—')}</span></td>
        <td data-label="Sujet" style="font-size:12px;color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.sujet||'—')}</td>
        <td data-label="Note Mémoire">${hasNotes ? `<strong>${parseFloat(s.note_memoire).toFixed(2)}</strong>` : '<span style="color:var(--text-faint)">—</span>'}</td>
        <td data-label="Note Oral">${hasNotes ? `<strong>${parseFloat(s.note_oral).toFixed(2)}</strong>` : '<span style="color:var(--text-faint)">—</span>'}</td>
        <td data-label="Moyenne">${moy ? `<span style="font-size:16px;font-weight:700;font-family:var(--font-display);color:var(--gold)">${moy}</span>` : '—'}</td>
        <td data-label="Mention">${mention ? `<span class="badge ${mention.cls}">${mention.label}</span>` : '—'}</td>
        <td data-label="Action">
          <button class="table-btn edit" onclick="openNotesModal(${s.id},'${escHtml(s.etudiant_nom||'')}')" title="Saisir notes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function openNotesModal(soutenanceId, etudiantNom) {
  document.getElementById('notes-soutenance-id').value = soutenanceId;
  document.getElementById('notes-etudiant-nom').value = etudiantNom;
  const s = soutenancesData.find(x => x.id == soutenanceId) || notesData.find(x => x.id == soutenanceId);
  if (s) {
    document.getElementById('notes-memoire').value = s.note_memoire || '';
    document.getElementById('notes-oral').value = s.note_oral || '';
    document.getElementById('notes-appreciation').value = s.appreciation || '';
  }
  openModal('modal-notes');
}
window.openNotesModal = openNotesModal;

document.getElementById('form-notes')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('notes-soutenance-id').value;
  const data = {
    note_memoire:  parseFloat(document.getElementById('notes-memoire').value),
    note_oral:     parseFloat(document.getElementById('notes-oral').value),
    appreciation:  document.getElementById('notes-appreciation').value.trim(),
  };
  try {
    await Api.soutenances.updateNotes(id, data);
    showToast('Notes enregistrées avec succès', 'success');
    closeModal('modal-notes');
    loadNotes();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('search-notes')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderNotesTable(notesData.filter(s =>
    `${s.etudiant_nom} ${s.filiere}`.toLowerCase().includes(q)
  ));
});

window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'notes') loadNotes();
});
