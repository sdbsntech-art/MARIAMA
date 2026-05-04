/* routes/auth.js */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database/db');

const JWT_SECRET  = process.env.JWT_SECRET  || 'soutenance_secret_esp_ucad_2025';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Identifiant et mot de passe requis' });

    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username.trim()]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    await db.execute("INSERT INTO activity_log (type, message, user_id) VALUES ('edit',?,?)", [`Connexion de ${user.username}`, user.id]);

    res.json({
      access_token: token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6)
      return res.status(400).json({ message: 'Identifiant et mot de passe (min 6 caractères) requis' });

    if (username.trim().toLowerCase() === 'admin')
      return res.status(400).json({ message: 'Ce nom d\'utilisateur est réservé' });

    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0)
      return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà' });

    const hash = bcrypt.hashSync(password, 12);
    const [result] = await db.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username.trim(), hash, 'user']);

    await db.execute("INSERT INTO activity_log (type, message, user_id) VALUES ('add',?,?)", [`Inscription de ${username.trim()}`, result.insertId]);

    res.json({ message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const current_password = oldPassword;
    const new_password = newPassword;

    if (!current_password || !new_password || new_password.length < 6)
      return res.status(400).json({ message: 'Données invalides (min 6 caractères)' });

    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(current_password, user.password))
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    const hash = bcrypt.hashSync(new_password, 12);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
