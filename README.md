# 🎓 SoutenancePro — Système de Gestion des Soutenances
**ESP-UCAD · DSECG2 · 2025/2026**

## Architecture

```
soutenance-app/
├── frontend/          ← HTML + CSS + JS pur (interface)
│   ├── index.html     ← Page de connexion
│   ├── dashboard.html ← Application principale
│   ├── css/           ← Styles (main.css, login.css, dashboard.css)
│   └── js/            ← Modules JS (api, app, dashboard, etudiants...)
│
├── backend/           ← Node.js + Express (API REST)
│   ├── server.js      ← Point d'entrée
│   ├── database/db.js ← SQLite + schéma + seed data
│   ├── middleware/    ← JWT auth middleware
│   └── routes/        ← etudiants, encadreurs, soutenances, stats, export
│
└── security/          ← Python + FastAPI (sécurité)
    ├── main.py        ← Auth, bcrypt, JWT, blacklist, rate limiting
    └── requirements.txt
```

## Fonctionnalités

| Module          | Fonctionnalités |
|----------------|-----------------|
| 🔐 Authentification | Login sécurisé, JWT, bcrypt, rate limiting, token refresh |
| 👨‍🎓 Étudiants | CRUD complet, filtre filière, recherche, pagination |
| 👨‍🏫 Encadreurs | CRUD, comptage des étudiants encadrés |
| 📅 Soutenances  | Planification, détection de conflits de salle, statuts |
| 🗓️ Planning    | Vue calendrier hebdomadaire, navigation, impression |
| ⭐ Notes        | Saisie note mémoire + oral, calcul moyenne, mentions |
| 📊 Dashboard    | Statistiques temps réel, graphique filières, activité |
| 📥 Export       | CSV pour étudiants, encadreurs, soutenances, résultats |

## Installation & Démarrage

### 1. Backend Node.js

```bash
cd backend
npm install
npm start
# → API disponible sur http://localhost:3000
```

### 2. Service Sécurité Python

```bash
cd security
pip install -r requirements.txt
python main.py
# → Service disponible sur http://localhost:5000
```

### 3. Frontend

```bash
# Option A : avec le backend (serveur statique intégré)
# Accès via http://localhost:3000

# Option B : serveur HTTP simple
cd frontend
npx serve .     # ou python -m http.server 8080
```

### Compte démo
- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

## Sécurité

- ✅ **Bcrypt** (12 rounds) pour les mots de passe
- ✅ **JWT HS256** avec expiration (8h access / 7j refresh)
- ✅ **Rate limiting** : 5 tentatives / 5 min par IP
- ✅ **Token blacklist** (révocation logout)
- ✅ **Protection timing attack** (vérification constante)
- ✅ **Validation** des inputs (côté backend)
- ✅ **SQL injection** impossible (requêtes paramétrées SQLite)
- ✅ **Helmet** headers sécurité HTTP
- ✅ **CORS** configuré
- ✅ **XSS** : échappement HTML côté frontend

## Technologies

- **Frontend** : HTML5 · CSS3 · JavaScript ES6+ (Vanilla)
- **Backend** : Node.js · Express.js · better-sqlite3
- **Sécurité** : Python · FastAPI · passlib (bcrypt) · python-jose
- **Base de données** : SQLite3 (fichier local)
- **Design** : Dark Navy + Gold · Playfair Display + DM Sans

---
*Projet DSECG2 · Département de Gestion · ESP-UCAD*
