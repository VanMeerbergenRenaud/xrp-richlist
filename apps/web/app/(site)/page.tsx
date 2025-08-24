import React from "react";
import {routes} from "../../lib/routes";

export const metadata = {
    title: "XRP Explorer — Accueil",
    description: "Explorer les statistiques XRP et rechercher des adresses"
};

export default function HomePage() {
    return (
        <div className="space-y-8">
            <section className="rounded-2xl border bg-white p-8">
                <h1 className="text-3xl font-bold mb-3">Bienvenue sur XRP Explorer</h1>
                <p className="text-gray-600 max-w-2xl">
                    Consultez la distribution des soldes du réseau XRPL et explorez les comptes en toute simplicité.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href={routes.stats} className="rounded-xl border bg-white p-6">
                    <h2 className="text-lg font-semibold mb-2">Statistiques</h2>
                    <p className="text-sm text-gray-600">
                        Distribution des comptes par tranches de solde et seuils par pourcentage, calculés en
                        arrière‑plan.
                    </p>
                </a>
                <a href={routes.address} className="rounded-xl border bg-white p-6">
                    <h2 className="text-lg font-semibold mb-2">Recherche d’adresse</h2>
                    <p className="text-sm text-gray-600">
                        Consultez le profil d’une adresse: solde, transactions récentes, tokens et propriétés.
                    </p>
                </a>
            </section>
        </div>
    );
}
