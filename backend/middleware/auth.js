/* middleware/auth.js */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'soutenance_secret_esp_ucad_2025';

module.exports = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};
