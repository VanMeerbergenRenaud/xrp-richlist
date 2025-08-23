#!/usr/bin/env python3
import os, decimal, random, psycopg2, psycopg2.extras

def create_sample_data():
    """Créer des données d'exemple réalistes"""
    print("Création de données d'exemple...")
    rows = []

    # Top comptes avec de gros soldes (similaires aux vrais gros portefeuilles XRP)
    top_balances = [
        3200000000,  # ~3.2B XRP (exchange principal)
        2800000000,  # ~2.8B XRP
        1950000000,  # ~1.95B XRP
        1600000000,  # ~1.6B XRP
        1200000000,  # ~1.2B XRP
        950000000,   # ~950M XRP
        780000000,   # ~780M XRP
        650000000,   # ~650M XRP
        520000000,   # ~520M XRP
        420000000,   # ~420M XRP
        350000000,   # ~350M XRP
        290000000,   # ~290M XRP
        240000000,   # ~240M XRP
        200000000,   # ~200M XRP
        165000000,   # ~165M XRP
    ]

    # Créer les top comptes
    for i, balance in enumerate(top_balances):
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    print(f"Créé {len(top_balances)} comptes top")

    # Comptes très riches (100M - 500M) - environ 50 comptes
    for i in range(50):
        balance = random.uniform(100000000, 500000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes riches (20M - 100M) - environ 200 comptes
    for i in range(200):
        balance = random.uniform(20000000, 100000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes moyens-élevés (10M - 20M) - environ 300 comptes
    for i in range(300):
        balance = random.uniform(10000000, 20000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes moyens (5M - 10M) - environ 400 comptes
    for i in range(400):
        balance = random.uniform(5000000, 10000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes moyens-bas (1M - 5M) - environ 2000 comptes
    for i in range(2000):
        balance = random.uniform(1000000, 5000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    print(f"Créé {len(rows)} comptes moyens et élevés")

    # Comptes petits-moyens (500K - 1M) - environ 2500 comptes
    for i in range(2500):
        balance = random.uniform(500000, 1000000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes petits (100K - 500K) - environ 30000 comptes
    for i in range(30000):
        balance = random.uniform(100000, 500000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    print(f"Créé {len(rows)} comptes au total jusqu'aux petits")

    # Comptes très petits (75K - 100K) - environ 12000 comptes
    for i in range(12000):
        balance = random.uniform(75000, 100000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes minuscules (50K - 75K) - environ 30000 comptes
    for i in range(30000):
        balance = random.uniform(50000, 75000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Et ainsi de suite pour couvrir toutes les tranches...
    # Comptes 25K-50K (environ 70000)
    for i in range(70000):
        balance = random.uniform(25000, 50000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 10K-25K (environ 180000)
    for i in range(180000):
        balance = random.uniform(10000, 25000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 5K-10K (environ 170000)
    for i in range(170000):
        balance = random.uniform(5000, 10000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 1K-5K (environ 570000)
    for i in range(570000):
        balance = random.uniform(1000, 5000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 500-1K (environ 250000)
    for i in range(250000):
        balance = random.uniform(500, 1000)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 20-500 (environ 2600000)
    for i in range(2600000):
        balance = random.uniform(20, 500)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    # Comptes 0-20 (environ 3100000)
    for i in range(3100000):
        balance = random.uniform(0, 20)
        account = f"r{''.join(random.choices('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', k=33))}"
        rows.append((account, decimal.Decimal(str(balance))))

    print(f"Créé {len(rows)} comptes au total")
    return rows

def upsert_accounts_batch(rows, batch_size=10000):
    """Insérer les comptes par batch pour éviter les timeouts"""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    try:
        with conn:
            with conn.cursor() as cur:
                # Vider la table d'abord
                cur.execute("DELETE FROM accounts")
                print("Table accounts vidée")

                # Insérer par batch
                total = len(rows)
                for i in range(0, total, batch_size):
                    batch = rows[i:i+batch_size]
                    psycopg2.extras.execute_batch(cur, """
                    INSERT INTO accounts (account, balance_xrp, updated_at)
                    VALUES (%s, %s, now())
                    """, batch, page_size=batch_size)
                    print(f"Inséré batch {i//batch_size + 1}/{(total//batch_size) + 1} ({len(batch)} comptes)")
                    conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Début du peuplement de la base de données...")
    rows = create_sample_data()
    print(f"Insertion de {len(rows)} comptes en base...")
    upsert_accounts_batch(rows)
    print("Terminé !")
