📘 Project Guidelines – XRP Explorer

🎯 Objectif du projet

Créer un site web open-source qui permet :

1. Stats globales XRP (RichList style) :
   • Ledger index
   • Date d’actualisation
   • Total XRP
   • XRP non séquestré
   • Prix actuel XRP/USD
   • Nombre de portefeuilles XRP
   • Deux tableaux (distribution des soldes et pourcentage des comptes)
2. Exploration d’adresses XRP (XRPScan style) :
   • Recherche d’une adresse
   • QR code de l’adresse
   • Balance + tokens associés
   • Dernières transactions
   • Plus gros dépôts/retraits
   • Infos du compte (flags, propriétés)

Le site doit être rapide, lisible, simple, beau et maintenable sur le long terme.

⸻

⚡ Choix technologiques (décision finale)

🔹 Backend
• Langage : Python (plus clair, plus simple pour IA et maintenable).
• Framework : FastAPI (rapide, moderne, supporte OpenAPI, parfait pour IA).
• Librairie XRP : xrpl-py pour interagir avec le réseau XRP.
• Tâches planifiées : Celery ou APScheduler pour rafraîchir les stats toutes les X minutes.

🔹 Base de données
• PostgreSQL (robuste, open-source, idéal pour stocker stats et historique).
• Redis (cache en mémoire) → accélère les requêtes lourdes (ex : top wallets).

🔹 Frontend
• Framework : Next.js (React, SEO-friendly, ultra rapide).
• Style : TailwindCSS (design simple et modulaire).
• Charts : Recharts (statistiques lisibles et modernes).
• UI Components : shadcn/ui (propre, minimaliste, accessible).

🔹 Hébergement
• Frontend : Vercel (intégré avec Next.js, facile).
• Backend : Railway ou Render (déploiement rapide et scalable).
• DB : Supabase (Postgres managé, simple à utiliser).
• Cache : Redis sur Railway/Upstash.

⸻

🛠️ Organisation du projet

📂 Arborescence

xrp-explorer/
│── backend/
│ ├── app/
│ │ ├── main.py # Entrée FastAPI
│ │ ├── routes/ # Routes API (stats, comptes, transactions)
│ │ ├── services/ # Logique métier (xrpl, db, cache)
│ │ ├── models/ # Schémas Pydantic & ORM
│ │ └── utils/ # Fonctions utilitaires
│ └── requirements.txt # Dépendances Python
│
│── frontend/
│ ├── pages/ # Pages Next.js
│ ├── components/ # Composants réutilisables
│ ├── styles/ # Tailwind config
│ ├── utils/ # Fonctions frontend (API fetch)
│ └── package.json
│
│── docker-compose.yml # Déploiement DB/Backend/Cache
│── README.md
│── GUIDELINES.md # Ce fichier

🔄 Flux de données

1. Backend (FastAPI) appelle l’API XRP Ledger via xrpl-py.
2. Les données sont :
   • mises en cache dans Redis pour éviter les appels répétés,
   • stockées dans Postgres pour l’historique et les stats calculées.
3. Frontend (Next.js) interroge l’API backend (jamais directement le XRP Ledger).
4. Frontend affiche les stats et graphiques (React + Tailwind + Recharts).

⸻

🎨 UX & UI
• Page d’accueil :
• Stats globales XRP (ledger, total, prix, wallets).
• Graphiques (distribution, pourcentages).
• Page recherche adresse :
• Barre de recherche (adresse XRP).
• QR code généré automatiquement.
• Balance, tokens, transactions récentes.
• Top transferts reçus/envoyés.
• Mode sombre : toggle light/dark.
• Navigation claire :
•    [Stats] | [Recherche adresse] | [Top Wallets]

⸻

📐 Bonnes pratiques
• Documentation API auto-générée avec OpenAPI (FastAPI).
• Code commenté et modulaire (important pour l’IA).
• Tests unitaires (Pytest côté backend, Jest côté frontend).
• CI/CD avec GitHub Actions (tests + déploiement auto).
• Performance :
• Cache Redis pour éviter surcharge API.
• Requêtes SQL optimisées.
• Pages Next.js générées côté serveur (SSR).

⸻

🤖 Utilisation de l’IA
• Rédiger du code clair et modulaire → l’IA pourra facilement générer ou modifier des parties spécifiques.
• Donner le GUIDELINES.md + README.md à l’IA → elle saura le contexte complet du projet.
• Demander des fonctions isolées (ex : “génère une route FastAPI qui retourne le prix du XRP via CoinGecko”).
• Exploiter OpenAPI → l’IA peut créer automatiquement du code frontend qui consomme ton API backend.

⸻
