import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { htg, dateHeure } from '../lib/format'
import { Carte, EnTete, Erreur, Chargement } from '../components/ui'

// Compte exact des lignes d'une table (head: true = sans télécharger les lignes).
async function compter(table, filtre = (q) => q) {
  const { count, error } = await filtre(supabase.from(table).select('id', { count: 'exact', head: true }))
  if (error) throw error
  return count ?? 0
}

// /dashboard — statistiques globales.
export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [boutiques, enAttente, clients, vendeurs, commandes, litiges, livrees, journal] = await Promise.all([
          compter('shops'),
          compter('shops', (q) => q.eq('statut_validation', 'en_attente')),
          compter('users', (q) => q.eq('role', 'customer')),
          compter('users', (q) => q.eq('role', 'seller')),
          compter('orders'),
          compter('orders', (q) => q.eq('litige_statut', 'ouvert')),
          supabase.from('orders').select('total').eq('statut', 'livree'),
          supabase.from('admin_logs').select('id, action, created_at, details').order('created_at', { ascending: false }).limit(8),
        ])
        if (livrees.error) throw livrees.error
        const ca = livrees.data.reduce((s, o) => s + Number(o.total), 0)
        setStats({ boutiques, enAttente, clients, vendeurs, commandes, litiges, ca })
        setLogs(journal.data ?? [])
      } catch (e) {
        setErreur(e.message)
      }
    })()
  }, [])

  if (erreur) return <Erreur message={`Impossible de charger les statistiques : ${erreur}`} />
  if (!stats) return <Chargement />

  const tuiles = [
    ['Boutiques', stats.boutiques, `${stats.enAttente} en attente d'approbation`, '/boutiques'],
    ['Clients', stats.clients, `${stats.vendeurs} vendeurs`, '/clients'],
    ['Commandes', stats.commandes, `${stats.litiges} litige(s) ouvert(s)`, '/commandes'],
    ['CA total', htg(stats.ca), 'commandes livrées', '/rapports'],
  ]

  return (
    <>
      <EnTete titre="Tableau de bord" sousTitre="Vue d'ensemble de CommercHaiti" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tuiles.map(([titre, valeur, detail, lien]) => (
          <Link key={titre} to={lien}>
            <Carte className="p-5 hover:shadow-md transition-shadow">
              <div className="text-sm text-slate-500">{titre}</div>
              <div className="mt-1 text-3xl font-bold text-navy">{valeur}</div>
              <div className="mt-1 text-xs text-slate-400">{detail}</div>
            </Carte>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-navy">Dernières actions admin</h2>
      <Carte className="divide-y divide-slate-50">
        {logs.length === 0 && <div className="p-6 text-sm text-slate-400">Aucune action pour l'instant.</div>}
        {logs.map((l) => (
          <div key={l.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
            <span>
              <span className="font-semibold">{l.action.replaceAll('_', ' ')}</span>
              {l.details?.nom && <span className="text-slate-500"> · {l.details.nom}</span>}
            </span>
            <span className="text-slate-400 whitespace-nowrap">{dateHeure(l.created_at)}</span>
          </div>
        ))}
      </Carte>
    </>
  )
}
