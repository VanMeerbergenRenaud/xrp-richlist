import psycopg2
import random
import os
def create_test_data():
    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/xrprich")
        with conn:
            with conn.cursor() as cur:
                print("🗑️ Suppression des anciennes données...")
                cur.execute("DELETE FROM accounts")
                print("📊 Insertion des données de test...")
                test_data = [
                    ('rTop001' + 'x' * 30, 3200000000),
                    ('rTop002' + 'x' * 30, 2800000000),
                    ('rTop003' + 'x' * 30, 1950000000),
                    ('rTop004' + 'x' * 30, 1600000000),
                    ('rTop005' + 'x' * 30, 1200000000),
                ]
                # Ajouter plus de données
                for i in range(22):
                    balance = 500000000 + random.uniform(0, 500000000)
                    test_data.append((f'r500M{i:03d}' + 'x' * 27, balance))
                for i in range(55):
                    balance = 100000000 + random.uniform(0, 400000000)
                    test_data.append((f'r100M{i:03d}' + 'x' * 27, balance))
                for i in range(500):  # Plus de comptes pour tester
                    balance = random.uniform(1000, 100000000)
                    test_data.append((f'rTest{i:04d}' + 'x' * 26, balance))
                cur.executemany("INSERT INTO accounts (account, balance_xrp) VALUES (%s, %s)", test_data)
                conn.commit()
                cur.execute("SELECT COUNT(*) FROM accounts")
                count = cur.fetchone()[0]
                print(f"✅ {count} comptes créés")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False
if __name__ == "__main__":
    create_test_data()
