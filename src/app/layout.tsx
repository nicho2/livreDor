import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LivreDor",
  description: "Construire ensemble un souvenir numérique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <div className="shell">
            <header className="header">
              <Link className="brand" href="/">LivreDor</Link>
              <AuthNav />
            </header>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
