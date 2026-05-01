/* routes/export.js */
const router = require('express').Router();
const db     = require('../database/db');

function toCSV(headers, rows) {
  const escape = (val) => {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach(row => lines.push(headers.map(h => escape(row[h])).join(',')));
  return lines.join('\n');
}

router.get('/etudiants', async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT e.prenom, e.nom, e.email, e.filiere, e.numero, e.sujet,
             CONCAT(enc.prenom, ' ', enc.nom) AS encadreur, e.created_at
      FROM etudiants e LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
      ORDER BY e.nom`);

    const csv = toCSV(['prenom','nom','email','filiere','numero','sujet','encadreur','created_at'], data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="etudiants.csv"');
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de l\'export');
  }
});

router.get('/encadreurs', async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT enc.prenom, enc.nom, enc.email, enc.grade, enc.departement,
             COUNT(e.id) AS nb_etudiants
      FROM encadreurs enc LEFT JOIN etudiants e ON e.encadreur_id = enc.id
      GROUP BY enc.id ORDER BY enc.nom`);

    const csv = toCSV(['prenom','nom','email','grade','departement','nb_etudiants'], data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="encadreurs.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de l\'export');
  }
});

router.get('/soutenances', async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT CONCAT(e.prenom, ' ', e.nom) AS etudiant, e.filiere, e.sujet,
             s.date, s.heure, s.salle, s.jury, s.statut, s.duree
      FROM soutenances s JOIN etudiants e ON e.id = s.etudiant_id
      ORDER BY s.date, s.heure`);

    const csv = toCSV(['etudiant','filiere','sujet','date','heure','salle','jury','statut','duree'], data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="soutenances.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de l\'export');
  }
});

router.get('/notes', async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT CONCAT(e.prenom, ' ', e.nom) AS etudiant, e.filiere, e.sujet,
             s.date, s.note_memoire, s.note_oral,
             ROUND((COALESCE(s.note_memoire,0)+COALESCE(s.note_oral,0))/2.0,2) AS moyenne,
             s.appreciation
      FROM soutenances s JOIN etudiants e ON e.id = s.etudiant_id
      WHERE s.statut = 'termine'
      ORDER BY moyenne DESC`);

    const csv = toCSV(['etudiant','filiere','sujet','date','note_memoire','note_oral','moyenne','appreciation'], data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="resultats.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de l\'export');
  }
});

module.exports = router;
