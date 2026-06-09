# ScolarAI - Plateforme de Gestion Scolaire Intelligente

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/Sis-touche/ScolarAI_web)](https://github.com/Sis-touche/ScolarAI_web/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/Sis-touche/ScolarAI_web)](https://github.com/Sis-touche/ScolarAI_web/issues)

## 📋 Table des Matières

- [À Propos](#à-propos)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du Projet](#structure-du-projet)
- [API Documentation](#api-documentation)
- [Contribution](#contribution)
- [Licence](#licence)
- [Contactez-nous](#contactez-nous)

## 🎯 À Propos

**ScolarAI** est une plateforme web intelligente conçue pour optimiser la gestion administrative et pédagogique des établissements scolaires. Combinant des technologies modernes avec une interface intuitive, ScolarAI facilite la gestion des élèves, des enseignants, des cours et des performances académiques.

## ✨ Fonctionnalités

### Fonctionnalités Principales
- 📚 **Gestion des Cours** - Création et gestion centralisée des programmes académiques
- 👥 **Gestion des Utilisateurs** - Administration des profils d'élèves, enseignants et administrateurs
- 📊 **Suivi des Performances** - Analytics et rapports détaillés sur les résultats académiques
- 🔐 **Système d'Authentification** - Authentification sécurisée et gestion des permissions
- 🎓 **Gestion des Résultats** - Saisie et consultation des notes et bulletins
- 📱 **Interface Responsive** - Compatible desktop et mobile

### Fonctionnalités Additionnelles (Roadmap)
- 🤖 Intégration d'IA pour recommandations pédagogiques
- 📧 Notifications et alertes en temps réel
- 📄 Génération automatique de rapports

## 🏗️ Architecture

ScolarAI suit une architecture **client-serveur** moderne :

```
ScolarAI_web/
├── back-scolar_ai/        # Backend (Node.js/Express)
│   ├── models/           # Modèles de données
│   ├── routes/           # Routes API
│   ├── controllers/       # Logique métier
│   ├── middleware/        # Middlewares personnalisés
│   └── config/           # Fichiers de configuration
│
└── front-scolar_ai/       # Frontend (React/Vue)
    ├── src/
    │   ├── components/    # Composants réutilisables
    │   ├── pages/        # Pages principales
    │   ├── services/     # Services API
    │   └── assets/       # Ressources statiques
    └── public/           # Fichiers publics
```

## 📋 Prérequis

### Environnement
- **Node.js** : v14.0.0 ou supérieur
- **npm** : v6.0.0 ou supérieur
- **Git** : Pour le contrôle de version

### Services Externes (Optionnels)
- Base de données (MongoDB ou PostgreSQL)
- Service de mail (pour notifications)

## 🚀 Installation

### 1. Cloner le Référentiel

```bash
git clone https://github.com/Sis-touche/ScolarAI_web.git
cd ScolarAI_web
```

### 2. Installation du Backend

```bash
cd back-scolar_ai
npm install
```

### 3. Installation du Frontend

```bash
cd ../front-scolar_ai
npm install
```

## ⚙️ Configuration

### Variables d'Environnement Backend

Créez un fichier `.env` dans le répertoire `back-scolar_ai` :

```env
# Serveur
PORT=5000
NODE_ENV=development

# Base de Données
DATABASE_URL=mongodb://localhost:27017/scolar_ai
# ou pour PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/scolar_ai

# Authentification
JWT_SECRET=votre_cle_secrete_jwt
JWT_EXPIRE=7d

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe

# CORS
FRONTEND_URL=http://localhost:3000
```

### Variables d'Environnement Frontend

Créez un fichier `.env` dans le répertoire `front-scolar_ai` :

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

## 💻 Utilisation

### Démarrer le Backend

```bash
cd back-scolar_ai
npm start
```

Le serveur démarrera sur `http://localhost:5000`

### Démarrer le Frontend

```bash
cd front-scolar_ai
npm start
```

L'application sera accessible sur `http://localhost:3000`

### Mode Développement

Pour le développement avec hot-reload :

**Backend :**
```bash
cd back-scolar_ai
npm run dev
```

**Frontend :**
```bash
cd front-scolar_ai
npm run dev
```

## 📁 Structure du Projet

```
back-scolar_ai/
├── src/
│   ├── models/          # Schémas de données
│   ├── routes/          # Définitions des routes API
│   ├── controllers/      # Logique des endpoints
│   ├── middleware/       # Authentification, validation
│   ├── config/          # Configuration BD, variables
│   └── app.js           # Point d'entrée
├── .env.example         # Template variables d'environnement
├── package.json         # Dépendances et scripts
└── README.md            # Documentation backend

front-scolar_ai/
├── src/
│   ├── components/      # Composants réutilisables
│   ├── pages/          # Pages principales
│   ├── services/        # Requêtes API
│   ├── styles/         # Fichiers CSS/SCSS
│   ├── App.js          # Composant racine
│   └── index.js        # Point d'entrée
├── public/             # Actifs publics
├── package.json        # Dépendances et scripts
└── README.md           # Documentation frontend
```

## 🔗 API Documentation

### Authentification

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "utilisateur@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "role": "..." }
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "password": "password123",
  "role": "student"
}
```

### Utilisateurs

```http
GET /api/users                    # Lister les utilisateurs
GET /api/users/:id                # Détail d'un utilisateur
POST /api/users                   # Créer un utilisateur
PUT /api/users/:id                # Modifier un utilisateur
DELETE /api/users/:id             # Supprimer un utilisateur
```

### Cours

```http
GET /api/courses                  # Lister les cours
GET /api/courses/:id              # Détail d'un cours
POST /api/courses                 # Créer un cours
PUT /api/courses/:id              # Modifier un cours
DELETE /api/courses/:id           # Supprimer un cours
```

Pour la documentation API complète, consultez [API_DOCS.md](./API_DOCS.md) (à créer).

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer au projet :

1. **Fork** le repository
2. **Créer une branche** pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. **Committer** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Pousser** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir une Pull Request**

### Lignes Directrices de Contribution

- Respecter les conventions de code du projet
- Ajouter des tests pour les nouvelles fonctionnalités
- Mettre à jour la documentation
- Écrire des messages de commit clairs et descriptifs

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Contactez-nous

### Support
- 📧 **Email** : support@scolar-ai.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/Sis-touche/ScolarAI_web/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/Sis-touche/ScolarAI_web/discussions)

### Auteur
- **Sis-touche** - [Profile GitHub](https://github.com/Sis-touche)

---

## 📚 Ressources Utiles

- [Documentation Node.js](https://nodejs.org/en/docs/)
- [Documentation React](https://react.dev)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**Merci de votre intérêt pour ScolarAI ! N'hésitez pas à nous contacter pour toute question ou suggestion.**

*Dernière mise à jour : Juin 2026*
