/* routes/stats.js */
const router = require('express').Router();
const db     = require('../database/db');

router.get('/dashboard', async (req, res) => {
  try {
    const [[{ c: total_etudiants }]] = await db.execute('SELECT COUNT(*) as c FROM etudiants');
    const [[{ c: total_encadreurs }]] = await db.execute('SELECT COUNT(*) as c FROM encadreurs');
    const [[{ c: soutenances_planifiees }]] = await db.execute("SELECT COUNT(*) as c FROM soutenances WHERE statut IN ('planifie','en_cours')");
    const [[{ c: a_planifier }]] = await db.execute('SELECT COUNT(*) as c FROM etudiants e WHERE NOT EXISTS (SELECT 1 FROM soutenances s WHERE s.etudiant_id=e.id)');

    const today = new Date().toISOString().slice(0,10);
    const [prochaines] = await db.execute(`
      SELECT s.*, CONCAT(e.prenom, ' ', e.nom) AS etudiant_nom, e.filiere
      FROM soutenances s JOIN etudiants e ON e.id=s.etudiant_id
      WHERE s.date >= ? AND s.statut IN ('planifie','en_cours')
      ORDER BY s.date, s.heure LIMIT 6`, [today]);

    const [par_filiere] = await db.execute('SELECT filiere, COUNT(*) as count FROM etudiants GROUP BY filiere ORDER BY count DESC');

    res.json({ total_etudiants, total_encadreurs, soutenances_planifiees, a_planifier, prochaines_soutenances: prochaines, par_filiere });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const [data] = await db.execute('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
