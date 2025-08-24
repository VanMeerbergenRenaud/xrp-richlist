🌐 XRP Explorer – Open Source Project

📖 Description

XRP Explorer est un site web open-source permettant :
• D’afficher les statistiques globales du réseau XRP (ledger, total supply, wallets, prix, distribution des soldes).
• De rechercher et consulter une adresse XRP (balance, transactions, tokens, QR code).

Inspiré de RichList et XRPScan, ce projet vise à offrir un outil simple, rapide et accessible à tous.

⸻

⚡ Stack choisie
• Backend : Python, FastAPI, xrpl-py
• Base de données : PostgreSQL + Redis (cache)
• Frontend : Next.js (React), TailwindCSS, Recharts
• Hébergement :
• Frontend → Vercel
• Backend → Railway / Render
• DB → Supabase (Postgres as a Service)

⸻

🚀 Installation & Lancement

1. Cloner le projet

| git clone https://github.com/username/xrp-explorer.git
| cd xrp-explorer

2. Backend (FastAPI + Python)

Installation

cd backend
python -m venv venv
source venv/bin/activate # (Linux/Mac)
venv\Scripts\activate # (Windows)

pip install -r requirements.txt

Lancement local

uvicorn app.main:app --reload

👉 Le backend sera disponible sur :
http://127.0.0.1:8000

👉 Documentation API auto-générée :
http://127.0.0.1:8000/docs

3. Base de données

PostgreSQL

Créer une base PostgreSQL (locale ou Supabase). Exemple (Postgres local) :

createdb xrp_explorer

Variables d’environnement à définir dans .env :

DATABASE_URL=postgresql://user:password@localhost:5432/xrp_explorer
REDIS_URL=redis://localhost:6379/0

Redis

Lancer Redis (Docker ou local) :

docker run -d --name redis -p 6379:6379 redis

4. Frontend (Next.js + Tailwind)

Installation

cd frontend
npm install

Lancement local

npm run dev

👉 Le frontend sera dispo sur :
http://localhost:3000

📂 Arborescence du projet

xrp-explorer/
│── backend/ # API FastAPI
│ ├── app/
│ │ ├── main.py # Entrée FastAPI
│ │ ├── routes/ # Routes API
│ │ ├── services/ # Logique métier (xrpl, db, cache)
│ │ ├── models/ # Schémas (Pydantic, ORM)
│ │ └── utils/ # Fonctions utilitaires
│ └── requirements.txt
│
│── frontend/ # Interface Next.js
│ ├── pages/ # Pages principales
│ ├── components/ # Composants réutilisables
│ ├── styles/ # Tailwind config
│ ├── utils/ # API fetch utils
│ └── package.json
│
│── docker-compose.yml # Déploiement DB + Redis
│── .env.example # Variables d’environnement
│── README.md
│── GUIDELINES.md # Règles et choix du projet

🛠️ Développement

Backend
• Routes FastAPI → dans app/routes/
• Services (xrpl, DB, cache) → dans app/services/
• Schémas Pydantic → dans app/models/

Frontend
• Pages Next.js → dans frontend/pages/
• Composants UI → dans frontend/components/
• Graphiques → avec Recharts
• Style global → TailwindCSS

⸻

📊 Fonctionnalités prévues

✅ Stats globales XRP
✅ Distribution des soldes (tableaux + graphiques)
✅ Recherche d’adresse XRP
✅ QR code d’adresse
✅ Dernières transactions + plus gros transferts
✅ Mode clair/sombre
✅ Classement des wallets les plus riches

⸻

🤖 IA & Maintenabilité
• Code clair, documenté et modulaire.
• L’IA peut se baser sur GUIDELINES.md pour comprendre les choix.
• OpenAPI docs générées automatiquement pour l’API backend.
• CI/CD GitHub Actions → tests + déploiement auto.

⸻

📜 Licence

Projet open-source, licence MIT.