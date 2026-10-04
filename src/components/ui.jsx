// Composants d'interface partagés par les pages.

export function EnTete({ titre, sousTitre, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-navy">{titre}</h1>
        {sousTitre && <p className="text-sm text-slate-500">{sousTitre}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function Carte({ children, className = '' }) {
  return <div className={`rounded-xl bg-white shadow-sm ${className}`}>{children}</div>
}

const TONS = {
  vert: 'bg-vert/10 text-vert',
  rouge: 'bg-rouge/10 text-rouge',
  ambre: 'bg-ambre/15 text-amber-700',
  navy: 'bg-navy/10 text-navy',
  gris: 'bg-slate-100 text-slate-600',
}

export function Badge({ ton = 'gris', children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[ton]}`}>
      {children}
    </span>
  )
}

const BOUTONS = {
  navy: 'bg-navy text-white hover:bg-navy-dark',
  rouge: 'bg-rouge text-white hover:opacity-90',
  vert: 'bg-vert text-white hover:opacity-90',
  clair: 'bg-white text-navy border border-slate-200 hover:bg-slate-50',
}

export function Bouton({ variante = 'navy', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${BOUTONS[variante]} ${className}`}
    />
  )
}

export function Recherche({ valeur, onChange, placeholder = 'Rechercher…' }) {
  return (
    <input
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-navy"
    />
  )
}

export function Filtres({ options, valeur, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, libelle]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            valeur === v ? 'bg-navy text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}

/**
 * Tableau simple. `colonnes` : [{ titre, rendu: (ligne) => node, className }]
 * Défile horizontalement sur petit écran.
 */
export function Tableau({ colonnes, lignes, cle = 'id', vide = 'Aucun résultat' }) {
  return (
    <Carte className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
            {colonnes.map((c) => (
              <th key={c.titre} className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>{c.titre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && (
            <tr>
              <td colSpan={colonnes.length} className="px-4 py-10 text-center text-slate-400">{vide}</td>
            </tr>
          )}
          {lignes.map((l) => (
            <tr key={l[cle]} className="border-b border-slate-50 last:border-0 align-top">
              {colonnes.map((c) => (
                <td key={c.titre} className={`px-4 py-3 ${c.className ?? ''}`}>{c.rendu(l)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Carte>
  )
}

export function Erreur({ message }) {
  if (!message) return null
  return <div className="mb-4 rounded-lg bg-rouge/10 px-4 py-3 text-sm text-rouge">{message}</div>
}

export function Chargement() {
  return <div className="py-16 text-center text-slate-400">Chargement…</div>
}
