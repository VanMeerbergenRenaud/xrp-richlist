import "../styles/globals.css";
import React from "react";
import Navigation from "./_partials/Navigation";
import Footer from "./_partials/Footer";

export const metadata = {
    title: "XRP Explorer",
    description: "Stats et exploration d'adresses XRP",
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="fr">
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white">
            <Navigation/>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">
            {children}
        </main>
        <footer className="mt-12 border-t bg-white">
            <Footer/>
        </footer>
        </body>
        </html>
    );
}
