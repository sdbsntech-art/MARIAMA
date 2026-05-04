/* ============================================================
   routes/encadreurs.js
   ============================================================ */
const router = require('express').Router();
const db     = require('../database/db');
const isAdmin = require('../middleware/isAdmin');

const log = async (type, msg, uid) => {
  try {
    await db.execute("INSERT INTO activity_log(type,message,user_id)VALUES(?,?,?)", [type, msg, uid||null]);
  } catch (err) { console.error(err); }
};

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT enc.*, COUNT(e.id) as nb_etudiants
      FROM encadreurs enc LEFT JOIN etudiants e ON e.encadreur_id = enc.id
      WHERE 1=1`;
    const params = [];
    if (search) { sql += ' AND CONCAT(enc.prenom, " ", enc.nom) LIKE ?'; params.push(`%${search}%`); }
    sql += ' GROUP BY enc.id ORDER BY enc.nom';
    
    const [data] = await db.execute(sql, params);
    res.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM encadreurs WHERE id = ?', [req.params.id]);
    const enc = rows[0];
    if (!enc) return res.status(404).json({ message: 'Encadreur introuvable' });
    res.json(enc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, grade, departement } = req.body;
    if (!prenom || !nom) return res.status(400).json({ message: 'Prénom et nom requis' });
    const [r] = await db.execute('INSERT INTO encadreurs(prenom,nom,email,grade,departement)VALUES(?,?,?,?,?)', [prenom.trim(), nom.trim(), email||null, grade||null, departement||null]);
    await log('add', `Encadreur ${prenom} ${nom} ajouté`, req.user?.id);
    res.status(201).json({ id: r.insertId, message: 'Encadreur créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, grade, departement } = req.body;
    const [rows] = await db.execute('SELECT id FROM encadreurs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Encadreur introuvable' });
    await db.execute("UPDATE encadreurs SET prenom=?,nom=?,email=?,grade=?,departement=? WHERE id=?", [prenom, nom, email||null, grade||null, departement||null, req.params.id]);
    await log('edit', `Encadreur ${prenom} ${nom} modifié`, req.user?.id);
    res.json({ message: 'Encadreur mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM encadreurs WHERE id = ?', [req.params.id]);
    const e = rows[0];
    if (!e) return res.status(404).json({ message: 'Encadreur introuvable' });
    await db.execute('DELETE FROM encadreurs WHERE id = ?', [req.params.id]);
    await log('delete', `Encadreur ${e.prenom} ${e.nom} supprimé`, req.user?.id);
    res.json({ message: 'Encadreur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
