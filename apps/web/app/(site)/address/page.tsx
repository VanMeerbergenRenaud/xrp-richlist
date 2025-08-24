import React from "react";
import Link from "next/link";

type FetchDebug = {
    url: string;
    ok: boolean;
    status: string;
    contentType: string | null;
    json?: unknown;
    textPreview?: string;
    error?: string;
};

const API_ROOT = "https://api.xrpscan.com/api/v1";

function isValidXrplAddress(addr: string) {
    return /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/.test(addr);
}

async function fetchResource(url: string): Promise<FetchDebug> {
    try {
        const res = await fetch(url, {
            next: {revalidate: 30},
            headers: {
                accept: "application/json",
                referer: "https://xrpscan.com/",
                origin: "https://xrpscan.com",
                "user-agent": "xrp-richlist/0.1 (+https://example.com)"
            }
        });
        const contentType = res.headers.get("content-type");
        const out: FetchDebug = {
            url,
            ok: res.ok,
            status: `${res.status} ${res.statusText}`,
            contentType
        };
        if (contentType && contentType.includes("application/json")) {
            try {
                out.json = await res.json();
            } catch (e: any) {
                out.error = `JSON parse error: ${String(e?.message ?? e)}`;
            }
        } else {
            const t = await res.text();
            out.textPreview = t.slice(0, 500);
        }
        return out;
    } catch (e: any) {
        return {
            url,
            ok: false,
            status: "fetch error",
            contentType: null,
            error: String(e?.message ?? e)
        };
    }
}

function fmtXrp(value?: string | number | null) {
    if (value == null) return "—";
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) return "—";
    const asXrp = n > 1e12 ? n / 1_000_000 : n;
    return asXrp.toLocaleString();
}

