import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LIENS = [
  ['/dashboard', 'Tableau de bord', '📊'],
  ['/boutiques', 'Boutiques', '🏪'],
  ['/vendeurs', 'Vendeurs', '🧑‍💼'],
  ['/clients', 'Clients', '👥'],
  ['/commandes', 'Commandes', '📦'],
  ['/produits', 'Produits', '🛍️'],
  ['/rapports', 'Rapports', '📈'],
]

// Barre latérale navy (repliable sur mobile) + zone de contenu.
export default function Layout({ children }) {
  const { admin, deconnexion } = useAuth()
  const [ouvert, setOuvert] = useState(false)

  return (
    <div className="min-h-screen md:flex">
      <header className="md:hidden flex items-center justify-between bg-navy text-white px-4 h-14">
        <span className="font-bold">CommercHaiti <span className="text-rouge">Admin</span></span>
        <button onClick={() => setOuvert(!ouvert)} className="text-2xl" aria-label="Menu">☰</button>
      </header>

      <aside
        className={`${ouvert ? 'block' : 'hidden'} md:block md:w-60 shrink-0 bg-navy text-white md:min-h-screen md:sticky md:top-0`}
      >
        <div className="hidden md:block px-6 py-6 text-lg font-bold">
          CommercHaiti <span className="text-rouge">Admin</span>
        </div>
        <nav className="px-3 pb-4 space-y-1">
          {LIENS.map(([to, libelle, icone]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-white/15 font-semibold' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <span>{icone}</span>
              {libelle}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-sm">
          <div className="text-white/70 truncate">{admin?.nom}</div>
          <button onClick={deconnexion} className="mt-2 text-rouge font-semibold hover:underline">
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  )
}
