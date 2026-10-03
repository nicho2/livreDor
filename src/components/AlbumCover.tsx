// Decorative code-native album illustration: no remote assets or private content.
export function AlbumCover() {
  return <div className="album-cover" aria-hidden="true"><div className="cover-paper cover-back"><span>Les petits bonheurs</span></div><div className="cover-paper cover-photo"><svg viewBox="0 0 240 170" focusable="false"><rect width="240" height="170" fill="var(--secondary)" /><circle cx="175" cy="45" r="22" fill="var(--accent)" opacity=".7" /><path d="M0 150L65 65L122 126L169 89L240 154V170H0Z" fill="var(--accent)" opacity=".5" /><path d="M0 170L80 110L148 170Z" fill="var(--ink)" opacity=".2" /></svg><span>Ensemble, tout simplement.</span></div><span className="cover-note">Des instants.<br />Une histoire.</span></div>;
}
