# Guides de développement – XRP Rich List

Ce document rassemble des informations spécifiques à ce dépôt (frontend Next.js + backend FastAPI + indexer) pour accélérer la prise en main et fiabiliser les évolutions.


## 1) Build / Configuration

### 1.1 Frontend (web/ – Next.js 15, React 19)
- Démarrage en dev: `cd web && npm install && npm run dev`
- Build prod: `npm run build` puis `npm start`
- Variables d’environnement (web):
  - `BACKEND_BASE_URL` (optionnel): URL d’un backend externe. Si défini, les routes Next `/api/backend/**` proxyfient vers ce backend, sinon elles calculent localement (ex: distribution XRPL par échantillonnage via `web/src/lib/xrpl/distribution.ts`).
  - Toute variable ajoutée côté Next doit être exposée via process.env dans les routes API (les composants client ne lisent pas directement les secrets).
- Points clés d’architecture web:
  - Pages `app/` (App Router). Exemples: `/stats` affiche la distribution et les pourcentages; `/info` regroupe des infos projet.
  - `src/contexts/StatsContext.tsx` centralise le chargement/partage des stats.
  - Les routes d’API internes côté Next pertinent pour les stats:
    - `src/app/api/backend/stats/balance-distribution/route.ts`
    - `src/app/api/backend/stats/percentages/route.ts`
    - Comportement: proxy si `BACKEND_BASE_URL` est présent; fallback calcul local sinon.
  - `dynamic = "force-dynamic"` est utilisé sur certaines routes pour contourner la mise en cache ISR par défaut.

### 1.2 Backend (api/ – FastAPI)
- L’API regroupe:
  - `/stats/balance-distribution` et `/stats/percentages` (avec cache mémoire)
  - `/top`, `/account/{account}`, `/search/{account}`, `/stats/general`.
- Démarrage local (nécessite PostgreSQL):
  - Vars requises: `DATABASE_URL` (URI Postgres). Exemple: `postgresql://user:pass@localhost:5432/xrp`
  - Installer: `pip install -r api/requirements.txt`
  - Lancer: `uvicorn api.main:app --reload`
- Points clés:
  - Cache en mémoire mis à jour au startup et au plus toutes les heures (`update_stats_cache`).
  - Le calcul des tranches de solde est SQL-first (agrégations ORDER/GROUP CASE cohérentes avec l’exemple souhaité — voir stats.png).
  - En absence de données, les endpoints retournent des tableaux vides au lieu d’erreurs, ce que le frontend sait gérer.

### 1.3 Docker / Compose
- Des Dockerfile existent pour `web/`, `api/`, `indexer/` et un `docker-compose.yml` racine.
- Workflow local typique:
  1) Démarrer Postgres (via compose) et exécuter `db/001_init.sql` si nécessaire.
  2) Peupler avec `quick_test_data.sql` ou `init_test_data.py`/`populate_db.py`.
  3) Lancer `api/` puis `web/`. Assurez-vous que `web` pointe sur l’URL de `api` via `BACKEND_BASE_URL`.


## 2) Tests

Le dépôt n’impose pas de framework lourd. Pour tester rapidement les utilitaires TypeScript du frontend, on utilise `tsx` (transpilation à la volée). C’est volontairement minimal pour coller à l’architecture actuelle.

### 2.1 Installer et configurer
- Dans `web/package.json`, le script suivant est disponible:
  - `"test:utils": "tsx tests/utils.test.ts"`
- Dépendance de dev: `tsx` (déjà ajoutée dans `devDependencies`).
- Installation: `cd web && npm install`

### 2.2 Exécuter les tests
- Exemple (réellement exécuté avant rédaction de ce guide):
  - Fichier temporaire `web/tests/utils.test.ts` (supprimé ensuite) testant:
    - `parseRangeBounds`
    - `isDistributionValid`
    - `sanitizeAndValidateDistribution`
    - `estimateRankFromDistribution`
  - Commande: `npm run test:utils`
  - Sortie obtenue: `All utils tests passed.`

