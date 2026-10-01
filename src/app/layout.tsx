import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LivreDor",
  description: "Construire ensemble un souvenir numérique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <div className="shell">
          <header className="header">
            <Link className="brand" href="/">LivreDor</Link>
            <nav className="nav"><Link href="/auth">Connexion</Link></nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
