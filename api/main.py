from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os, asyncpg, asyncio
from datetime import datetime, timedelta

app = FastAPI(title="XRP Rich List API", version="2.0.0")

# CORS pour permettre les requêtes du frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache pour les statistiques (mise à jour toutes les heures)
stats_cache = {
    "balance_distribution": None,
    "percentages": None,
    "last_update": None,
    "total_accounts": 0,
    "total_xrp": 0
}

async def get_pool():
    if not hasattr(app.state, "pool"):
        app.state.pool = await asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL"),
            min_size=5,
            max_size=20,
            command_timeout=60
        )
    return app.state.pool

async def update_stats_cache():
    """Mise à jour du cache des statistiques"""
    try:
        print("🔄 Début de la mise à jour du cache...")
        pool = await get_pool()

        # Statistiques générales
        print("📊 Récupération des statistiques générales...")
        general_stats = await pool.fetchrow("""
            SELECT COUNT(*) as total_accounts, 
                   COALESCE(SUM(balance_xrp), 0) as total_xrp,
                   MAX(updated_at) as last_sync
            FROM accounts
        """)

        if not general_stats:
            print("❌ Aucune statistique générale trouvée")
            stats_cache.update({
                "total_accounts": 0,
                "total_xrp": 0,
                "balance_distribution": [],
                "percentages": [],
                "last_update": datetime.now()
            })
            return

        stats_cache["total_accounts"] = int(general_stats["total_accounts"])
        stats_cache["total_xrp"] = float(general_stats["total_xrp"])

        print(f"📊 Statistiques générales: {stats_cache['total_accounts']:,} comptes, {stats_cache['total_xrp']:,.2f} XRP")

        if stats_cache["total_accounts"] == 0:
            print("⚠️ Aucun compte en base - cache initialisé avec des tableaux vides")
            stats_cache.update({
                "balance_distribution": [],
                "percentages": [],
                "last_update": datetime.now()
            })
            return

        # Distribution des soldes - requête optimisée
        distribution_query = """
        SELECT 
            CASE 
                WHEN balance_xrp >= 1000000000 THEN '1,000,000,000 - Infinity'
                WHEN balance_xrp >= 500000000 THEN '500,000,000 - 1,000,000,000'
                WHEN balance_xrp >= 100000000 THEN '100,000,000 - 500,000,000'
                WHEN balance_xrp >= 20000000 THEN '20,000,000 - 100,000,000'
                WHEN balance_xrp >= 10000000 THEN '10,000,000 - 20,000,000'
                WHEN balance_xrp >= 5000000 THEN '5,000,000 - 10,000,000'
                WHEN balance_xrp >= 1000000 THEN '1,000,000 - 5,000,000'
                WHEN balance_xrp >= 500000 THEN '500,000 - 1,000,000'
                WHEN balance_xrp >= 100000 THEN '100,000 - 500,000'
                WHEN balance_xrp >= 75000 THEN '75,000 - 100,000'
                WHEN balance_xrp >= 50000 THEN '50,000 - 75,000'
                WHEN balance_xrp >= 25000 THEN '25,000 - 50,000'
                WHEN balance_xrp >= 10000 THEN '10,000 - 25,000'
                WHEN balance_xrp >= 5000 THEN '5,000 - 10,000'
                WHEN balance_xrp >= 1000 THEN '1,000 - 5,000'
                WHEN balance_xrp >= 500 THEN '500 - 1,000'
                WHEN balance_xrp >= 20 THEN '20 - 500'
                ELSE '0 - 20'
            END as range,
            COUNT(*) as accounts,
            SUM(balance_xrp) as total_sum
        FROM accounts 
        GROUP BY 
            CASE 
                WHEN balance_xrp >= 1000000000 THEN 1
                WHEN balance_xrp >= 500000000 THEN 2
                WHEN balance_xrp >= 100000000 THEN 3
                WHEN balance_xrp >= 20000000 THEN 4
                WHEN balance_xrp >= 10000000 THEN 5
                WHEN balance_xrp >= 5000000 THEN 6
                WHEN balance_xrp >= 1000000 THEN 7
                WHEN balance_xrp >= 500000 THEN 8
                WHEN balance_xrp >= 100000 THEN 9
                WHEN balance_xrp >= 75000 THEN 10
                WHEN balance_xrp >= 50000 THEN 11
                WHEN balance_xrp >= 25000 THEN 12
                WHEN balance_xrp >= 10000 THEN 13
                WHEN balance_xrp >= 5000 THEN 14
                WHEN balance_xrp >= 1000 THEN 15
                WHEN balance_xrp >= 500 THEN 16
                WHEN balance_xrp >= 20 THEN 17
                ELSE 18
            END
        ORDER BY 
            CASE 
                WHEN balance_xrp >= 1000000000 THEN 1
                WHEN balance_xrp >= 500000000 THEN 2
                WHEN balance_xrp >= 100000000 THEN 3
                WHEN balance_xrp >= 20000000 THEN 4
                WHEN balance_xrp >= 10000000 THEN 5
                WHEN balance_xrp >= 5000000 THEN 6
                WHEN balance_xrp >= 1000000 THEN 7
                WHEN balance_xrp >= 500000 THEN 8
                WHEN balance_xrp >= 100000 THEN 9
                WHEN balance_xrp >= 75000 THEN 10
                WHEN balance_xrp >= 50000 THEN 11
                WHEN balance_xrp >= 25000 THEN 12
                WHEN balance_xrp >= 10000 THEN 13
                WHEN balance_xrp >= 5000 THEN 14
                WHEN balance_xrp >= 1000 THEN 15
                WHEN balance_xrp >= 500 THEN 16
                WHEN balance_xrp >= 20 THEN 17
                ELSE 18
            END
        """

        distribution_rows = await pool.fetch(distribution_query)
        stats_cache["balance_distribution"] = [
            {
                "accounts": int(row["accounts"]),
                "range": row["range"],
                "sum": f"{float(row['total_sum']):.6f}"
            }
            for row in distribution_rows
        ]

        # Statistiques de percentiles
        percentages = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10]
        percentiles_results = []

        for pct in percentages:
            accounts_count = int((pct / 100) * stats_cache["total_accounts"])
            if accounts_count > 0:
                balance_row = await pool.fetchrow(
                    "SELECT balance_xrp FROM accounts ORDER BY balance_xrp DESC LIMIT 1 OFFSET $1",
                    accounts_count - 1
                )
                min_balance = float(balance_row["balance_xrp"]) if balance_row else 0
            else:
                min_balance = 0

            percentiles_results.append({
                "percentage": f"{pct} %",
                "accounts": accounts_count,
                "balance": f"{min_balance:,.6f} XRP"
            })

        stats_cache["percentages"] = percentiles_results
        stats_cache["last_update"] = datetime.now()

        print("✅ Cache des statistiques mis à jour avec succès")

    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour du cache: {e}")

