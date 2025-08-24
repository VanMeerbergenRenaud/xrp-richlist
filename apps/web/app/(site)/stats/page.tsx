import React from "react";
import DistributionTables from "../../_components/DistributionTables";
import { BUCKET_EDGES } from "./lib/BUCKET_EDGES";

export const metadata = {
  title: "Statistiques XRP – Distribution",
  description: "Nombre de comptes et pourcentages par tranches de solde",
};

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Statistiques — Distribution des soldes</h1>
      <p className="text-sm text-gray-500">
        Deux vues complémentaires et liées: répartition par tranches et seuils par pourcentage de comptes.
      </p>
      <DistributionTables edges={BUCKET_EDGES} />
    </div>
  );
}
