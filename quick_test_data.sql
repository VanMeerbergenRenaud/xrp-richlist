-- Script de test rapide pour insérer des données réalistes
DELETE FROM accounts;

-- Insertion de données de test dans toutes les tranches nécessaires
INSERT INTO accounts (account, balance_xrp) VALUES 
-- Tranche 1B+ (5 comptes)
('rTOP001' || repeat('x', 30), 3200000000),
('rTOP002' || repeat('x', 30), 2800000000),  
('rTOP003' || repeat('x', 30), 1950000000),
('rTOP004' || repeat('x', 30), 1600000000),
('rTOP005' || repeat('x', 30), 1200000000);

-- Tranche 500M-1B (22 comptes)  
INSERT INTO accounts (account, balance_xrp)
SELECT 'r500M' || lpad(i::text, 3, '0') || repeat('x', 27),
       500000000 + (random() * 500000000)
FROM generate_series(1, 22) i;

-- Tranche 100M-500M (55 comptes)
INSERT INTO accounts (account, balance_xrp)
SELECT 'r100M' || lpad(i::text, 3, '0') || repeat('x', 27),
       100000000 + (random() * 400000000)
FROM generate_series(1, 55) i;

-- Tranche 20M-100M (159 comptes) 
INSERT INTO accounts (account, balance_xrp)
SELECT 'r20M' || lpad(i::text, 4, '0') || repeat('x', 26),
       20000000 + (random() * 80000000)
FROM generate_series(1, 159) i;

-- Tranche 10M-20M (277 comptes)
INSERT INTO accounts (account, balance_xrp)
SELECT 'r10M' || lpad(i::text, 4, '0') || repeat('x', 26),
       10000000 + (random() * 10000000)  
FROM generate_series(1, 277) i;

-- Tranche 5M-10M (280 comptes)
INSERT INTO accounts (account, balance_xrp)
SELECT 'r5M' || lpad(i::text, 4, '0') || repeat('x', 27),
       5000000 + (random() * 5000000)
FROM generate_series(1, 280) i;

-- Tranche 1M-5M (1884 comptes)
INSERT INTO accounts (account, balance_xrp)  
SELECT 'r1M' || lpad(i::text, 5, '0') || repeat('x', 27),
       1000000 + (random() * 4000000)
FROM generate_series(1, 1884) i;

-- Autres tranches importantes
INSERT INTO accounts (account, balance_xrp)
SELECT 'r500K' || lpad(i::text, 5, '0') || repeat('x', 25),
       500000 + (random() * 500000)
FROM generate_series(1, 2251) i;

INSERT INTO accounts (account, balance_xrp)
SELECT 'r100K' || lpad(i::text, 6, '0') || repeat('x', 24),
       100000 + (random() * 400000)
FROM generate_series(1, 28385) i;

INSERT INTO accounts (account, balance_xrp)
SELECT 'rSMALL' || lpad(i::text, 7, '0') || repeat('x', 22),
       CASE 
         WHEN i <= 11131 THEN 75000 + (random() * 25000)    -- 75K-100K
         WHEN i <= 38820 THEN 50000 + (random() * 25000)    -- 50K-75K  
         WHEN i <= 106004 THEN 25000 + (random() * 25000)   -- 25K-50K
         WHEN i <= 278854 THEN 10000 + (random() * 15000)   -- 10K-25K
         WHEN i <= 445703 THEN 5000 + (random() * 5000)     -- 5K-10K
         WHEN i <= 1010139 THEN 1000 + (random() * 4000)    -- 1K-5K
         WHEN i <= 1252725 THEN 500 + (random() * 500)      -- 500-1K
         WHEN i <= 3785789 THEN 20 + (random() * 480)       -- 20-500
         ELSE random() * 20                                   -- 0-20
       END
FROM generate_series(1, 6848493) i;

-- Afficher les statistiques
SELECT 
    'Total comptes' as stat,
    COUNT(*)::text as valeur
FROM accounts
UNION ALL
SELECT 
    'XRP total',
    TO_CHAR(SUM(balance_xrp), 'FM999,999,999,999,999.00')
FROM accounts  
UNION ALL
SELECT
    'Balance max',
    TO_CHAR(MAX(balance_xrp), 'FM999,999,999,999.00')
FROM accounts
UNION ALL  
SELECT
    'Balance min',
    TO_CHAR(MIN(balance_xrp), 'FM999,999,999.99')
FROM accounts;