### 2.3 Ajouter de nouveaux tests
- Créer un fichier `web/tests/<nom>.test.ts` et importer directement les modules TS via alias `@/` (configuré dans `tsconfig.json`).
- Utilisez `node:assert` pour rester sans dépendances:
  - Exemple:
    ```ts
    import assert from "node:assert";
    import { myFn } from "@/lib/foo";
    assert.strictEqual(myFn(2), 4);
    ```
- Exécution: `npm run test:utils` si vous centralisez ou créez d’autres scripts, p.ex. `"test": "tsx tests/**/*.test.ts"`.

### 2.4 Nettoyage
- Conformément à la consigne, les fichiers de test créés pour la démonstration sont supprimés après exécution. Vous pouvez toutefois conserver un répertoire `tests/` si vous formalisez une suite plus large — adaptez le script npm en conséquence.


## 3) Informations de développement supplémentaires

### 3.1 Style / Lint / Format
- ESLint + `eslint-config-next` et Prettier sont configurés. Commandes:
  - `npm run lint`
  - `npm run format`
- TailwindCSS 3.4 est utilisé; la configuration se trouve dans `web/tailwind.config.js`. Styles globaux dans `web/src/app/globals.css`.

### 3.2 Affichage Stats (page /stats)
- `src/components/pages/StatsPage.tsx` consomme `StatsContext` et affiche:
  - Distribution des comptes par tranches (table/graphe possible, Recharts dispo)
  - Statistiques de pourcentage (0.01%, 0.1%, 0.2%, 0.5%, 1%, 2%, 3%, 4%, 5%, 10%)
- Si `BACKEND_BASE_URL` est défini, les données proviennent de l’API; sinon, fallback local (XRPL sampling) via `lib/xrpl/distribution.ts`.
- Bonnes pratiques UI: marquer le chargement, gérer les tableaux vides (pas d’exception), et normaliser les nombres (séparateurs, précision fixée à 6 pour les sommes de XRP, cf. `sanitizeAndValidateDistribution`).

### 3.3 Points d’attention techniques
- XRPL:
  - Les endpoints publics peuvent limiter/dégrader la réponse; prévoir retries/timeouts au besoin dans `lib/xrpl/distribution.ts`.
  - Ne mélangez pas la logique de proxy (BACKEND) et de fallback dans les composants UI; la logique reste confinée aux routes API.
- Base de données (API):
  - Les agrégations SQL définissent strictement l’ordre des tranches pour un rendu stable. Conservez l’ordre CASE si vous modifiez les seuils.
  - Le cache mémoire évite les hits lourds; exposez un endpoint `/stats/refresh` pour forcer la màj si vous automatisez.
- Perf Next.js:
  - Pour des endpoints de stats live, forcez le mode dynamique (`export const dynamic = "force-dynamic"`) pour éviter ISR/caching inadapté.
- Sécurité:
  - Ne divulguez pas de secrets côté client. Les appels XRPL ou DB sensibles doivent rester côté serveur (routes API Next ou FastAPI).

### 3.4 Procédure type pour enrichir la page "Statistiques"
1) Étendre les endpoints backend (ou la route API Next proxy) pour inclure les nouvelles métriques désirées.
2) Exposer ces données via `StatsContext` avec un typage strict et un état de chargement/erreur.
3) Normaliser les nombres (utiliser des helpers proches de `sanitizeAndValidateDistribution`).
4) Ajouter des tests de fonctions pures (formatage, binning, agrégations locales) avec `tsx`.
5) Vérifier visuellement la conformité avec l’exemple (cf. stats.png) et tracer les valeurs sources (ledger index/date, total XRP, escrow, prix, nb wallets) si disponibles côté backend.


## 4) Annexes rapides
- Alias TS: `@/*` pointe vers `web/src/*`.
- Si vous ne souhaitez pas garder `tsx`, vous pouvez le retirer: `npm remove tsx` et supprimer le script `test:utils` — mettez à jour ce guide en conséquence.

