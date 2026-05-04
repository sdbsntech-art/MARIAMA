/* ============================================================
   database/db.js  —  mysql2/promise (MySQL/Laragon)
   ============================================================ */

const mysql = require('mysql2/promise');

let pool;
const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (dbUrl) {
  console.log("--- CONNEXION VIA URL DÉTECTÉE ---");
  pool = mysql.createPool(dbUrl);
} else {
  const dbConfig = {
    host:     process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
    user:     process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'soutenance_db',
    port:     process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  };
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// On garde une référence pour le bootstrap
const dbHost = dbUrl ? 'URL Railway' : (process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1');
const dbName = dbUrl ? 'Base Railway' : (process.env.MYSQLDATABASE || process.env.DB_NAME || 'soutenance_db');

async function bootstrap() {
  try {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
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

    console.log("--- CONNEXION BASE DE DONNÉES ---");
    console.log(`Hôte : ${dbHost}`);
    console.log(`Base : ${dbName}`);
    
    for (const sql of schemas) {
      await pool.query(sql);
    }
    
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin@@123', 12);
      await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
      console.log('✓ Admin par défaut créé : admin / admin@@123');
    } else {
      // Sécurité : S'assurer que seul 'admin' est administrateur
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin@@123', 12);
      // On met à jour l'admin s'il existe
      await pool.query('UPDATE users SET role = "admin", password = ? WHERE username = "admin"', [hash]);
      // On rétrograde tous les autres
      await pool.query('UPDATE users SET role = "user" WHERE username != "admin"');
      console.log('✓ Droits admin restreints au compte "admin" uniquement');
    }
    
    console.log('✅ Base de données opérationnelle');
  } catch (err) {
    console.error('❌ ERREUR DÉTAILLÉE :');
    console.error(err); // Affiche l'objet erreur complet
    console.error('Message :', err.message);
    console.error('Code :', err.code);
    process.exit(1);
  }
}

bootstrap();

module.exports = pool;
