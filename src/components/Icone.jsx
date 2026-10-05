// Icônes SVG au trait (style « outline »), sans dépendance externe.
const TRACES = {
  tableau: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  boutique: 'M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6',
  vendeur: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1M12 14l-1.5 3 1.5 4 1.5-4z',
  clients: 'M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1M21 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM14 14.5A5 5 0 0 1 22 19v1',
  commandes: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  produits: 'M6 7h12l1 14H5zM9 7V5a3 3 0 0 1 6 0v2',
  rapports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  menu: 'M3 6h18M3 12h18M3 18h18',
  fermer: 'M6 6l12 12M18 6L6 18',
  sortie: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  chevron: 'M9 6l6 6-6 6',
  retour: 'M19 12H5M11 18l-6-6 6-6',
  etoile: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
}

export default function Icone({ nom, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={TRACES[nom]} />
    </svg>
  )
}