async def get_cached_stats(stat_type: str):
    """Récupérer les statistiques du cache ou les calculer si nécessaire"""
    now = datetime.now()

    print(f"🔍 Demande de stats pour {stat_type}")
    print(f"    Cache last_update: {stats_cache.get('last_update')}")
    print(f"    Cache {stat_type}: {'présent' if stats_cache.get(stat_type) is not None else 'absent'}")

    # Vérifier si le cache doit être mis à jour (toutes les heures)
    if (stats_cache["last_update"] is None or 
        now - stats_cache["last_update"] > timedelta(hours=1) or
        stats_cache[stat_type] is None):

        print(f"🔄 Mise à jour du cache nécessaire pour {stat_type}")
        await update_stats_cache()

    result = stats_cache.get(stat_type, [])
    print(f"📤 Retour de {len(result) if isinstance(result, list) else 'non-liste'} éléments pour {stat_type}")

    return result if result is not None else []

@app.on_event("startup")
async def startup_event():
    """Initialiser le cache au démarrage"""
    print("🚀 Démarrage de l'API XRP Rich List")
    await update_stats_cache()

@app.get("/")
async def root():
    return {
        "service": "XRP Rich List API",
        "version": "2.0.0",
        "total_accounts": stats_cache.get("total_accounts", 0),
        "total_xrp": stats_cache.get("total_xrp", 0),
        "last_update": stats_cache.get("last_update")
    }

@app.get("/top")
async def top(n: int = 100):
    """Top N des comptes les plus riches"""
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT account, balance_xrp FROM accounts ORDER BY balance_xrp DESC LIMIT $1", 
        min(n, 10000)  # Limiter à 10k max pour les performances
    )
    return [
        {
            "rank": i+1, 
            "account": r["account"], 
            "balance_xrp": float(r["balance_xrp"])
        } 
        for i, r in enumerate(rows)
    ]

@app.get("/stats/balance-distribution")
async def balance_distribution():
    """Distribution des soldes par tranches (avec cache)"""
    try:
        result = await get_cached_stats("balance_distribution")
        if result is None:
            print("⚠️ Cache balance_distribution est None, recalcul forcé...")
            await update_stats_cache()
            result = stats_cache.get("balance_distribution", [])

        if not result:  # Si toujours vide, retourner un tableau vide avec structure
            print("📊 Aucune donnée de distribution disponible, retour d'un tableau vide")
            return []

        print(f"✅ Retour de {len(result)} tranches de distribution")
        return result

    except Exception as e:
        print(f"❌ Erreur dans balance_distribution: {e}")
        return []

@app.get("/stats/percentages")  
async def balance_percentages():
    """Statistiques de percentiles (avec cache)"""
    try:
        result = await get_cached_stats("percentages")
        if result is None:
            print("⚠️ Cache percentages est None, recalcul forcé...")
            await update_stats_cache()
            result = stats_cache.get("percentages", [])

        if not result:  # Si toujours vide, retourner un tableau vide avec structure
            print("📈 Aucune donnée de pourcentage disponible, retour d'un tableau vide")
            return []

        print(f"✅ Retour de {len(result)} données de pourcentage")
        return result

    except Exception as e:
        print(f"❌ Erreur dans balance_percentages: {e}")
        return []

@app.get("/stats/general")
async def general_stats():
    """Statistiques générales"""
    return {
        "total_accounts": stats_cache.get("total_accounts", 0),
        "total_xrp": stats_cache.get("total_xrp", 0),
        "last_update": stats_cache.get("last_update"),
        "cache_age_minutes": (datetime.now() - stats_cache["last_update"]).total_seconds() / 60 if stats_cache.get("last_update") else None
    }

@app.post("/stats/refresh")
async def refresh_stats(background_tasks: BackgroundTasks):
    """Forcer la mise à jour du cache des statistiques"""
    background_tasks.add_task(update_stats_cache)
    return {"message": "Mise à jour des statistiques en cours..."}

@app.get("/search/{account}")
async def search_account(account: str):
    """Rechercher un compte spécifique"""
    pool = await get_pool()

    # Recherche exacte
    row = await pool.fetchrow(
        "SELECT account, balance_xrp FROM accounts WHERE account = $1", 
        account
    )

    if not row:
        return {"error": "Compte non trouvé"}

    # Calculer le rang
    rank_row = await pool.fetchrow(
        "SELECT COUNT(*) + 1 as rank FROM accounts WHERE balance_xrp > $1",
        row["balance_xrp"]
    )

    return {
        "account": row["account"],
        "balance_xrp": float(row["balance_xrp"]),
        "rank": int(rank_row["rank"])
    }
