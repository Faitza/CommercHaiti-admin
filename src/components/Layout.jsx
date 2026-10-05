import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icone from './Icone'

const SECTIONS = [
  ['Pilotage', [
    ['/dashboard', 'Tableau de bord', 'tableau'],
    ['/rapports', 'Rapports', 'rapports'],
  ]],
  ['Marketplace', [
    ['/boutiques', 'Boutiques', 'boutique'],
    ['/produits', 'Produits', 'produits'],
    ['/commandes', 'Commandes', 'commandes'],
  ]],
  ['Comptes', [
    ['/vendeurs', 'Vendeurs', 'vendeur'],
    ['/clients', 'Clients', 'clients'],
  ]],
]

const TITRES = Object.fromEntries(SECTIONS.flatMap(([, liens]) => liens.map(([to, libelle]) => [to, libelle])))

function Marque({ taille = 'h-9' }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo-mark.png" alt="" className={taille} />
      <span className="text-lg font-bold tracking-tight text-white">
        Commerc<span className="text-[#FF5A66]">Haiti</span>
      </span>
    </span>
  )
}

function initiales(nom = '') {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || 'A'
}

// Barre latérale navy avec logo (repliable sur mobile) + en-tête + zone de contenu.
export default function Layout({ children }) {
  const { admin, deconnexion } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen md:flex">
      <header className="md:hidden flex items-center justify-between bg-navy text-white px-4 h-14">
        <Marque taille="h-8" />
        <button onClick={() => setOuvert(!ouvert)} className="p-1" aria-label="Menu">
          <Icone nom={ouvert ? 'fermer' : 'menu'} className="h-6 w-6" />
        </button>
      </header>

      <aside
        className={`${ouvert ? 'flex' : 'hidden'} md:flex flex-col md:w-64 shrink-0 bg-navy text-white md:h-screen md:sticky md:top-0`}
      >
        <div className="hidden md:block px-5 pt-6 pb-5 border-b border-white/10">
          <Marque taille="h-10" />
          <div className="mt-2 pl-[50px] text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Administration
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SECTIONS.map(([section, liens]) => (
            <div key={section}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {section}
              </div>
              <div className="space-y-0.5">
                {liens.map(([to, libelle, icone]) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOuvert(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'border-rouge bg-white/10 font-semibold text-white'
                          : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icone nom={icone} className="h-[18px] w-[18px]" />
                    {libelle}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 px-4 py-4 border-t border-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            {initiales(admin?.nom)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{admin?.nom}</div>
            <div className="truncate text-xs text-white/50">{admin?.email}</div>
          </div>
          <button onClick={deconnexion} className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
            title="Se déconnecter" aria-label="Se déconnecter">
            <Icone nom="sortie" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="hidden md:flex h-14 items-center justify-between border-b border-slate-200 bg-white px-8">
          <span className="text-sm text-slate-500">
            Administration <span className="mx-1.5 text-slate-300">/</span>
            <span className="font-medium text-slate-800">{TITRES[pathname] ?? ''}</span>
          </span>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
