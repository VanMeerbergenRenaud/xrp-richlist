"use client";

import React, {useEffect} from "react";
import {useStats} from "@/contexts/StatsContext";

export default function StatsPage() {
    const {
        balanceRangeData,
        percentageData,
        status,
        error,
        lastUpdated,
        loadIfNeeded,
        reload,
    } = useStats();

    useEffect(() => {
        loadIfNeeded();
    }, [loadIfNeeded]);

    const loading = status === "loading";

    const formatNumber = (num: string) =>
        parseFloat(num).toLocaleString("fr-FR", {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6,
        });
    const formatInteger = (num: number) => num.toLocaleString("fr-FR");

    return (
        <div className="space-y-8" aria-busy={loading}>
            {error && status !== "loading" && (
                <div className="bg-red-900 rounded-lg p-6 text-center border border-red-700">
                    <div className="text-red-300">Erreur: {error}</div>
                    <button
                        onClick={reload}
                        className="mt-4 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
                    >
                        Réessayer
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Statistiques XRP</h1>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400">
                        {lastUpdated
                            ? `Mis à jour: ${new Date(lastUpdated).toLocaleString("fr-FR")}`
                            : "—"}
                    </div>
                    <button
                        onClick={reload}
                        disabled={loading}
                        className="px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-sm"
                    >
                        {loading ? "Actualisation..." : "↻ Actualiser"}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs">Comptes totaux</div>
                    <div className="text-2xl font-mono text-white">
                        {loading ? (
                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-24"/>
                        ) : (
                            balanceRangeData
                                .reduce((acc, d) => acc + (d.accounts || 0), 0)
                                .toLocaleString("fr-FR")
                        )}
                    </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs">
                        XRP total (somme des plages)
                    </div>
                    <div className="text-2xl font-mono text-white">
                        {loading ? (
                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-40"/>
                        ) : (
                            balanceRangeData
                                .reduce((acc, d) => acc + (parseFloat(d.sum || "0") || 0), 0)
                                .toLocaleString("fr-FR") + " XRP"
                        )}
                    </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs">Solde moyen par compte</div>
                    <div className="text-2xl font-mono text-white">
                        {loading ? (
                            <div className="h-6 bg-gray-700/60 rounded animate-pulse w-28"/>
                        ) : (
                            (() => {
                                const totalAcc = balanceRangeData.reduce(
                                    (acc, d) => acc + (d.accounts || 0),
                                    0,
                                );
                                const totalXrp = balanceRangeData.reduce(
                                    (acc, d) => acc + (parseFloat(d.sum || "0") || 0),
                                    0,
                                );
                                return (
                                    (totalAcc > 0 ? totalXrp / totalAcc : 0).toLocaleString(
                                        "fr-FR",
                                        {maximumFractionDigits: 6},
                                    ) + " XRP"
                                );
                            })()
                        )}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
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
                            {balanceRangeData && balanceRangeData.length > 0 ? (
                                balanceRangeData.map((row, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-800 hover:bg-gray-800/70"
                                    >
                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                            {formatInteger(row.accounts || 0)}
                                        </td>
                                        <td className="px-4 py-2 border-r border-gray-800 font-mono">
                                            {row.range || "N/A"}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">
                                            {formatNumber(row.sum || "0")}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <>
                                    {loading ? (
                                        Array.from({length: 6}).map((_, i) => (
                                            <tr
                                                key={`skeleton-ranges-${i}`}
                                                className="border-b border-gray-800"
                                            >
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="h-4 bg-gray-700/60 rounded animate-pulse w-20 ml-auto"/>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="h-4 bg-gray-700/60 rounded animate-pulse w-40"/>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="h-4 bg-gray-700/60 rounded animate-pulse w-28 ml-auto"/>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-8 text-center text-gray-400"
                                            >
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
                            {percentageData && percentageData.length > 0 ? (
                                percentageData.map((row, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-800 hover:bg-gray-800/70"
                                    >
                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                            {row.percentage}
                                        </td>
                                        <td className="px-4 py-2 text-right border-r border-gray-800 font-mono">
                                            {formatInteger(row.accounts || 0)}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">
                                            {row.balance}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <>
                                    {loading ? (
                                        Array.from({length: 6}).map((_, i) => (
                                            <tr
                                                key={`skeleton-percentiles-${i}`}
                                                className="border-b border-gray-800"
                                            >
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="h-4 bg-gray-700/60 rounded animate-pulse w-24 ml-auto"/>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="h-4 bg-gray-700/60 rounded animate-pulse w-20 ml-auto"/>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div
                                                        className="h-4 bg-gray-700/60 rounded animate-pulse w-48 ml-auto"/>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-8 text-center text-gray-400"
                                            >
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
        </div>
    );
}
