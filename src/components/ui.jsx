import { useState } from 'react'
import Icone from './Icone'

// Composants d'interface partagés par les pages.

export function EnTete({ titre, sousTitre, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{titre}</h1>
        {sousTitre && <p className="text-sm text-slate-500">{sousTitre}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function Carte({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200/70 bg-white shadow-sm ${className}`}>{children}</div>
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
 * `groupes` (facultatif) : [{ cle, titre: node, resume: node, lignes }] remplace
 * `lignes` et affiche chaque groupe sous un en-tête qu'on peut replier.
 */
export function Tableau({ colonnes, lignes, groupes, cle = 'id', vide = 'Aucun résultat' }) {
  const [replies, setReplies] = useState(() => new Set())
  const basculer = (k) =>
    setReplies((r) => {
      const n = new Set(r)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  const total = groupes ? groupes.reduce((s, g) => s + g.lignes.length, 0) : lignes.length

  const rangees = (liste) =>
    liste.map((l) => (
      <tr key={l[cle]} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/60">
        {colonnes.map((c) => (
          <td key={c.titre} className={`px-4 py-3 ${c.className ?? ''}`}>{c.rendu(l)}</td>
        ))}
      </tr>
    ))

  return (
    <Carte className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {colonnes.map((c) => (
              <th key={c.titre} className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>{c.titre}</th>
            ))}
          </tr>
        </thead>
        {total === 0 && (
          <tbody>
            <tr>
              <td colSpan={colonnes.length} className="px-4 py-10 text-center text-slate-400">{vide}</td>
            </tr>
          </tbody>
        )}
        {!groupes && <tbody>{rangees(lignes)}</tbody>}
        {groupes?.map((g) => {
          const ouvert = !replies.has(g.cle)
          return (
            <tbody key={g.cle} className="border-b border-slate-200 last:border-0">
              <tr className="cursor-pointer bg-fond/70 hover:bg-fond" onClick={() => basculer(g.cle)}>
                <td colSpan={colonnes.length} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Icone nom="chevron" className={`h-4 w-4 text-slate-400 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
                    <span className="font-semibold text-navy">{g.titre}</span>
                    <span className="text-xs text-slate-500">{g.resume}</span>
                  </div>
                </td>
              </tr>
              {ouvert && rangees(g.lignes)}
            </tbody>
          )
        })}
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
