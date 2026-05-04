/* routes/etudiants.js */
const router = require('express').Router();
const db     = require('../database/db');
const emailService = require('../utils/emailService');
const isAdmin = require('../middleware/isAdmin');

const log = async (type, msg, userId) => {
  try {
    await db.execute("INSERT INTO activity_log (type,message,user_id) VALUES (?,?,?)", [type, msg, userId || null]);
  } catch (err) { console.error(err); }
};

/* GET all */
router.get('/', async (req, res) => {
  try {
    const { filiere, search } = req.query;
    let sql = `
      SELECT e.*, CONCAT(enc.prenom, ' ', enc.nom) AS encadreur_nom,
             (SELECT id FROM soutenances WHERE etudiant_id = e.id LIMIT 1) AS soutenance_id
      FROM etudiants e
      LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
      WHERE 1=1`;
    const params = [];

    if (filiere) { sql += ' AND e.filiere = ?'; params.push(filiere); }
    if (search)  { sql += " AND CONCAT(e.prenom, ' ', e.nom, ' ', e.sujet) LIKE ?"; params.push(`%${search}%`); }
    sql += ' ORDER BY e.nom, e.prenom';

    const [data] = await db.execute(sql, params);
    res.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* GET one */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.*, CONCAT(enc.prenom, ' ', enc.nom) AS encadreur_nom
      FROM etudiants e LEFT JOIN encadreurs enc ON enc.id = e.encadreur_id
      WHERE e.id = ?`, [req.params.id]);
    const e = rows[0];
    if (!e) return res.status(404).json({ message: 'Étudiant introuvable' });
    res.json(e);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* POST create */
router.post('/', isAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, filiere, numero, sujet, encadreur_id } = req.body;
    if (!prenom || !nom || !filiere || !sujet)
      return res.status(400).json({ message: 'Champs obligatoires manquants' });

    const [result] = await db.execute(`
      INSERT INTO etudiants (prenom,nom,email,filiere,numero,sujet,encadreur_id)
      VALUES (?,?,?,?,?,?,?)`, [prenom.trim(), nom.trim(), email||null, filiere, numero||null, sujet.trim(), encadreur_id||null]);

    await log('add', `Étudiant ${prenom} ${nom} ajouté`, req.user?.id);

    // Envoi des notifications par mail
    try {
      // 1. Notification à l'étudiant
      if (email) {
        await emailService.sendStudentRegistrationEmail({ prenom, nom, email, filiere, sujet });
      }

      // 2. Notification à l'encadreur si assigné
      if (encadreur_id) {
        const [encRows] = await db.execute('SELECT * FROM encadreurs WHERE id = ?', [encadreur_id]);
        if (encRows.length > 0 && encRows[0].email) {
          await emailService.sendSupervisorAssignmentEmail(encRows[0], { prenom, nom, email, filiere, sujet });
        }
      }
    } catch (mailErr) {
      console.error('Erreur lors de l\'envoi des mails:', mailErr);
      // On ne bloque pas la réponse si le mail échoue
    }

    res.status(201).json({ id: result.insertId, message: 'Étudiant créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* PUT update */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, filiere, numero, sujet, encadreur_id } = req.body;
    const [rows] = await db.execute('SELECT id FROM etudiants WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Étudiant introuvable' });

    // Vérifier si l'encadreur a changé pour envoyer une notification
    let oldEncadreurId = null;
    try {
      const [oldRows] = await db.execute('SELECT encadreur_id FROM etudiants WHERE id = ?', [req.params.id]);
      oldEncadreurId = oldRows[0]?.encadreur_id;
    } catch (err) { console.error(err); }

    await db.execute(`
      UPDATE etudiants SET prenom=?,nom=?,email=?,filiere=?,numero=?,sujet=?,encadreur_id=?
      WHERE id=?`, [prenom, nom, email||null, filiere, numero||null, sujet, encadreur_id||null, req.params.id]);

    await log('edit', `Étudiant ${prenom} ${nom} modifié`, req.user?.id);

    try {
      if (encadreur_id && encadreur_id != oldEncadreurId) {
        const [encRows] = await db.execute('SELECT * FROM encadreurs WHERE id = ?', [encadreur_id]);
        if (encRows.length > 0 && encRows[0].email) {
          await emailService.sendSupervisorAssignmentEmail(encRows[0], { prenom, nom, email, filiere, sujet });
        }
      }
    } catch (mailErr) {
      console.error('Erreur lors de la notification de mise à jour:', mailErr);
    }

    res.json({ message: 'Étudiant mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* DELETE */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM etudiants WHERE id = ?', [req.params.id]);
    const e = rows[0];
    if (!e) return res.status(404).json({ message: 'Étudiant introuvable' });

    await db.execute('DELETE FROM etudiants WHERE id = ?', [req.params.id]);
    await log('delete', `Étudiant ${e.prenom} ${e.nom} supprimé`, req.user?.id);
    res.json({ message: 'Étudiant supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
