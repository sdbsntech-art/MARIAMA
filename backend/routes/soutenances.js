/* routes/soutenances.js */
const router = require('express').Router();
const db     = require('../database/db');
const emailService = require('../utils/emailService');
const isAdmin = require('../middleware/isAdmin');

const log = async (type, msg, uid) => {
  try {
    await db.execute("INSERT INTO activity_log(type,message,user_id)VALUES(?,?,?)", [type, msg, uid||null]);
  } catch (err) { console.error(err); }
};

const JOIN = `
  SELECT s.*,
    CONCAT(e.prenom, ' ', e.nom) AS etudiant_nom,
    e.filiere, e.sujet, e.encadreur_id,
    CONCAT(enc.prenom, ' ', enc.nom) AS encadreur_nom
  FROM soutenances s
  JOIN etudiants e ON e.id = s.etudiant_id
  LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
`;

/* GET all (with optional filters) */
router.get('/', async (req, res) => {
  try {
    const { statut, search, with_notes } = req.query;
    let sql = JOIN + ' WHERE 1=1';
    const params = [];

    if (statut) { sql += ' AND s.statut = ?'; params.push(statut); }
    if (search)  { sql += " AND CONCAT(e.prenom, ' ', e.nom, ' ', s.salle) LIKE ?"; params.push(`%${search}%`); }
    if (with_notes === 'true') { sql += " AND s.statut = 'termine'"; }
    sql += ' ORDER BY s.date, s.heure';

    const [data] = await db.execute(sql, params);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* GET by week */
router.get('/week/:startDate', async (req, res) => {
  try {
    const start = req.params.startDate;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 6);
    const end = endDate.toISOString().slice(0,10);

    const [data] = await db.execute(JOIN + ' WHERE s.date >= ? AND s.date <= ? ORDER BY s.date, s.heure', [start, end]);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* GET one */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(JOIN + ' WHERE s.id = ?', [req.params.id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Soutenance introuvable' });
    res.json(s);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* POST create */
router.post('/', isAdmin, async (req, res) => {
  try {
    const { etudiant_id, date, heure, salle, duree, jury, statut } = req.body;
    if (!etudiant_id || !date || !heure || !salle)
      return res.status(400).json({ message: 'Champs obligatoires: étudiant, date, heure, salle' });

    const [conflictRows] = await db.execute('SELECT id FROM soutenances WHERE salle=? AND date=? AND heure=? AND statut != "reporte"', [salle, date, heure]);
    if (conflictRows.length > 0)
      return res.status(409).json({ message: `Conflit : la salle ${salle} est déjà occupée à cette heure` });

    const [etudiants] = await db.execute('SELECT prenom,nom FROM etudiants WHERE id=?', [etudiant_id]);
    const etudiant = etudiants[0];
    if (!etudiant) return res.status(404).json({ message: 'Étudiant introuvable' });

    const [r] = await db.execute('INSERT INTO soutenances(etudiant_id,date,heure,salle,duree,jury,statut) VALUES(?,?,?,?,?,?,?)', [etudiant_id, date, heure, salle, duree||60, jury||null, statut||'planifie']);
    await log('add', `Soutenance planifiée pour ${etudiant.prenom} ${etudiant.nom} le ${date}`, req.user?.id);

    // Envoi notification
    try {
      const [fullData] = await db.execute(`
        SELECT e.*, enc.prenom as enc_prenom, enc.nom as enc_nom, enc.email as enc_email
        FROM etudiants e
        LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
        WHERE e.id = ?`, [etudiant_id]);
      
      const sData = fullData[0];
      if (sData && sData.email) {
        const supervisor = sData.encadreur_id ? { prenom: sData.enc_prenom, nom: sData.enc_nom, email: sData.enc_email } : null;
        await emailService.sendDefenseScheduledEmail(sData, supervisor, { date, heure, salle, jury });
      }
    } catch (mailErr) {
      console.error('Erreur mail planification:', mailErr);
    }

    res.status(201).json({ id: r.insertId, message: 'Soutenance planifiée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* PUT update */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { etudiant_id, date, heure, salle, duree, jury, statut } = req.body;
    const [rows] = await db.execute('SELECT * FROM soutenances WHERE id=?', [req.params.id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Soutenance introuvable' });

    const [conflictRows] = await db.execute('SELECT id FROM soutenances WHERE salle=? AND date=? AND heure=? AND id != ? AND statut != "reporte"', [salle, date, heure, req.params.id]);
    if (conflictRows.length > 0)
      return res.status(409).json({ message: `Conflit de salle : ${salle} est déjà réservée` });

    await db.execute("UPDATE soutenances SET etudiant_id=?,date=?,heure=?,salle=?,duree=?,jury=?,statut=? WHERE id=?", [etudiant_id||s.etudiant_id, date, heure, salle, duree||60, jury||null, statut||'planifie', req.params.id]);
    await log('edit', `Soutenance #${req.params.id} mise à jour`, req.user?.id);

    // Envoi notification si la date/heure/salle a changé
    try {
      if (date !== s.date || heure !== s.heure || salle !== s.salle) {
        const eid = etudiant_id || s.etudiant_id;
        const [fullData] = await db.execute(`
          SELECT e.*, enc.prenom as enc_prenom, enc.nom as enc_nom, enc.email as enc_email
          FROM etudiants e
          LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
          WHERE e.id = ?`, [eid]);
        
        const sData = fullData[0];
        if (sData && sData.email) {
          const supervisor = sData.encadreur_id ? { prenom: sData.enc_prenom, nom: sData.enc_nom, email: sData.enc_email } : null;
          await emailService.sendDefenseScheduledEmail(sData, supervisor, { date, heure, salle, jury });
        }
      }
    } catch (mailErr) {
      console.error('Erreur mail mise à jour planification:', mailErr);
    }

    res.json({ message: 'Soutenance mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* PUT notes */
router.put('/:id/notes', isAdmin, async (req, res) => {
  try {
    const { note_memoire, note_oral, appreciation } = req.body;
    if (note_memoire == null || note_oral == null)
      return res.status(400).json({ message: 'Les deux notes sont requises' });
    if (note_memoire < 0 || note_memoire > 20 || note_oral < 0 || note_oral > 20)
      return res.status(400).json({ message: 'Les notes doivent être entre 0 et 20' });

    const [rows] = await db.execute("SELECT s.*, CONCAT(e.prenom, ' ', e.nom) AS nom FROM soutenances s JOIN etudiants e ON e.id=s.etudiant_id WHERE s.id=?", [req.params.id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Soutenance introuvable' });

    await db.execute("UPDATE soutenances SET note_memoire=?,note_oral=?,appreciation=?,statut='termine' WHERE id=?", [note_memoire, note_oral, appreciation||null, req.params.id]);
    const moy = ((parseFloat(note_memoire)+parseFloat(note_oral))/2).toFixed(2);
    await log('edit', `Notes saisies pour ${s.nom} : ${moy}/20`, req.user?.id);
    res.json({ message: 'Notes enregistrées', moyenne: moy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* DELETE */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT s.*, CONCAT(e.prenom, ' ', e.nom) AS nom FROM soutenances s JOIN etudiants e ON e.id=s.etudiant_id WHERE s.id=?", [req.params.id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Soutenance introuvable' });
    await db.execute('DELETE FROM soutenances WHERE id=?', [req.params.id]);
    await log('delete', `Soutenance de ${s.nom} supprimée`, req.user?.id);
    res.json({ message: 'Soutenance supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
