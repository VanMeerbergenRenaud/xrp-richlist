import React from "react";
import { BUCKET_EDGES } from "./xrpscan/stats/BUCKET_EDGES";
import DistributionTables from "./_components/DistributionTables";

export default function Page() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Distribution des soldes — deux vues liées</h1>
      <DistributionTables edges={BUCKET_EDGES} />
    </div>
  );
}
