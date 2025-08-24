import type {Metadata} from "next";
import {getFallbackDistributionData} from "@/lib/stats/fallback";

export const metadata: Metadata = {
    title: "Infos | XRP Rich List",
    description: "Informations générales et architecture de l'application",
};

export default function InfoPage() {
    const dist = getFallbackDistributionData();
    const total_accounts = dist.reduce((acc, d) => acc + (d.accounts || 0), 0);
    const total_xrp = dist.reduce(
        (acc, d) => acc + (parseFloat(d.sum || "0") || 0),
        0,
    );

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h2 className="text-2xl font-bold mb-6">
                    ℹ️ Informations sur l'application
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                            📊 Statistiques générales
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-gray-400">Nombre total de comptes:</span>{" "}
                                <span className="font-mono text-white">
                  {total_accounts.toLocaleString("fr-FR")}
                </span>
                            </p>
                            <p>
                                <span className="text-gray-400">Total XRP indexé:</span>{" "}
                                <span className="font-mono text-white">
                  {total_xrp.toLocaleString("fr-FR")} XRP
                </span>
                            </p>
                            <p>
                                <span className="text-gray-400">Dernière mise à jour:</span>{" "}
                                <span className="font-mono text-white">
                  {new Date().toLocaleString("fr-FR")}
                </span>
                            </p>
                            <p>
                                <span className="text-gray-400">Âge du cache:</span>{" "}
                                <span className="font-mono text-gray-300">N/A</span>
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                            🏗️ Architecture
                        </h3>
                        <div className="space-y-2 text-sm text-gray-300">
                            <p>
                                • <strong>Frontend:</strong> Next.js 15 + React 19 + TypeScript
                            </p>
                            <p>
                                • <strong>Backend:</strong> FastAPI + Python
                            </p>
                            <p>
                                • <strong>Base de données:</strong> PostgreSQL 16
                            </p>
                            <p>
                                • <strong>Indexeur:</strong> Python + XRPL
                            </p>
                            <p>
                                • <strong>Containerisation:</strong> Docker + Docker Compose
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">
                        🚀 Fonctionnalités
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <h4 className="font-semibold text-white mb-2">
                                Recherche & Classement
                            </h4>
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
                        Cette application analyse la distribution de la richesse sur la
                        blockchain XRP en temps réel. Elle indexe les comptes et leurs
                        soldes pour fournir des statistiques détaillées sur la répartition
                        des tokens XRP dans l'écosystème.
                    </p>
                </div>
            </div>
        </div>
    );
}
