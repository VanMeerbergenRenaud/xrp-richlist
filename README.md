🌐 XRP Explorer – Open Source Project

📖 Description

XRP Explorer est un site web open-source permettant :
• D’afficher les statistiques globales du réseau XRP (ledger, total supply, wallets, prix, distribution des soldes).
• De rechercher et consulter une adresse XRP (balance, transactions, tokens, QR code).

Inspiré de RichList et XRPScan, ce projet vise à offrir un outil simple, rapide et accessible à tous.

⸻

✨ Fonctionnalités
• Page Stats globales: dernier ledger index, date d’actualisation, total XRP, XRP non séquestré, prix XRP/USD, nombre de portefeuilles, distribution des soldes (% par tranches).
• Rich List: top portefeuilles et tableaux de répartition.
• Recherche d’adresse: QR code, balance, tokens associés (IOUs), flags/propriétés du compte, dernières transactions, plus gros dépôts/retraits.
• Performance: pages statiques avec revalidation, cache multi-niveaux, UI rapide et lisible.
• Accessibilité & Mobile: design responsive, dark mode, A11y.

⸻

⚡ Stack choisie
• Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Chart.js (graphes), i18n (next-intl).
• Backend API: Fastify (Node.js) + TypeScript + OpenAPI (Swagger) + Zod pour validation.
• Client XRPL: xrpl.js (WebSocket) + Ripple Data API (fallback/agrégation).
• Base de données: PostgreSQL (hébergée, ex. Neon/Supabase) + Prisma ORM.
• Cache & Jobs: Redis (Upstash) + BullMQ pour workers/cron (ingestion prix, snapshots, agrégations).
• Observabilité: Sentry + OpenTelemetry (traces) + Healthchecks.
• Déploiement: 
  - Frontend: Vercel
  - API & Worker: Fly.io/Render
  - DB: Neon/Supabase
  - Redis: Upstash
• Auth & Sécurité: Pas d’auth initiale (lecture seule). Rate limiting, CORS strict, headers sécurité (Helmet), audit dépendances.

⛓️ Architecture en bref
• web (Next.js): routes /, /stats, /address/:rAddress, /richlist. ISR + revalidation à la demande.
• api (Fastify): 
  - GET /api/metrics: stats globales
  - GET /api/richlist: top wallets, répartition
  - GET /api/address/:address: profil, flags, balances, tokens
  - GET /api/address/:address/txs: transactions/agrégats
• worker: tâches planifiées (prix CoinGecko, snapshots métriques, recalcul distributions, warm cache).
• PostgreSQL: tables comptes, transactions, tokens, snapshots métriques, historique prix.
• Redis: cache clé/valeur, rate limit et queues.

⸻

🚀 Démarrage rapide (dev)
Prérequis:
• Node.js LTS
• pnpm
• Docker (pour Postgres/Redis en local)

1) Cloner et installer
• pnpm install

2) Lancer services (local)
• docker compose up -d  # postgres + redis

3) Variables d’environnement (.env)
Voir section ci-dessous.

4) Migrations DB
• pnpm -w prisma:migrate

5) Démarrer
• pnpm -w dev
Web: http://localhost:3000
API: http://localhost:4000

⸻

🔐 Variables d’environnement (exemples)
• DATABASE_URL=postgres://user:pass@localhost:5432/xrp_explorer
• REDIS_URL=redis://localhost:6379
• XRPL_ENDPOINTS=wss://xrplcluster.com,wss://s1.ripple.com
• RIPPLE_DATA_API=https://data.ripple.com
• COINGECKO_API_KEY=xxxx (optionnel)
• NEXT_PUBLIC_SITE_URL=http://localhost:3000
• SENTRY_DSN=xxxx (optionnel)

⸻

🛠️ Scripts utiles (monorepo)
• pnpm -w dev            # lance web + api + worker en dev
• pnpm -w build          # build de tous les packages
• pnpm -w start          # démarre en prod
• pnpm -w prisma:migrate # migrations DB
• pnpm -w lint           # ESLint
• pnpm -w test           # tests unitaires
• pnpm -w e2e            # tests end-to-end

⸻

✅ Qualité & CI
• Conventions de commits: Conventional Commits.
• Lint & format: ESLint + Prettier.
• Tests: Vitest (unitaires), Playwright (E2E).
• CI: GitHub Actions (lint, tests, build) sur PR.

🔒 Sécurité
• Validation stricte (Zod) sur toutes les entrées.
• Rate limiting + cache anti-abus sur endpoints publics.
• Headers de sécurité (CSP, HSTS, X-Frame-Options).
• Dépendances scannées (npm audit/OWASP).

⛳ Roadmap
• v0.1: Page Stats globales + prix + distribution.
• v0.2: Recherche adresse + profil + transactions récentes.
• v0.3: Rich List + tableaux détaillés + top transferts.
• v0.4: Internationalisation + thèmes + améliorations A11y.
• v1.0: Documentation complète, tests E2E, monitoring prod.

🤝 Contribution
• Fork → branche feature → PR avec description claire et captures.
• Respecter le style de code, tests et conventions de commit.
• Ouvrir une issue pour discuter d’un changement majeur.

⸻

📜 Licence
Projet open-source, licence MIT.