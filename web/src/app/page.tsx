"use client";

import React, {useState, useEffect} from "react";
import ProgressBar from "../components/ProgressBar";

interface BalanceRangeData {
    accounts: number;
    range: string;
    sum: string;
}

interface PercentageData {
    percentage: string;
    accounts: number;
    balance: string;
}

interface SearchResultData {
    account: string;
    balance_xrp: number;
    rank?: number;
    total_accounts?: number;
    rank_percent?: number;
    account_type?: string;
    exchange_name?: string;
    trustlines?: number;
    tokens?: Array<{
        currency: string;
        issuer: string;
        balance: string;
    }>;
    account_flags?: string[];
    last_transaction?: string;
    transactions?: Array<{
        hash: string;
        type: string;
        amount_xrp?: number;
        destination?: string;
        result?: string;
        date?: string;
    }>;
}

export default function Home() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [balanceRangeData, setBalanceRangeData] = useState<BalanceRangeData[]>([]);
    const [percentageData, setPercentageData] = useState<PercentageData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    // Helper: base URL via proxy Next.js (évite CORS / contenu mixte) vers XRPSCAN
    const getApiUrl = (path: string) => {
        const base = '/api/backend'; // mappé vers https://api.xrpscan.com/api/v1
        if (!path) return `${base}/`;
        if (path.startsWith('/')) return `${base}${path}`;
        return `${base}/${path}`;
    };

    // Helpers de validation/sanitation de la distribution par ranges
    const parseRangeBounds = (range: string): { min: number; max: number } => {
        const [minStr, maxStr] = (range || '').replace(/,/g, '').split(' - ');
        const min = Number(minStr);
        const max = (maxStr === 'Infinity') ? Infinity : Number(maxStr);
        return {
            min: Number.isFinite(min) ? min : 0,
            max: (maxStr === 'Infinity') ? Infinity : (Number.isFinite(max) ? max : Infinity),
        };
    };

    const isDistributionValid = (arr: any[]): boolean => {
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const totalAcc = arr.reduce((s: number, d: any) => s + (Number(d?.accounts) || 0), 0);
        if (totalAcc <= 0) return false;

        // Contrôle: les plus grosses tranches ne doivent pas toutes être à 0 si les tranches basses ont des valeurs
        const parsed = arr
            .map(d => ({ ...d, ...parseRangeBounds(String(d?.range || '')) }))
            .sort((a: any, b: any) => (b.min - a.min));

        const top = parsed.slice(0, 4);
        const topAllZero = top.every(d => ((Number(d?.accounts) || 0) === 0) && ((parseFloat(d?.sum || '0') || 0) === 0));
        const lowerHasData = parsed.slice(4).some(d => ((Number(d?.accounts) || 0) > 0) || ((parseFloat(d?.sum || '0') || 0) > 0));

        if (topAllZero && lowerHasData) return false;
        return true;
    };

    const sanitizeAndValidateDistribution = (arr: any[]): BalanceRangeData[] => {
        try {
            if (!isDistributionValid(arr)) {
                console.warn('⚠️ Distribution invalide/incomplète, bascule sur les données de fallback');
                return getFallbackDistributionData();
            }
            // Normalise types
            return arr.map((d: any) => ({
                accounts: Number(d?.accounts) || 0,
                range: String(d?.range || ''),
                sum: (typeof d?.sum === 'number')
                    ? d.sum.toFixed(6)
                    : String(d?.sum || '0'),
            }));
        } catch (e) {
            console.warn('⚠️ Erreur sanitation distribution, utilisation du fallback');
            return getFallbackDistributionData();
        }
    };

    // Fonction pour récupérer les données de distribution depuis l'API backend
    const fetchBalanceDistribution = async () => {
        try {
            console.log('🔄 Récupération des données de distribution depuis l\'API backend...');

            const response = await fetch(getApiUrl('/stats/balance-distribution'), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            let data: any = null;
            if (response.ok) {
                data = await response.json();
                console.log('📊 Données reçues de l\'API:', data);
            } else {
                console.warn(`⚠️ API distribution indisponible (${response.status} - ${response.statusText}), utilisation du fallback`);
            }

            if (Array.isArray(data) && data.length > 0) {
                const validated = sanitizeAndValidateDistribution(data);
                setBalanceRangeData(validated);
                console.log('✅ Données de distribution chargées:', validated.length, 'éléments');
            } else {
                const fallbackData = getFallbackDistributionData();
                setBalanceRangeData(fallbackData);
                console.log('🔄 Utilisation des données de fallback (distribution)');
            }
        } catch (err: any) {
            console.error('❌ Erreur lors de la récupération depuis l\'API:', err);

            // Fallback: utiliser des données statiques réalistes basées sur les vraies statistiques XRP
            const fallbackData = getFallbackDistributionData();
            setBalanceRangeData(fallbackData);
            console.log('🔄 Utilisation des données de fallback');
        }
    };

    // Fonction pour récupérer les données de pourcentage depuis l'API backend
    const fetchPercentages = async () => {
        try {
            console.log('🔄 Récupération des données de pourcentage depuis l\'API backend...');

            const response = await fetch(getApiUrl('/stats/percentages'), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            let data: any = null;
            if (response.ok) {
                data = await response.json();
                console.log('📊 Données de pourcentage reçues de l\'API:', data);
            } else {
                console.warn(`⚠️ API pourcentages indisponible (${response.status} - ${response.statusText}), utilisation du fallback`);
            }

            if (Array.isArray(data) && data.length > 0) {
                setPercentageData(data);
                console.log('✅ Données de pourcentage chargées:', data.length, 'éléments');
            } else {
                const percentageData = getFallbackPercentageData();
                setPercentageData(percentageData);
                console.log('🔄 Utilisation des données de fallback (pourcentages)');
            }

        } catch (err: any) {
            console.error('❌ Erreur lors de la récupération des pourcentages:', err);
            const percentageData = getFallbackPercentageData();
            setPercentageData(percentageData);
        }
    };


    // Données de fallback basées sur les vraies statistiques XRP
    const getFallbackDistributionData = (): BalanceRangeData[] => {
        return [
            {accounts: 5, range: "1,000,000,000 - Infinity", sum: "7332077895.000000"},
            {accounts: 22, range: "500,000,000 - 1,000,000,000", sum: "12217573182.053612"},
            {accounts: 55, range: "100,000,000 - 500,000,000", sum: "11063318327.565231"},
            {accounts: 159, range: "20,000,000 - 100,000,000", sum: "6315556824.359995"},
            {accounts: 277, range: "10,000,000 - 20,000,000", sum: "3763019317.162423"},
            {accounts: 280, range: "5,000,000 - 10,000,000", sum: "2014431448.392299"},
            {accounts: 1884, range: "1,000,000 - 5,000,000", sum: "4750410258.638114"},
            {accounts: 2251, range: "500,000 - 1,000,000", sum: "1524606874.760418"},
            {accounts: 28385, range: "100,000 - 500,000", sum: "5069935603.548301"},
            {accounts: 11131, range: "75,000 - 100,000", sum: "956367587.004178"},
            {accounts: 27689, range: "50,000 - 75,000", sum: "1625522602.935001"},
            {accounts: 67184, range: "25,000 - 50,000", sum: "2315414817.451868"},
            {accounts: 172850, range: "10,000 - 25,000", sum: "2601830599.624250"},
            {accounts: 166849, range: "5,000 - 10,000", sum: "1148408758.153285"},
            {accounts: 564436, range: "1,000 - 5,000", sum: "1272716873.353460"},
            {accounts: 242586, range: "500 - 1,000", sum: "172298730.903990"},
            {accounts: 2533064, range: "20 - 500", sum: "210506254.048082"},
            {accounts: 3062704, range: "0 - 20", sum: "23292632.626958"},
        ];
    };

    // Données de pourcentage basées sur les vraies statistiques XRP
    const getFallbackPercentageData = (): PercentageData[] => {
        return [
            {percentage: "0.01 %", accounts: 688, balance: "6,600,110.692128 XRP"},
            {percentage: "0.1 %", accounts: 6882, balance: "351,477.908767 XRP"},
            {percentage: "0.2 %", accounts: 13764, balance: "198,788.300005 XRP"},
            {percentage: "0.5 %", accounts: 34409, balance: "97,022.637257 XRP"},
            {percentage: "1 %", accounts: 68818, balance: "50,037.679003 XRP"},
            {percentage: "2 %", accounts: 137636, balance: "25,011.888165 XRP"},
            {percentage: "3 %", accounts: 206454, balance: "15,725.690004 XRP"},
            {percentage: "4 %", accounts: 275272, balance: "10,728.892158 XRP"},
            {percentage: "5 %", accounts: 344091, balance: "8,415.695574 XRP"},
            {percentage: "10 %", accounts: 688181, balance: "2,405.981143 XRP"},
        ];
    };

    // Vérifier l'état de l'API publique: XRPSCAN puis fallback XRPL RPC
    const checkApiStatus = async (timeoutMs: number = 5000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // 1) Ping XRPSCAN (compte genesis)
            const response = await fetch(
                getApiUrl('/account/rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'),
                {
                    method: 'GET',
                    headers: {'Accept': 'application/json'},
                    signal: controller.signal,
                    cache: 'no-store',
                }
            );
            if (response.ok) {
                setApiStatus('online');
            } else {
                // 2) Fallback RPC: server_info
                const rpcRes = await fetch(getApiUrl('/xrplrpc'), {
                    method: 'POST',
                    headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
                    body: JSON.stringify({method: 'server_info', params: [{}]}),
                });
                setApiStatus(rpcRes.ok ? 'online' : 'offline');
            }
        } catch (error) {
            console.warn('❌ Ping XRPSCAN échoué, fallback RPC…', error);
            try {
                const rpcRes = await fetch(getApiUrl('/xrplrpc'), {
                    method: 'POST',
                    headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
                    body: JSON.stringify({method: 'server_info', params: [{}]}),
                });
                setApiStatus(rpcRes.ok ? 'online' : 'offline');
            } catch {
                setApiStatus('offline');
            }
        } finally {
            clearTimeout(timer);
        }
    };

    useEffect(() => {
        // Vérification immédiate
        checkApiStatus();

        // Polling toutes les 15s pour réessayer automatiquement
        const apiStatusIntervalId = setInterval(() => {
            checkApiStatus();
        }, 15000);

        return () => clearInterval(apiStatusIntervalId);
    }, []);

    // Charger les données quand on passe sur l'onglet statistiques
    useEffect(() => {
        if (activeTab === "stats") {
            const loadStats = async () => {
                console.log('🎯 Chargement des statistiques...');
                setLoading(true);
                setError(null);

                // Reset des données pour éviter les états incohérents
                setBalanceRangeData([]);
                setPercentageData([]);

                try {
                    console.log('📡 Chargement de la distribution par ranges...');
                    await fetchBalanceDistribution();
                    console.log('✅ Distribution par ranges chargée avec succès');
                } catch (err: any) {
                    console.error('💥 Erreur lors du chargement des statistiques:', err);
                    setError(err.message || 'Erreur lors du chargement des statistiques');

                    // S'assurer que les données restent des tableaux vides en cas d'erreur
                    setBalanceRangeData([]);
                    setPercentageData([]);
                } finally {
                    setLoading(false);
                    console.log('🏁 Fin du chargement des statistiques');
                }
            };

            loadStats();
        }
    }, [activeTab]);

    // Calculer les percentiles à partir des ranges:
    // - Percentage: le percentile (top X %)
    // - # Accounts: nombre de comptes correspondant à ce percentile
    // - # Balance equals (or greater than): seuil de balance minimal pour être dans ce top X %
    useEffect(() => {
        if (!balanceRangeData || balanceRangeData.length === 0) {
            setPercentageData([]);
            return;
        }
        const percentiles = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10];

        // Prépare les ranges triés par bornes min décroissantes
        const parsed = balanceRangeData
            .map((d) => {
                const [minStr, maxStr] = String(d.range || '').replace(/,/g, '').split(' - ');
                const min = Number(minStr);
                const max = maxStr === 'Infinity' ? Infinity : Number(maxStr);
                return {
                    accounts: Number(d.accounts) || 0,
                    min: Number.isFinite(min) ? min : 0,
                    max: maxStr === 'Infinity' ? Infinity : (Number.isFinite(max) ? max : Infinity),
                };
            })
            .sort((a: { min: number }, b: { min: number }) => b.min - a.min);

        const total = parsed.reduce((s: number, r: { accounts: number }) => s + (r.accounts || 0), 0);
        if (total <= 0) {
            setPercentageData([]);
            return;
        }

        const derived: PercentageData[] = percentiles.map((p) => {
            const target = Math.max(1, Math.round((p / 100) * total));
            let cumulative = 0;
            let threshold = 0;

            for (const r of parsed) {
                const acc = r.accounts || 0;
                if (acc <= 0) continue;
                if (cumulative + acc < target) {
                    cumulative += acc;
                    continue;
                }
                // Le percentile tombe dans cette plage
                const indexWithin = target - cumulative; // 1-based
                const span = r.max === Infinity ? Infinity : Math.max(0, r.max - r.min);
                if (!Number.isFinite(span) || span === 0 || acc <= 0) {
                    // Pas d'interpolation possible: on prend la borne min de la plage
                    threshold = r.min;
                } else {
                    // Approximation uniforme dans la plage (du max vers le min)
                    const fracTop = indexWithin / acc; // 0..1
                    threshold = r.max - fracTop * span;
                    threshold = Math.max(r.min, Math.min(r.max, threshold));
                }
                break;
            }

            const balanceStr = `${threshold.toLocaleString('fr-FR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} XRP`;
            return {
                percentage: `${p} %`,
                accounts: Math.round((p / 100) * total),
                balance: balanceStr,
            };
        });

        setPercentageData(derived);
    }, [balanceRangeData]);

    const tabs = [
        {id: "dashboard", name: "Tableau de bord"},
        {id: "stats", name: "Statistiques"},
        {id: "info", name: "Infos"},
    ];

    const formatNumber = (num: string) => {
        return parseFloat(num).toLocaleString('fr-FR', {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6
        });
    };

    const formatInteger = (num: number) => {
        return num.toLocaleString('fr-FR');
    };

    // Estimation du rang à partir de la distribution fallback (utilisée par la recherche)
    const estimateRankFromFallback = (balance: number) => {
        const dist = getFallbackDistributionData();
        const parsed = dist.map(d => {
            const [minStr, maxStr] = d.range.replace(/,/g, '').split(' - ');
            const min = parseFloat(minStr);
            const max = maxStr === 'Infinity' ? Infinity : parseFloat(maxStr);
            return { ...d, min, max };
        });
        const total = parsed.reduce((sum: number, d: any) => sum + (d.accounts || 0), 0);
        parsed.sort((a: any, b: any) => b.min - a.min);
        let higher = 0;
        for (const r of parsed) {
            if (balance < r.min) { higher += r.accounts || 0; continue; }
            if (balance >= r.max) { continue; }
            const span = (r.max === Infinity ? Math.max(r.min, 1) : (r.max - r.min)) || 1;
            const position = Math.max(0, Math.min(1, (balance - r.min) / span));
            const estimatedAboveInRange = Math.round((1 - position) * (r.accounts || 0));
            higher += estimatedAboveInRange;
            break;
        }
        return { rank: higher + 1, total_accounts: total };
    };


    // Composant de recherche (placé en haut de la page)
    const SearchPanel = () => {
        const [searchAccount, setSearchAccount] = useState('');
        const [searchResult, setSearchResult] = useState<SearchResultData | null>(null);
        const [searchLoading, setSearchLoading] = useState(false);
        const [searchError, setSearchError] = useState<string | null>(null);

        // Mode de recherche et pagination des transactions
        const [searchMode, setSearchMode] = useState<'address' | 'amount'>('address');
        type Tx = { hash: string; type: string; amount_xrp?: number; destination?: string; result?: string; date?: string };
        const [txPages, setTxPages] = useState<Array<{ items: Tx[]; nextMarker: string | null }>>([]);
        const [txPageIndex, setTxPageIndex] = useState(0);
        const [txLoading, setTxLoading] = useState(false);

        const isXrpAddress = (val: string) => /^r[a-zA-Z0-9]{24,34}$/.test(val);
        const parseAmountInput = (val: string): number | null => {
            const cleaned = val.replace(/[, ]/g, '');
            if (!cleaned) return null;
            const n = Number(cleaned);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };

        // Charge une page de 20 tx (XRPSCAN puis fallback RPC)
        const loadTxPage = async (address: string, mode: 'init' | 'next' = 'init') => {
            if (!address) return;
            const current = mode === 'next' ? txPages[txPageIndex] : undefined;
            const marker = mode === 'next' ? (current?.nextMarker ?? null) : null;
            if (mode === 'next' && !marker) return; // pas de page suivante
            setTxLoading(true);
            try {
                let items: Tx[] = [];
                let nextMarker: string | null = null;

                // Tentative XRPSCAN
                try {
                    const url = getApiUrl(`/account/${encodeURIComponent(address)}/transactions?limit=10${marker ? `&marker=${encodeURIComponent(marker)}` : ''}`);
                    const res = await fetch(url, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' },
                        cache: 'no-store',
                    });
                    if (!res.ok) throw new Error(`XRPSCAN tx status ${res.status}`);
                    const json = await res.json();
                    if (Array.isArray(json)) {
                        items = json;
                        nextMarker = null;
                    } else {
                        const arr = Array.isArray(json?.transactions) ? json.transactions : [];
                        items = arr;
                        nextMarker = json?.marker || json?.next_marker || null;
                    }
                } catch {
                    // Fallback RPC account_tx
                    const rpcBody: any = {
                        method: 'account_tx',
                        params: [{
                            account: address,
                            limit: 10,
                            ledger_index_min: -1,
                            ledger_index_max: -1,
                            ...(marker ? { marker } : {})
                        }],
                    };
                    const rpcTxRes = await fetch(getApiUrl('/xrplrpc'), {
                        method: 'POST',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify(rpcBody),
                        cache: 'no-store',
                    });
                    if (rpcTxRes.ok) {
                        const rpcTxJson = await rpcTxRes.json();
                        const rippleEpoch = 946684800;
                        const list = rpcTxJson?.result?.transactions || [];
                        nextMarker = rpcTxJson?.result?.marker || null;
                        items = list.map((entry: any) => {
                            const tx = entry?.tx || {};
                            const meta = entry?.meta || {};
                            const amt = tx.Amount;
                            let amount_xrp: number | undefined;
                            if (typeof amt === 'string' && /^\d+$/.test(amt)) amount_xrp = parseFloat(amt) / 1_000_000;
                            else if (amt && typeof amt === 'object' && amt.value) amount_xrp = parseFloat(amt.value);
                            const dateIso = tx.date ? new Date((tx.date + rippleEpoch) * 1000).toISOString() : undefined;
                            return {
                                hash: tx.hash,
                                type: tx.TransactionType,
                                amount_xrp,
                                destination: tx.Destination,
                                result: meta?.TransactionResult,
                                date: dateIso,
                            };
                        });
                    } else {
                        items = [];
                        nextMarker = null;
                    }
                }

                if (mode === 'init') {
                    setTxPages([{ items, nextMarker }]);
                    setTxPageIndex(0);
                } else {
                    setTxPages((prev: Array<{ items: Tx[]; nextMarker: string | null }>) => [...prev, { items, nextMarker }]);
                    setTxPageIndex((prev: number) => prev + 1);
                }
            } finally {
                setTxLoading(false);
            }
        };

        const handleSearchAccount = async () => {
            const raw = searchAccount.trim();
            if (!raw) {
                setSearchError('Veuillez saisir une adresse XRP ou un montant en XRP');
                return;
            }

            setSearchLoading(true);
            setSearchError(null);
            setSearchResult(null);
            setTxPages([]);
            setTxPageIndex(0);

            // Détecter adresse vs montant
            const isAddress = isXrpAddress(raw);
            const amount = !isAddress ? parseAmountInput(raw) : null;

            try {
                if (!isAddress && amount === null) {
                    setSearchError('Entrez une adresse XRP valide ou un montant numérique (ex: 38000)');
                    return;
                }

                if (!isAddress && amount !== null) {
                    // Mode "montant": calcul de rang uniquement
                    setSearchMode('amount');
                    const est = estimateRankFromFallback(amount);
                    const result: SearchResultData = {
                        account: '',
                        balance_xrp: amount,
                        rank: est.rank,
                        total_accounts: est.total_accounts,
                        rank_percent: (est.rank / est.total_accounts) * 100,
                        account_type: '—',
                        exchange_name: undefined,
                        trustlines: 0,
                        tokens: [],
                        account_flags: [],
                        last_transaction: undefined,
                        transactions: [],
                    };
                    setSearchResult(result);
                    return;
                }

                // Mode "adresse": récupération des infos + pagination des tx
                setSearchMode('address');
                const cleanAddress = raw;

                // XRPSCAN d'abord
                let data: any = null;
                let lastError: any = null;
                try {
                    const response = await fetch(getApiUrl(`/account/${encodeURIComponent(cleanAddress)}`), {
                        method: 'GET',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        cache: 'no-store',
                    });
                    if (response.ok) data = await response.json();
                    else lastError = new Error(`Erreur API: ${response.status} - ${response.statusText}`);
                } catch (e: any) {
                    lastError = e;
                }

                // Fallback JSON-RPC si XRPSCAN échoue
                if (!data) {
                    const rpcRes = await fetch(getApiUrl('/xrplrpc'), {
                        method: 'POST',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ method: 'account_info', params: [{ account: cleanAddress, ledger_index: 'validated', strict: true }] }),
                        cache: 'no-store',
                    });
                    if (rpcRes.ok) {
                        const rpcJson = await rpcRes.json();
                        const acc = rpcJson?.result?.account_data;
                        if (acc && acc.Balance) {
                            data = { account: cleanAddress, balance_xrp: parseFloat(acc.Balance) / 1_000_000, account_flags: [] };
                        }
                    }
                }

                if (!data) throw lastError || new Error('Impossible de récupérer les données du compte');

                // Normalisation (sans tx, gérés par pagination)
                let normalizedData: SearchResultData = {
                    account: data.account || cleanAddress,
                    balance_xrp: data.balance_xrp || data.balance || 0,
                    rank: data.rank,
                    total_accounts: data.total_accounts || data.total,
                    rank_percent: data.rank_percent,
                    account_type: data.account_type || data.type || 'Unknown',
                    exchange_name: data.exchange_name || data.exchange || undefined,
                    trustlines: data.trustlines || data.trustlines_count || 0,
                    tokens: data.tokens || data.trustlines || [],
                    account_flags: data.account_flags || data.flags || [],
                    last_transaction: data.last_transaction || data.last_tx,
                    transactions: [],
                };

                if (typeof normalizedData.rank !== 'number' || typeof normalizedData.total_accounts !== 'number') {
                    const est = estimateRankFromFallback(normalizedData.balance_xrp || 0);
                    normalizedData.rank = est.rank;
                    normalizedData.total_accounts = est.total_accounts;
                    normalizedData.rank_percent = (est.rank / est.total_accounts) * 100;
                }

                setSearchResult(normalizedData);

                // Charger la première page (10) des transactions
                await loadTxPage(cleanAddress, 'init');
            } catch (error: any) {
                console.error('💥 Erreur lors de la recherche:', error);
                setSearchError(error.message || 'Erreur lors de la recherche du compte');
            } finally {
                setSearchLoading(false);
            }
        };

        const displayedTxs: Tx[] = txPages[txPageIndex]?.items || [];

        // Dérivés pour le classement
        const rankVal = searchResult?.rank ?? null;
        const totalVal = searchResult?.total_accounts ?? null;
        const aboveVal = (typeof rankVal === 'number') ? Math.max(0, rankVal - 1) : null;
        const belowVal = (typeof rankVal === 'number' && typeof totalVal === 'number') ? Math.max(0, totalVal - rankVal) : null;
        const topPercent = (typeof rankVal === 'number' && typeof totalVal === 'number' && totalVal > 0)
            ? (rankVal / totalVal) * 100 : null;
        const decile = (topPercent != null) ? Math.min(10, Math.max(1, Math.ceil(topPercent / 10))) : null;
        const quartile = (topPercent != null) ? Math.min(4, Math.max(1, Math.ceil(topPercent / 25))) : null;

        // Helper format FR
        const formatFR = (n: number | undefined | null) =>
            typeof n === 'number' ? n.toLocaleString('fr-FR') : '—';

        return (
            <div className="space-y-6 mb-8">
                <div className="rounded-2xl p-6 border border-gray-700 bg-gray-900">
                    <h2 className="text-2xl font-bold mb-4">🔍 Recherche de compte et classement</h2>
                    <div className="space-y-3 mb-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-300">🔎 </span>
                                <input
                                    type="text"
                                    value={searchAccount}
                                    onChange={(e) => setSearchAccount(e.target.value)}
                                    placeholder="Entrez une adresse XRP ou un montant de jeton"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAccount()}
                                />
                            </div>
                            <button
                                onClick={handleSearchAccount}
                                disabled={searchLoading || !searchAccount.trim()}
                                className="px-8 py-2 rounded-xl text-white font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {searchLoading ? '🔄 Recherche...' : '🔍 Rechercher'}
                            </button>
                        </div>
                        <div className="text-sm text-gray-300">
                            💡 <strong>Astuce:</strong> Saisissez une adresse XRP (ex: r...) ou un montant en XRP (ex: 38 000) pour estimer le rang global.
                        </div>
                    </div>

                    {searchError && (
                        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300">
                            ❌ {searchError}
                        </div>
                    )}

                    {searchResult && (
                        <div className="mb-4 p-6 bg-gray-900 border border-gray-700 rounded-lg">
                            {/* Résumé du classement (FR) avec statistiques enrichies */}
                            {(typeof searchResult.rank === 'number' && typeof searchResult.total_accounts === 'number') && (
                                <div className="mb-6 p-5 rounded-xl border border-gray-700 bg-gray-900">
                                    <div className="text-white text-sm">
                                        <div className="font-mono">
                                            Adresse du portefeuille ou montant : {searchMode === 'address'
                                            ? (searchResult.account || '—')
                                            : `${(searchResult.balance_xrp ?? 0).toLocaleString('fr-FR')}`}
                                        </div>
                                        <div className="mt-2">
                                            Vous êtes classé n°{formatFR(rankVal)} sur {formatFR(totalVal)} portefeuilles XRP.
                                        </div>
                                        <div>
                                            Il y a {formatFR(aboveVal)} portefeuilles avec plus de XRP et {formatFR(belowVal)} avec moins de XRP.
                                        </div>
                                        <div>
                                            Cela vous place dans le top {topPercent != null ? topPercent.toFixed(3) : '—'} % des comptes ! Consultez notre validateur pour voir les statistiques du serveur.
                                        </div>

                                        {/* Barre de progression (percentile) */}
                                        <div className="mt-4">
                                            <ProgressBar value={topPercent ?? 0} height="sm" showLabels />
                                        </div>

                                        {/* Petites cartes d’indicateurs */}
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Rang</div>
                                                <div className="font-mono text-cyan-300 text-lg">#{formatFR(rankVal)}</div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Comptes totaux</div>
                                                <div className="font-mono text-white text-lg">{formatFR(totalVal)}</div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Au-dessus</div>
                                                <div className="font-mono text-white text-lg">{formatFR(aboveVal)}</div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">En dessous</div>
                                                <div className="font-mono text-white text-lg">{formatFR(belowVal)}</div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Percentile</div>
                                                <div className="font-mono text-white text-lg">{topPercent != null ? topPercent.toFixed(3) : '—'} %</div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Décile / Quartile</div>
                                                <div className="font-mono text-white text-lg">
                                                    D{decile ?? '—'} / Q{quartile ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Détails compte uniquement si mode adresse */}
                            {searchMode === 'address' && (
                                <>
                                    <h3 className="text-white font-bold mb-4 text-lg">✅ Informations du compte</h3>
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-3">
                                            <h4 className="text-gray-200 font-semibold border-b border-gray-700 pb-1">📋 Données de base</h4>
                                            <p><span className="text-gray-400 min-w-20 inline-block">Adresse:</span> <span className="font-mono text-white text-sm break-all">{searchResult.account}</span></p>
                                            <p><span className="text-gray-400 min-w-20 inline-block">Balance:</span> <span className="font-mono text-white font-bold text-lg">{searchResult.balance_xrp?.toLocaleString('fr-FR')} XRP</span></p>
                                            {typeof searchResult.rank === 'number' && (
                                                <p>
                                                    <span className="text-gray-400 min-w-20 inline-block">Rang:</span>{" "}
                                                    <span className="font-mono text-white font-bold">
                                                        #{searchResult.rank.toLocaleString('fr-FR')}
                                                    </span>
                                                    {typeof searchResult.total_accounts === 'number' && (
                                                        <span className="text-gray-300">
                                                            {" "}sur {searchResult.total_accounts.toLocaleString('fr-FR')}
                                                            {searchResult.total_accounts > 0 && (
                                                                <span className="text-gray-400"> (top {((searchResult.rank / searchResult.total_accounts) * 100).toFixed(6)}%)</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-gray-200 font-semibold border-b border-gray-700 pb-1">🏢 Type de compte</h4>
                                            <p><span className="text-gray-400 min-w-20 inline-block">Type:</span> <span className="text-white font-medium">{searchResult.account_type}</span></p>
                                            {searchResult.exchange_name && (
                                                <p><span className="text-gray-400 min-w-20 inline-block">Exchange:</span> <span className="text-white font-medium">{searchResult.exchange_name}</span></p>
                                            )}
                                            <p><span className="text-gray-400 min-w-20 inline-block">Trustlines:</span> <span className="text-white font-medium">{searchResult.trustlines}</span></p>
                                        </div>
                                    </div>

                                    {searchResult.tokens && searchResult.tokens.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-gray-200 font-semibold mb-3 border-b border-gray-700 pb-1">🪙 Tokens possédés ({searchResult.tokens.length})</h4>
                                            <div className="bg-gray-800 rounded p-4 max-h-48 overflow-y-auto">
                                                {searchResult.tokens.map((token, index) => (
                                                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                                                        <div>
                                                            <span className="text-white font-mono font-bold">{token.currency}</span>
                                                            <span className="text-gray-400 text-xs ml-2">({token.issuer?.substring(0, 8)}...)</span>
                                                        </div>
                                                        <span className="text-white font-mono text-sm">{parseFloat(token.balance).toLocaleString('fr-FR')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {searchResult.account_flags && searchResult.account_flags.length > 0 && (
                                            <div>
                                                <h4 className="text-gray-200 font-semibold mb-2 border-b border-gray-700 pb-1">🏴 Flags du compte</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {searchResult.account_flags.map((flag, index) => (
                                                        <span key={index} className="px-2 py-1 bg-blue-800 text-white rounded text-xs font-mono">{flag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-gray-200 font-semibold mb-2 border-b border-gray-700 pb-1">⏰ Dernières transactions (10)</h4>
                                            <div className="bg-gray-800 rounded p-4 max-h-96 overflow-y-auto">
                                                {txLoading && displayedTxs.length === 0 && (
                                                    <div className="text-gray-400 text-sm">Chargement des transactions…</div>
                                                )}
                                                {displayedTxs.length > 0 ? (
                                                    displayedTxs.map((tx, idx) => (
                                                        <div key={tx.hash || idx} className="py-2 border-b border-gray-700 last:border-b-0 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-white font-mono">{tx.type || 'Tx'}</span>
                                                                {typeof tx.amount_xrp === 'number' && (
                                                                    <span className="text-white font-mono">{tx.amount_xrp.toLocaleString('fr-FR')} XRP</span>
                                                                )}
                                                            </div>
                                                            <div className="text-gray-400 flex flex-wrap gap-3">
                                                                <span>{tx.date ? new Date(tx.date).toLocaleString('fr-FR') : '—'}</span>
                                                                {tx.destination && <span>→ <span className="font-mono">{tx.destination.slice(0, 10)}...</span></span>}
                                                                {tx.result && <span className={tx.result === 'tesSUCCESS' ? 'text-green-400' : 'text-red-400'}>{tx.result}</span>}
                                                                {tx.hash && <span className="font-mono text-xs">#{tx.hash.slice(0, 8)}…</span>}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (!txLoading && (
                                                    <div className="text-gray-400 text-sm">Aucune transaction disponible</div>
                                                ))}
                                            </div>

                                            {/* Pagination */}
                                            <div className="mt-3 flex items-center justify-between">
                                                <button
                                                    onClick={() => setTxPageIndex(prev => Math.max(0, prev - 1))}
                                                    disabled={txPageIndex === 0}
                                                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
                                                >
                                                    ← Précédent
                                                </button>
                                                <div className="text-xs text-gray-400">
                                                    Page {txPageIndex + 1}{txPages[txPageIndex]?.nextMarker ? '' : ''}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (searchResult?.account) loadTxPage(searchResult.account, 'next');
                                                    }}
                                                    disabled={!txPages[txPageIndex]?.nextMarker || txLoading}
                                                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
                                                >
                                                    Suivant →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Composant d'informations avec statistiques générales
    const InfoComponent = () => {
        const [generalStats, setGeneralStats] = useState<any>(null);
        const [loadingStats, setLoadingStats] = useState(false);

        const fetchGeneralStats = async () => {
            setLoadingStats(true);
            try {
                // Calcule des stats basiques à partir de la distribution fallback
                const dist = getFallbackDistributionData();
                const total_accounts = dist.reduce((acc, d) => acc + (d.accounts || 0), 0);
                const total_xrp = dist.reduce((acc, d) => acc + (parseFloat(d.sum || '0') || 0), 0);
                setGeneralStats({
                    total_accounts,
                    total_xrp,
                    last_update: new Date().toISOString(),
                    cache_age_minutes: 0,
                });
            } catch (error) {
                console.error('Erreur lors du calcul des statistiques générales:', error);
                setGeneralStats(null);
            } finally {
                setLoadingStats(false);
            }
        };

        useEffect(() => {
            fetchGeneralStats();
        }, []);

        return (
            <div className="space-y-6">
                <div className="bg-gray-900 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-6">ℹ️ Informations sur l'application</h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-4">📊 Statistiques générales</h3>
                            {loadingStats ? (
                                <div className="text-gray-400">Chargement...</div>
                            ) : generalStats ? (
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-gray-400">Nombre total de comptes:</span> <span
                                        className="font-mono text-white">{generalStats.total_accounts?.toLocaleString('fr-FR')}</span>
                                    </p>
                                    <p><span className="text-gray-400">Total XRP indexé:</span> <span
                                        className="font-mono text-white">{generalStats.total_xrp?.toLocaleString('fr-FR')} XRP</span>
                                    </p>
                                    <p><span className="text-gray-400">Dernière mise à jour:</span> <span
                                        className="font-mono text-white">{generalStats.last_update ? new Date(generalStats.last_update).toLocaleString('fr-FR') : 'N/A'}</span>
                                    </p>
                                    <p><span className="text-gray-400">Âge du cache:</span> <span
                                        className="font-mono text-gray-300">{generalStats.cache_age_minutes ? Math.round(generalStats.cache_age_minutes) + ' minutes' : 'N/A'}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="text-gray-400">Statistiques non disponibles</div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-white mb-4">🏗️ Architecture</h3>
                            <div className="space-y-2 text-sm text-gray-300">
                                <p>• <strong>Frontend:</strong> Next.js 15 + React 19 + TypeScript</p>
                                <p>• <strong>Backend:</strong> FastAPI + Python</p>
                                <p>• <strong>Base de données:</strong> PostgreSQL 16</p>
                                <p>• <strong>Indexeur:</strong> Python + XRPL</p>
                                <p>• <strong>Containerisation:</strong> Docker + Docker Compose</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">🚀 Fonctionnalités</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                                <h4 className="font-semibold text-white mb-2">Recherche & Classement</h4>
                                <ul className="space-y-1">
                                    <li>• Recherche de comptes XRP</li>
                                    <li>• Top des comptes les plus riches</li>
                                    <li>• Calcul du rang en temps réel</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-white mb-2">Statistiques</h4>
                                <ul className="space-y-1">
                                    <li>• Distribution des soldes par tranches</li>
                                    <li>• Analyses de percentiles</li>
                                    <li>• Données en temps réel</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">📝 À propos</h3>
                        <p className="text-gray-300 text-sm">
                            Cette application analyse la distribution de la richesse sur la blockchain XRP en temps
                            réel.
                            Elle indexe les comptes et leurs soldes pour fournir des statistiques détaillées sur la
                            répartition des tokens XRP dans l'écosystème.
                        </p>
                    </div>

                    <div className="mt-4 flex gap-4">
                        <button
                            onClick={fetchGeneralStats}
                            disabled={loadingStats}
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500 disabled:opacity-50 text-sm"
                        >
                            {loadingStats ? '🔄 Actualisation...' : '↻ Actualiser les stats'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navigation */}
            <nav className="bg-gray-900 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-sm font-medium border-r border-gray-700 hover:bg-gray-800 transition-colors ${
                                    activeTab === tab.id ? "bg-gray-800 text-white" : "text-gray-300"
                                }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    <div className="px-6 py-4 flex items-center gap-2 text-sm">
                        <span className="text-gray-400">API:</span>
                        <span className={`flex items-center gap-1 ${
                            apiStatus === 'online' ? 'text-cyan-400' :
                                apiStatus === 'offline' ? 'text-red-400' : 'text-white'
                        }`}>
              <span className={`w-2 h-2 rounded-full ${
                  apiStatus === 'online' ? 'bg-cyan-400' :
                      apiStatus === 'offline' ? 'bg-red-400' : 'bg-indigo-400'
              }`}></span>
                            {apiStatus === 'online' ? 'Connecté' :
                                apiStatus === 'offline' ? 'Déconnecté' : 'Vérification...'}
            </span>
                    </div>
                </div>
            </nav>

            {/* Contenu principal */}
            <main className="p-6">
                {activeTab === "dashboard" && (
                    <SearchPanel />
                )}

                {activeTab === "stats" && (
                    <div className="space-y-8" aria-busy={loading}>
                        {error && (
                            <div className="bg-red-900 rounded-lg p-6 text-center">
                                <div className="text-red-300">Erreur: {error}</div>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
                                >
                                    Réessayer
                                </button>
                            </div>
                        )}

                        <>
                            {/* Résumé rapide des statistiques (avec placeholders en chargement) */}
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    <div className="text-gray-400 text-xs">Comptes totaux</div>
                                    <div className="text-2xl font-mono text-white">
                                        {loading ? (
                                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-24"></div>
                                        ) : (
                                            (balanceRangeData.reduce((acc, d) => acc + (d.accounts || 0), 0)).toLocaleString('fr-FR')
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    <div className="text-gray-400 text-xs">XRP total (somme des plages)</div>
                                    <div className="text-2xl font-mono text-white">
                                        {loading ? (
                                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-40"></div>
                                        ) : (
                                            (balanceRangeData.reduce((acc, d) => acc + (parseFloat(d.sum || '0') || 0), 0)).toLocaleString('fr-FR') + ' XRP'
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    <div className="text-gray-400 text-xs">Solde moyen par compte</div>
                                    <div className="text-2xl font-mono text-white">
                                        {loading ? (
                                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-28"></div>
                                        ) : (
                                            (() => {
                                                const totalAcc = balanceRangeData.reduce((acc, d) => acc + (d.accounts || 0), 0);
                                                const totalXrp = balanceRangeData.reduce((acc, d) => acc + (parseFloat(d.sum || '0') || 0), 0);
                                                return totalAcc > 0 ? (totalXrp / totalAcc).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) : '—';
                                            })() + ' XRP'
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grille 2 colonnes: tableaux côte à côte */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Tableau 1: Nombre de comptes et somme des soldes */}
                                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                                    <div className="px-4 py-2 border-b border-gray-700">
                                        <h2 className="text-white font-bold">
                                            Nombre de comptes et somme de la plage de soldes
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold border-r border-gray-700">
                                                    # Comptes
                                                </th>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold border-r border-gray-700">
                                                    Solde de ... À
                                                </th>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold">
                                                    Somme (XRP)
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {balanceRangeData && Array.isArray(balanceRangeData) && balanceRangeData.length > 0 ? (
                                                balanceRangeData.map((row, index) => (
                                                    <tr key={index}
                                                        className="border-b border-gray-800 hover:bg-gray-800/70">
                                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                                            {formatInteger(row?.accounts || 0)}
                                                        </td>
                                                        <td className="px-4 py-2 border-r border-gray-800 font-mono">
                                                            {row?.range || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-mono">
                                                            {formatNumber(row?.sum || '0')}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <>
                                                    {loading ? (
                                                        Array.from({ length: 6 }).map((_, i) => (
                                                            <tr key={`skeleton-ranges-${i}`} className="border-b border-gray-800">
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-20 ml-auto"></div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-40"></div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-28 ml-auto"></div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                                Aucune donnée disponible
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Tableau 2: Percentiles */}
                                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                                    <div className="px-4 py-2 border-b border-gray-700">
                                        <h2 className="text-white font-bold">
                                            Percentiles (calculés à partir des ranges)
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold border-r border-gray-700">
                                                    Percentage
                                                </th>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold border-r border-gray-700">
                                                    # Accounts
                                                </th>
                                                <th className="px-4 py-2 text-left text-gray-300 font-semibold">
                                                    # Balance equals (or greater than)
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {percentageData && Array.isArray(percentageData) && percentageData.length > 0 ? (
                                                percentageData.map((row, index) => (
                                                    <tr key={index}
                                                        className="border-b border-gray-800 hover:bg-gray-800/70">
                                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                                            {row?.percentage || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                                            {formatInteger(row?.accounts || 0)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-mono">
                                                            {row?.balance || 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <>
                                                    {loading ? (
                                                        Array.from({ length: 6 }).map((_, i) => (
                                                            <tr key={`skeleton-percentiles-${i}`} className="border-b border-gray-800">
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-24 ml-auto"></div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-20 ml-auto"></div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-48 ml-auto"></div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                                Aucune donnée disponible
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    </div>
                )}

                {activeTab === "info" && (
                    <InfoComponent/>
                )}
            </main>
        </div>
    );
}
