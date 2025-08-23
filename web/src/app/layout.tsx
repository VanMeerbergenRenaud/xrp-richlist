import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XRP Rich List",
  description: "Liste des comptes XRP les plus riches avec statistiques de distribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-black text-white">
        {children}
      </body>
    </html>
  );
}
