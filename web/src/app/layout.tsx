import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import NavBar from "@/components/nav/NavBar";
import { StatsProvider } from "@/contexts/StatsContext";

export const metadata: Metadata = {
  title: "XRP Rich List",
  description:
    "Liste des comptes XRP les plus riches avec statistiques de distribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-black text-white">
        <StatsProvider>
          <NavBar />
          <main className="p-6">{children}</main>
        </StatsProvider>
      </body>
    </html>
  );
}
