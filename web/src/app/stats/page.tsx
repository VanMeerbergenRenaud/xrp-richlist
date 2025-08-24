import type {Metadata} from "next";
import StatsPage from "@/components/pages/StatsPage";

export const metadata: Metadata = {
    title: "Statistiques | XRP Rich List",
    description: "Statistiques de distribution des soldes XRP et percentiles",
};

export default function Page() {
    return (
        <>
            <StatsPage/>
        </>
    );
}
