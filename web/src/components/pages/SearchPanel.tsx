"use client";

import React, {useMemo, useState} from "react";
import ProgressBar from "@/components/ProgressBar";
import {estimateRankFromFallback} from "@/lib/stats/fallback";
import QrCode from "@/components/common/QrCode";

type Tx = {
    hash: string;
    type: string;
    amount_xrp?: number;
    destination?: string;
    result?: string;
    date?: string;
};

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
    transactions?: Array<Tx>;
}

const getApiUrl = (path: string) => {
    const base = "/api/backend";
    if (!path) return `${base}/`;
    if (path.startsWith("/")) return `${base}${path}`;
    return `${base}/${path}`;
};

export default function SearchPanel() {
    const [searchAccount, setSearchAccount] = useState("");
    const [searchResult, setSearchResult] = useState<SearchResultData | null>(
        null,
    );
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [searchMode, setSearchMode] = useState<"address" | "amount">("address");
    const [txPages, setTxPages] = useState<
        Array<{ items: Tx[]; nextMarker: string | null }>
    >([]);
    const [txPageIndex, setTxPageIndex] = useState(0);
    const [txLoading, setTxLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const isXrpAddress = (val: string) => /^r[a-zA-Z0-9]{24,34}$/.test(val);
    const parseAmountInput = (val: string): number | null => {
        const cleaned = val.replace(/[, ]/g, "");
        if (!cleaned) return null;
        const n = Number(cleaned);
        return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const loadTxPage = async (
        address: string,
        mode: "init" | "next" = "init",
    ) => {
        if (!address) return;
        const current = mode === "next" ? txPages[txPageIndex] : undefined;
        const marker = mode === "next" ? (current?.nextMarker ?? null) : null;
        if (mode === "next" && !marker) return;
        setTxLoading(true);
        try {
            let items: Tx[] = [];
            let nextMarker: string | null = null;

            // XRPSCAN
            try {
                const url = getApiUrl(
                    `/account/${encodeURIComponent(address)}/transactions?limit=10${marker ? `&marker=${encodeURIComponent(marker)}` : ""}`,
                );
                const res = await fetch(url, {
                    method: "GET",
                    headers: {Accept: "application/json"},
                    cache: "no-store",
                });
                if (!res.ok) throw new Error(`XRPSCAN tx status ${res.status}`);
                const json = await res.json();
                if (Array.isArray(json)) {
                    items = json;
                    nextMarker = null;
                } else {
                    items = Array.isArray(json?.transactions)
                        ? json.transactions
                        : [];
                    nextMarker = json?.marker || json?.next_marker || null;
                }
            } catch {
                // Fallback RPC account_tx
                const rpcBody: any = {
                    method: "account_tx",
                    params: [
                        {
                            account: address,
                            limit: 10,
                            ledger_index_min: -1,
                            ledger_index_max: -1,
                            ...(marker ? {marker} : {}),
                        },
                    ],
                };
                const rpcTxRes = await fetch(getApiUrl("/xrplrpc"), {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(rpcBody),
                    cache: "no-store",
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
                        if (typeof amt === "string" && /^\d+$/.test(amt))
                            amount_xrp = parseFloat(amt) / 1_000_000;
                        else if (amt && typeof amt === "object" && amt.value)
                            amount_xrp = parseFloat(amt.value);
                        const dateIso = tx.date
                            ? new Date((tx.date + rippleEpoch) * 1000).toISOString()
                            : undefined;
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

            if (mode === "init") {
                setTxPages([{items, nextMarker}]);
                setTxPageIndex(0);
            } else {
                setTxPages((prev) => [...prev, {items, nextMarker}]);
                setTxPageIndex((prev) => prev + 1);
            }
        } finally {
            setTxLoading(false);
        }
    };

    const handleSearchAccount = async () => {
        const raw = searchAccount.trim();
        if (!raw) {
            setSearchError("Veuillez saisir une adresse XRP ou un montant en XRP");
            return;
        }

        setSearchLoading(true);
        setSearchError(null);
        setSearchResult(null);
        setTxPages([]);
        setTxPageIndex(0);

        const isAddress = isXrpAddress(raw);
        const amount = !isAddress ? parseAmountInput(raw) : null;

        try {
            if (!isAddress && amount === null) {
                setSearchError(
                    "Entrez une adresse XRP valide ou un montant spécifique",
                );
                return;
            }

            if (!isAddress && amount !== null) {
                setSearchMode("amount");
                const est = estimateRankFromFallback(amount);
                setSearchResult({
                    account: "",
                    balance_xrp: amount,
                    rank: est.rank,
                    total_accounts: est.total_accounts,
                    rank_percent: (est.rank / est.total_accounts) * 100,
                    account_type: "—",
                    exchange_name: undefined,
                    trustlines: 0,
                    tokens: [],
                    account_flags: [],
                    last_transaction: undefined,
                    transactions: [],
                });
                return;
            }

            setSearchMode("address");
            const cleanAddress = raw;

            // XRPSCAN
            let data: any = null;
            let lastError: any = null;
            try {
                const response = await fetch(
                    getApiUrl(`/account/${encodeURIComponent(cleanAddress)}`),
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        cache: "no-store",
                    },
                );
                if (response.ok) data = await response.json();
                else
                    lastError = new Error(
                        `Erreur API: ${response.status} - ${response.statusText}`,
                    );
            } catch (e: any) {
                lastError = e;
            }

            // Fallback JSON-RPC
            if (!data) {
                const rpcRes = await fetch(getApiUrl("/xrplrpc"), {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        method: "account_info",
                        params: [
                            {
                                account: cleanAddress,
                                ledger_index: "validated",
                                strict: true,
                            },
                        ],
                    }),
                    cache: "no-store",
                });
                if (rpcRes.ok) {
                    const rpcJson = await rpcRes.json();
                    const acc = rpcJson?.result?.account_data;
                    if (acc && acc.Balance) {
                        data = {
                            account: cleanAddress,
                            balance_xrp: parseFloat(acc.Balance) / 1_000_000,
                            account_flags: [],
                        };
                    }
                }
            }

            if (!data)
                throw (
                    lastError ||
                    new Error("Impossible de récupérer les données du compte")
                );

            let normalizedData: SearchResultData = {
                account: data.account || cleanAddress,
                balance_xrp: data.balance_xrp || data.balance || 0,
                rank: data.rank,
                total_accounts: data.total_accounts || data.total,
                rank_percent: data.rank_percent,
                account_type: data.account_type || data.type || "Unknown",
                exchange_name: data.exchange_name || data.exchange || undefined,
                trustlines: data.trustlines || data.trustlines_count || 0,
                tokens: data.tokens || data.trustlines || [],
                account_flags: data.account_flags || data.flags || [],
                last_transaction: data.last_transaction || data.last_tx,
                transactions: [],
            };

            if (
                typeof normalizedData.rank !== "number" ||
                typeof normalizedData.total_accounts !== "number"
            ) {
                const est = estimateRankFromFallback(normalizedData.balance_xrp || 0);
                normalizedData.rank = est.rank;
                normalizedData.total_accounts = est.total_accounts;
                normalizedData.rank_percent = (est.rank / est.total_accounts) * 100;
            }

            setSearchResult(normalizedData);
            await loadTxPage(cleanAddress, "init");
        } catch (error: any) {
            console.error("💥 Erreur lors de la recherche:", error);
            setSearchError(error.message || "Erreur lors de la recherche du compte");
        } finally {
            setSearchLoading(false);
        }
    };

    const displayedTxs: Tx[] = txPages[txPageIndex]?.items || [];
    const rankVal = searchResult?.rank ?? null;
    const totalVal = searchResult?.total_accounts ?? null;
    const aboveVal =
        typeof rankVal === "number" ? Math.max(0, rankVal - 1) : null;
    const belowVal =
        typeof rankVal === "number" && typeof totalVal === "number"
            ? Math.max(0, totalVal - rankVal)
            : null;
    const topPercent =
        typeof rankVal === "number" && typeof totalVal === "number" && totalVal > 0
            ? (rankVal / totalVal) * 100
            : null;
    const decile =
        topPercent != null
            ? Math.min(10, Math.max(1, Math.ceil(topPercent / 10)))
            : null;
    const quartile =
        topPercent != null
            ? Math.min(4, Math.max(1, Math.ceil(topPercent / 25)))
            : null;

    const insights = useMemo(() => {
        const self = searchResult?.account || "";
        const all: Tx[] = txPages.flatMap((p) => p.items || []);
        let maxIncoming = 0;
        let maxOutgoing = 0;
        let totalIncoming = 0;
        let totalOutgoing = 0;
        let success = 0;
        let total = 0;
        let lastActive: number | null = null;

        for (const tx of all) {
            if (tx.date) {
                const t = new Date(tx.date).getTime();
                if (!Number.isNaN(t))
                    lastActive = lastActive == null ? t : Math.max(lastActive, t);
            }
            if (tx.result) {
                total++;
                if (tx.result === "tesSUCCESS") success++;
            }
            const amt = typeof tx.amount_xrp === "number" ? tx.amount_xrp : 0;
            if (amt > 0) {
                // Paiement entrant si destination == self, sinon sortant si destination défini et != self
                if (tx.destination && tx.destination === self) {
                    totalIncoming += amt;
                    if (amt > maxIncoming) maxIncoming = amt;
                } else if (tx.destination && tx.destination !== self) {
                    totalOutgoing += amt;
                    if (amt > maxOutgoing) maxOutgoing = amt;
                }
            }
        }

        return {
            txCount: all.length,
            maxIncoming: maxIncoming || null,
            maxOutgoing: maxOutgoing || null,
            totalIncoming: totalIncoming || null,
            totalOutgoing: totalOutgoing || null,
            lastActiveISO: lastActive ? new Date(lastActive).toISOString() : null,
            successRate: total > 0 ? success / total : null,
        };
    }, [txPages, searchResult?.account]);

    const formatFR = (n: number | undefined | null) =>
        typeof n === "number" ? n.toLocaleString("fr-FR") : "—";

    return (
        <div className="space-y-6 mb-8">
            <div className="rounded-2xl p-6 border border-gray-700 bg-gray-900">
                <h2 className="text-2xl font-bold mb-4">
                    🔍 Recherche de compte et classement
                </h2>
                <div className="space-y-3 mb-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-300">
                🔎{" "}
              </span>
                            <input
                                type="text"
                                value={searchAccount}
                                onChange={(e) => setSearchAccount(e.target.value)}
                                placeholder="Entrez une adresse XRP ou un montant de jeton"
                                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500  text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:outline-none"
                                onKeyDown={(e) => e.key === "Enter" && handleSearchAccount()}
                            />
                        </div>
                        <button
                            onClick={handleSearchAccount}
                            disabled={searchLoading || !searchAccount.trim()}
                            className="px-8 py-2 rounded-xl text-white font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {searchLoading ? "🔄 Recherche..." : "🔍 Rechercher"}
                        </button>
                    </div>
                    <div className="text-sm text-gray-300">
                        💡 <strong>Astuce:</strong> Saisissez une adresse XRP (ex de Binance:
                        rs8ZPbYqgecRcDzQpJYAMhSxSi5htsjnza) ou
                        un montant en XRP (ex: 100 000) pour estimer le rang global.
                    </div>
                </div>

                {searchError && (
                    <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300">
                        ❌ {searchError}
                    </div>
                )}

                {searchResult && (
                    <div className="mb-4 p-6 bg-gray-900 border border-gray-700 rounded-lg">
                        {typeof searchResult.rank === "number" &&
                            typeof searchResult.total_accounts === "number" && (
                                <div className="mb-6 p-5 rounded-xl border border-gray-700 bg-gray-900">
                                    <div className="text-white text-sm">
                                        <div>
                                            Adresse du portefeuille ou montant :{" "}
                                            {searchMode === "address"
                                                ? searchResult.account || "—"
                                                : `${(searchResult.balance_xrp ?? 0).toLocaleString("fr-FR")}`}
                                        </div>
                                        <div className="mt-2">
                                            Vous êtes classé n°{formatFR(rankVal)} sur{" "}
                                            {formatFR(totalVal)} portefeuilles XRP.
                                        </div>
                                        <div>
                                            Il y a {formatFR(aboveVal)} portefeuilles avec plus de XRP
                                            et {formatFR(belowVal)} avec moins de XRP.
                                        </div>
                                        <div>
                                            {" "}
                                            Cela vous place dans le top{" "}
                                            {topPercent != null ? topPercent.toFixed(3) : "—"} % des
                                            comptes !
                                        </div>

                                        <div className="mt-4">
                                            <ProgressBar
                                                value={topPercent ?? 0}
                                                height="sm"
                                                showLabels
                                            />
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Rang</div>
                                                <div className=" text-cyan-300 text-lg">
                                                    #{formatFR(rankVal)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">
                                                    Comptes totaux
                                                </div>
                                                <div className=" text-white text-lg">
                                                    {formatFR(totalVal)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Au-dessus</div>
                                                <div className=" text-white text-lg">
                                                    {formatFR(aboveVal)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">En dessous</div>
                                                <div className=" text-white text-lg">
                                                    {formatFR(belowVal)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">Pourcentage</div>
                                                <div className=" text-white text-lg">
                                                    {topPercent != null ? topPercent.toFixed(3) : "—"} %
                                                </div>
                                            </div>
                                            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                <div className="text-gray-400 text-xs">
                                                    Décile / Quartile
                                                </div>
                                                <div className=" text-white text-lg">
                                                    D{decile ?? "—"} / Q{quartile ?? "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {searchMode === "address" && (
                            <>
                {/* Résumé du compte (amélioré) */}
                    <div className="mb-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Carte Adresse + QR */}
                            <div className="bg-gray-900 rounded-xl border border-gray-700 py-4 px-6">
                                <h4 className="text-gray-200 font-semibold mb-3">
                                    🏷️ Adresse
                                </h4>
                                <div className="flex flex-col items-start gap-4">
                                    <QrCode
                                        value={searchResult.account}
                                        size={128}
                                        className="shrink-0"
                                    />
                                    <div className="flex-1">
                                        <div className=" text-sm break-all text-white">
                                            {searchResult.account}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(
                                                                searchResult.account,
                                                            );
                                                            setCopied(true);
                                                            setTimeout(() => setCopied(false), 1500);
                                                        } catch {
                                                            // no-op
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs"
                                                >
                                                    Copier
                                                </button>
                                                {copied && (
                                                    <div
                                                        className="absolute left-1/2 -translate-x-1/2 -top-8 bg-green-600 text-white text-xs px-2 py-1 rounded shadow">
                                                        Copié&nbsp;!
                                                    </div>
                                                )}
                                            </div>
                                            <a
                                                href={`https://xrpscan.com/account/${encodeURIComponent(searchResult.account)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs"
                                            >
                                                Ouvrir dans XRPSCAN
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Indicateurs clés */}
                            <div className="md:col-span-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">Balance</div>
                                    <div className=" text-white text-lg">
                                        {searchResult.balance_xrp?.toLocaleString("fr-FR")}{" "}
                                        XRP
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Rang / Percentile
                                    </div>
                                    <div className=" text-white text-lg">
                                        #{formatFR(rankVal)}{" "}
                                        {topPercent != null ? (
                                            <span className="text-gray-400">
                              (top {topPercent.toFixed(3)} %)
                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Type de compte
                                    </div>
                                    <div className="text-white text-lg">
                                        {searchResult.account_type}
                                        {searchResult.exchange_name
                                            ? ` · ${searchResult.exchange_name}`
                                            : ""}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">Trustlines</div>
                                    <div className=" text-white text-lg">
                                        {(searchResult.trustlines ?? 0).toLocaleString(
                                            "fr-FR",
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Plus gros reçu
                                    </div>
                                    <div className=" text-cyan-300 text-lg">
                                        {insights.maxIncoming != null
                                            ? `${insights.maxIncoming.toLocaleString("fr-FR")} XRP`
                                            : "—"}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Plus gros envoyé
                                    </div>
                                    <div className=" text-pink-300 text-lg">
                                        {insights.maxOutgoing != null
                                            ? `${insights.maxOutgoing.toLocaleString("fr-FR")} XRP`
                                            : "—"}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Total reçu / envoyé
                                    </div>
                                    <div className=" text-white text-lg">
                                        {(insights.totalIncoming ?? 0).toLocaleString(
                                            "fr-FR",
                                        )}{" "}
                                        /{" "}
                                        {(insights.totalOutgoing ?? 0).toLocaleString(
                                            "fr-FR",
                                        )}{" "}
                                        XRP
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Dernière activité
                                    </div>
                                    <div className="text-white text-slg">
                                        {insights.lastActiveISO
                                            ? new Date(insights.lastActiveISO).toLocaleString(
                                                "fr-FR",
                                            )
                                            : "—"}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                    <div className="text-gray-400 text-xs">
                                        Taux de succès
                                    </div>
                                    <div className="text-white text-slg">
                                        {insights.successRate != null
                                            ? `${(insights.successRate * 100).toFixed(1)} %`
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                {searchResult.tokens && searchResult.tokens.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-gray-200 font-semibold mb-3 border-b border-gray-700 pb-1">
                            🪙 Tokens possédés ({searchResult.tokens.length})
                        </h4>
                        <div className="bg-gray-800 rounded p-4 max-h-48 overflow-y-auto">
                            {searchResult.tokens.map((token, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0"
                                >
                                    <div>
                            <span className="text-white  font-bold">
                              {token.currency}
                            </span>
                                        <span className="text-gray-400 text-xs ml-2">
                              ({token.issuer?.substring(0, 8)}...)
                            </span>
                                    </div>
                                    <span className="text-white  text-sm">
                            {parseFloat(token.balance).toLocaleString("fr-FR")}
                          </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Flags (optionnels) */}
                {searchResult.account_flags &&
                    searchResult.account_flags.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-gray-200 font-semibold mb-2 border-b border-gray-700 pb-1">
                                🏴 Flags du compte
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {searchResult.account_flags.map((flag, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-800 text-white rounded text-xs "
                                    >
                            {flag}
                          </span>
                                ))}
                            </div>
                        </div>
                    )}

                {/* Dernières transactions - pleine largeur, sans scroll interne */}
                    <div className="my-4 bg-gray-900 rounded-xl border border-gray-700 py-4 px-6">
                        <h4 className="text-gray-200 font-semibold mb-3">
                            ⏰ Dernières transactions (10)
                        </h4>
                        <div className="bg-gray-800 rounded p-4">
                            {txLoading && displayedTxs.length === 0 && (
                                <div className="text-gray-400 text-sm">
                                    Chargement des transactions…
                                </div>
                            )}

                            <table className="w-full">
                                <thead className="text-left text-gray-300">
                                <tr className="border-b border-gray-700">
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Montant (XRP)</th>
                                    <th className="py-2 pr-3">Destination</th>
                                    <th className="py-2 pr-3">Résultat</th>
                                    <th className="py-2 pr-3">Date</th>
                                    <th className="py-2 pr-3">Hash</th>
                                </tr>
                                </thead>
                                <tbody>
                                {displayedTxs.length > 0
                                    ? displayedTxs.map((tx, idx) => (
                                        <tr
                                            key={tx.hash || idx}
                                            className="border-b border-gray-700 text-sm hover:bg-gray-900/40"
                                        >
                                            <td className="py-2 pr-3 text-white ">
                                                {tx.type || "Tx"}
                                            </td>
                                            <td className="py-2 pr-3 text-white ">
                                                {typeof tx.amount_xrp === "number"
                                                    ? tx.amount_xrp.toLocaleString("fr-FR")
                                                    : "—"}
                                            </td>
                                            <td className="py-2 pr-3 text-gray-300">
                                                {tx.destination ? (
                                                    <span>
                                      {tx.destination}
                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {tx.result ? (
                                                    <span
                                                        className={
                                                            tx.result === "tesSUCCESS"
                                                                ? "text-green-400"
                                                                : "text-red-400"
                                                        }
                                                    >
                                      {tx.result}
                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-gray-300">
                                                {tx.date
                                                    ? new Date(tx.date).toLocaleString("fr-FR")
                                                    : "—"}
                                            </td>
                                            <td className="py-2 pr-3 text-gray-400 truncate max-w-xs">
                                                {tx.hash ? tx.hash : "—"}
                                            </td>
                                        </tr>
                                    ))
                                    : !txLoading && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-4 text-center text-gray-400"
                                        >
                                            Aucune transaction disponible
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination pleine largeur */}
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                onClick={() =>
                                    setTxPageIndex((prev) => Math.max(0, prev - 1))
                                }
                                disabled={txPageIndex === 0}
                                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
                            >
                                ← Précédent
                            </button>
                            <div className="text-xs text-gray-400">
                                Page {txPageIndex + 1}
                            </div>
                            <button
                                onClick={() => {
                                    if (searchResult?.account)
                                        loadTxPage(searchResult.account, "next");
                                }}
                                disabled={!txPages[txPageIndex]?.nextMarker || txLoading}
                                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
                            >
                                Suivant →
                            </button>
                        </div>
                    </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
