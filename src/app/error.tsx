"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <main className="card stack"><h1>Le chargement a échoué</h1><p>Vos données enregistrées sont conservées. Vérifiez votre connexion et réessayez.</p><button className="button" onClick={retry}>Réessayer</button></main>;
}
