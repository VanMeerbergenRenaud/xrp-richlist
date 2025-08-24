import "../styles/globals.css";
import React from "react";

export const metadata = {
  title: "XRP Explorer",
  description: "Stats et exploration d'adresses XRP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">XRP Explorer</h1>
            <nav className="space-x-4 text-sm">
              <a href="/" className="hover:underline">Stats</a>
              <a href="/xrpscan/search" className="hover:underline">Recherche adresse</a>
              <a href="#" className="text-gray-400 cursor-not-allowed">Top Wallets</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-12 border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
            Open source – MIT
          </div>
        </footer>
      </body>
    </html>
  );
}
