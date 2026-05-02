/* ============================================================
   database/db.js  —  mysql2/promise (MySQL/Laragon)
   ============================================================ */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'soutenance_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function bootstrap() {
  try {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS encadreurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prenom VARCHAR(255) NOT NULL,
        nom VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        grade VARCHAR(255),
        departement VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS etudiants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prenom VARCHAR(255) NOT NULL,
        nom VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        filiere VARCHAR(255) NOT NULL,
        numero VARCHAR(255),
        sujet TEXT NOT NULL,
        encadreur_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS soutenances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        date DATE NOT NULL,
        heure TIME NOT NULL,
        salle VARCHAR(255) NOT NULL,
        duree INT DEFAULT 60,
        jury TEXT,
        statut VARCHAR(50) DEFAULT 'planifie',
        note_memoire FLOAT,
        note_oral FLOAT,
        appreciation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    console.log("--- DIAGNOSTIC DES VARIABLES ---");
    console.log("Variables détectées :", Object.keys(process.env).filter(k => k.startsWith('DB_') || k.startsWith('MYSQL')));
    console.log(`✓ Tentative de connexion MySQL sur : ${process.env.DB_HOST || '127.0.0.1'}`);
    for (const sql of schemas) {
      await pool.query(sql);
    }
    
    // ... (le reste du code pour l'admin reste identique)
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 12);
      await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
      console.log('✓ Utilisateur admin par défaut créé (admin / admin123)');
    }
    
    console.log('✓ Base de données MySQL prête →', process.env.DB_NAME || 'soutenance_db');
  } catch (err) {
    console.error('❌ Erreur de connexion MySQL :', err.message);
    console.error('Hôte utilisé :', process.env.DB_HOST || '127.0.0.1');
    process.exit(1);
  }
}

bootstrap();

module.exports = pool;