function fmtXrpAmount(dropsValue?: string | number | null): string {
    if (dropsValue == null) return "—";
    const drops = typeof dropsValue === "string" ? parseFloat(dropsValue) : dropsValue;
    if (!Number.isFinite(drops)) return "—";
    const xrp = drops / 1_000_000;
    const parts = xrp.toFixed(6).split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedInteger},${decimalPart}`;
}

function extractAmount(tx: any): string {
    const amount =
        tx?.Amount ||
        tx?.amount ||
        tx?.delivered_amount ||
        tx?.DeliveredAmount ||
        tx?.meta?.delivered_amount ||
        tx?.meta?.DeliveredAmount ||
        tx?.specification?.amount;

    if (!amount) return "—";

    if (typeof amount === "object") {
        if (amount.value !== undefined) {
            if (amount.currency === "XRP" || !amount.currency) {
                return fmtXrpAmount(amount.value) + " XRP";
            }
            return `${amount.value} ${amount.currency}`;
        }
        if (amount.amount) {
            return fmtXrpAmount(amount.amount) + " XRP";
        }
    }

    if (typeof amount === "string" || typeof amount === "number") {
        return fmtXrpAmount(amount) + " XRP";
    }
    return "—";
}

export default async function Index({
    searchParams
}: {
    searchParams: { q?: string };
}) {
    const q = (searchParams?.q || "").trim();
    const addressValid = q && isValidXrplAddress(q);

    let byKey: Record<string, FetchDebug> = {};
    if (addressValid) {
        const urls = {
            accountInfo: `${API_ROOT}/account/${q}`,
            balances: `${API_ROOT}/account/${q}/balances`,
            transactions: `${API_ROOT}/account/${q}/transactions?limit=20`,
            trustlines: `${API_ROOT}/account/${q}/trustlines?limit=200`,
            nfts: `${API_ROOT}/account/${q}/nfts`,
            dexOrders: `${API_ROOT}/account/${q}/dex-orders`
        };
        const results = await Promise.all(Object.values(urls).map((u) => fetchResource(u)));
        Object.keys(urls).forEach((key, i) => {
            byKey[key] = results[i];
        });
    }

    const accountJson = (byKey.accountInfo?.json as any) || {};
    const balancesJson = (byKey.balances?.json as any) || {};
    const balancesList: any[] = Array.isArray(balancesJson?.balances) ? balancesJson.balances : [];
    const txJson = (byKey.transactions?.json as any) || {};
    const txList: any[] = Array.isArray(txJson?.transactions) ? txJson.transactions : [];
    const trustlinesJson = (byKey.trustlines?.json as any) || {};
    const trustlinesList: any[] = Array.isArray(trustlinesJson?.trustlines) ? trustlinesJson.trustlines : [];
    const nftsJson = (byKey.nfts?.json as any) || {};
    const nftsList: any[] = Array.isArray(nftsJson?.nfts) ? nftsJson.nfts : [];

    const accountAddress = accountJson?.account ?? q;
    const accountBalanceXrp = accountJson?.balance ?? accountJson?.xrpBalance;
    const xrpBalanceNum =
        typeof accountBalanceXrp === "string" ? parseFloat(accountBalanceXrp) / 1_000_000 : accountBalanceXrp || 0;

    const sequence = accountJson?.sequence ?? accountJson?.Sequence ?? null;
    const previousTxnID = accountJson?.previousTxnID ?? accountJson?.PreviousTxnID ?? null;
    const ownerCount = accountJson?.ownerCount ?? accountJson?.OwnerCount ?? null;
    const domain = accountJson?.domain ?? null;
    const accountRoot = accountJson?.accountRoot ?? accountJson?.index ?? null;

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">XRPSCAN - Recherche Adresse</h1>

            <form className="mb-6">
                <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Adresse XRPL (r...)"
                    className="border p-2 rounded mr-2 w-96"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                    Rechercher
                </button>
            </form>

            {q && !addressValid && <div className="bg-red-100 p-3 rounded mb-4">Adresse invalide</div>}

            {addressValid && (
                <div className="space-y-6">
                    {/* Récapitulatif du compte */}
                    <div className="bg-white border rounded p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <span className="text-blue-500 mr-2">👤</span> Récapitulatif du compte
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Colonne de gauche */}
                            <div className="space-y-4">
                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Address</div>
                                    <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                                        {accountAddress}
                                        <button className="ml-2 text-gray-400 hover:text-gray-600" title="Copy">
                                            📋
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Last tx:</div>
                                    <div className="text-sm">
                                        {previousTxnID ? (
                                            <span
                                                className="font-mono text-blue-600">{previousTxnID.substring(0, 12)}...</span>
                                        ) : (
                                            "—"
                                        )}
                                        {txList.length > 0 &&
                                            <span className="text-red-500 ml-2">{txList.length.toLocaleString()}</span>}
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Activated by:</div>
                                    <div className="text-sm text-blue-600">—</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">On:</div>
                                    <div className="text-sm">—</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Initial balance:</div>
                                    <div className="text-sm">—</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">KYC</div>
                                    <div className="text-sm">—</div>
                                </div>
                            </div>

                            {/* Colonne du milieu */}
                            <div className="space-y-4">
                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Properties</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Next seq:</div>
                                    <div className="text-sm">
                                        {sequence ? (
                                            <>
                                                <span>{sequence.toLocaleString()}</span>
                                                <span className="text-gray-500 ml-2">#{sequence}</span>
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Destination tag:</div>
                                    <div className="text-sm">
                                        <span
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">REQUIRED</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Rippling:</div>
                                    <div className="text-sm">
                                        <span
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ENABLED</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Multisig:</div>
                                    <div className="text-sm">
                                        <span
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ENABLED</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Tickets:</div>
                                    <div className="text-sm">{ownerCount || 0}</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">NFT Minted:</div>
                                    <div className="text-sm">{nftsList.length}</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">NFT Burned:</div>
                                    <div className="text-sm">—</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Objects owned:</div>
                                    <div className="text-sm">{ownerCount || "—"}</div>
                                </div>

                                <div>
                                    <div className="font-medium text-gray-700 mb-1">Account root:</div>
                                    <div className="text-sm">
                                        {accountRoot ? (
                                            <span
                                                className="font-mono text-blue-600">{accountRoot.substring(0, 12)}...</span>
                                        ) : (
                                            "—"
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Colonne de droite - Solde */}
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-center mb-4">
                                    <div className="text-6xl mb-2">💎</div>
                                    <div className="font-medium text-gray-700 mb-1">Domaine</div>
                                    <div className="text-blue-600 text-sm">{domain || "—"}</div>
                                </div>

                                <div className="bg-green-100 rounded p-4 text-center">
                                    <div className="text-gray-600 text-sm mb-1">Solde</div>
                                    <div className="text-gray-600 text-sm mb-1">Réserve</div>
                                    <div className="text-gray-600 text-sm mb-1">Disponible</div>
                                    <div className="text-xl font-bold text-green-700">{fmtXrp(accountBalanceXrp)} XRP
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions détaillées */}
                    {txList.length > 0 && (
                        <div className="bg-white border rounded p-4">
                            <h2 className="text-lg font-bold mb-3">Dernières Transactions</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left py-3 px-4">Type</th>
                                        <th className="text-left py-3 px-4">Date</th>
                                        <th className="text-left py-3 px-4">Hash tx</th>
                                        <th className="text-left py-3 px-4">De</th>
                                        <th className="text-left py-3 px-4">Vers</th>
                                        <th className="text-left py-3 px-4">Montant</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {txList.map((t, i) => (
                                        <tr key={i} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {t?.TransactionType || t?.transaction_type || "—"}
                          </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {t?.Date || t?.date ? new Date(t.Date || t.date).toLocaleString("fr-FR") : "—"}
                                            </td>
                                            <td className="py-3 px-4">
                          <span className="font-mono text-xs text-blue-600">
                            {t?.Hash || t?.hash ? (t.Hash || t.hash).substring(0, 16) + "..." : "—"}
                          </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {t?.Account ? (
                                                    <Link
                                                        href={`/xrpscan/search?q=${encodeURIComponent(t.Account)}`}
                                                        className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        title={`Voir les détails de l'adresse ${t.Account}`}
                                                    >
                                                        {t.Account.substring(0, 8) + "..."}
                                                    </Link>
                                                ) : (
                                                    <span className="font-mono text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {t?.Destination ? (
                                                    <Link
                                                        href={`/xrpscan/search?q=${encodeURIComponent(t.Destination)}`}
                                                        className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        title={`Voir les détails de l'adresse ${t.Destination}`}
                                                    >
                                                        {t.Destination.substring(0, 8) + "..."}
                                                    </Link>
                                                ) : (
                                                    <span className="font-mono text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-medium">{extractAmount(t)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tokens & Soldes */}
                    {balancesList.length > 0 && (
                        <div className="bg-white border rounded p-4">
                            <h2 className="text-lg font-bold mb-3">Tokens & Soldes</h2>
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1">Devise</th>
                                    <th className="text-left py-1">Montant</th>
                                    <th className="text-left py-1">Émetteur</th>
                                </tr>
                                </thead>
                                <tbody>
                                {balancesList.map((b, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-1 font-medium">{b?.currency || "XRP"}</td>
                                        <td className="py-1">{fmtXrp(b?.value || b?.amount)}</td>
                                        <td className="py-1 font-mono text-xs">{(b?.issuer || "—").substring(0, 20)}...</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Trustlines */}
                    {trustlinesList.length > 0 && (
                        <div className="bg-white border rounded p-4">
                            <h2 className="text-lg font-bold mb-3">Trustlines</h2>
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1">Devise</th>
                                    <th className="text-left py-1">Limite</th>
                                    <th className="text-left py-1">Émetteur</th>
                                </tr>
                                </thead>
                                <tbody>
                                {trustlinesList.slice(0, 20).map((tl, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-1 font-medium">{tl?.currency || "—"}</td>
                                        <td className="py-1">{fmtXrp(tl?.limit)}</td>
                                        <td className="py-1 font-mono text-xs">{(tl?.account || "—").substring(0, 20)}...</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {trustlinesList.length > 20 && (
                                <p className="text-xs text-gray-500 mt-2">+{trustlinesList.length - 20} autres
                                    trustlines</p>
                            )}
                        </div>
                    )}

                    {/* Debug info */}
                    <details className="bg-gray-50 border rounded p-4">
                        <summary className="font-bold cursor-pointer">Debug API</summary>
                        <div className="mt-2 space-y-2">
                            {Object.entries(byKey).map(([key, debug]) => (
                                <div key={key} className="text-xs">
                                    <strong>{key}:</strong> {debug.ok ? "✅" : "❌"} {debug.status}
                                    {debug.error && <span className="text-red-600"> - {debug.error}</span>}
                                    {key === "transactions" && debug.json && (
                                        <details className="ml-4 mt-1">
                                            <summary className="cursor-pointer text-blue-600">Voir structure des
                                                transactions
                                            </summary>
                                            <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                                                {JSON.stringify(txList.slice(0, 2), null, 2)}
                                              </pre>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
