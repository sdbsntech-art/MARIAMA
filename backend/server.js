require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

require('./database/db'); // init DB

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15*60*1000, max: 500 }));

// Fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes API
const auth = require('./middleware/auth');
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/etudiants',   auth, require('./routes/etudiants'));
app.use('/api/encadreurs',  auth, require('./routes/encadreurs'));
app.use('/api/soutenances', auth, require('./routes/soutenances'));
app.use('/api/stats',       auth, require('./routes/stats'));
app.use('/api/export',      auth, require('./routes/export'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Erreurs
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🎓 SoutenancePro → http://localhost:${PORT}`);
  console.log(`   Login : admin / admin123\n`);
});
