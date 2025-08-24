import React from "react";
import {routes} from "../../lib/routes";

export default function Navigation() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
                <a href={routes.home} className="hover:opacity-80">XRP Explorer</a>
            </h1>
            <nav className="space-x-4 text-sm">
                <a href={routes.stats} className="hover:underline">Stats</a>
                <a href={routes.address} className="hover:underline">Recherche d’adresse</a>
            </nav>
        </div>
    );
}