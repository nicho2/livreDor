import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthNav } from "@/components/AuthNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import packageInfo from "../../package.json";

export const metadata: Metadata = {
  title: "LivreDor",
  description: "Construire ensemble un souvenir numérique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <ThemeProvider><AuthProvider>
          <div className="shell">
            <header className="header">
              <Link className="brand" href="/">LivreDor</Link>
              <AuthNav />
            </header>
            {children}
            <footer className="app-version" aria-label="Version de l'application">LivreDor · v{packageInfo.version}</footer>
          </div>
        </AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
