import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { exporterCsv } from '../lib/csv'
import { htg, STATUTS_COMMANDE } from '../lib/format'
import { Bouton, Carte, EnTete, Erreur, Filtres, Chargement } from '../components/ui'

const PERIODES = [['7', '7 jours'], ['30', '30 jours'], ['90', '90 jours'], ['tout', 'Tout']]
const jour = (iso) => iso.slice(0, 10)

// /rapports — graphiques de ventes + export CSV.
// Le chiffre d'affaires ne compte que les commandes livrées.
export default function Rapports() {
  const [periode, setPeriode] = useState('30')
  const [commandes, setCommandes] = useState(null)
  const [noms, setNoms] = useState({ users: {}, shops: {} })
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    setCommandes(null)
    ;(async () => {
      let q = supabase.from('orders').select('*').order('created_at')
      if (periode !== 'tout') {
        const debut = new Date()
        debut.setDate(debut.getDate() - Number(periode) + 1)
        debut.setHours(0, 0, 0, 0)
        q = q.gte('created_at', debut.toISOString())
      }
      const [cmd, users, shops] = await Promise.all([
        q,
        supabase.from('users').select('id, nom'),
        supabase.from('shops').select('id, nom'),
      ])
      const err = cmd.error ?? users.error ?? shops.error
      if (err) return setErreur(err.message)
      setNoms({
        users: Object.fromEntries(users.data.map((u) => [u.id, u.nom])),
        shops: Object.fromEntries(shops.data.map((s) => [s.id, s.nom])),
      })
      setCommandes(cmd.data)
    })()
  }, [periode])

  const { parJour, topBoutiques, ca, nbLivrees } = useMemo(() => {
    const parJour = {}
    const parBoutique = {}
    let ca = 0
    let nbLivrees = 0
    for (const c of commandes ?? []) {
      const j = (parJour[jour(c.created_at)] ??= { jour: jour(c.created_at), ca: 0, commandes: 0 })
      j.commandes += 1
      if (c.statut === 'livree') {
        const t = Number(c.total)
        j.ca += t
        ca += t
        nbLivrees += 1
        parBoutique[c.shop_id] = (parBoutique[c.shop_id] ?? 0) + t
      }
    }
    const topBoutiques = Object.entries(parBoutique)
      .map(([id, total]) => ({ nom: noms.shops[id] ?? id.slice(0, 8), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
    return { parJour: Object.values(parJour), topBoutiques, ca, nbLivrees }
  }, [commandes, noms])

  function exporterCommandes() {
    exporterCsv(
      `commandes-${periode}-${new Date().toISOString().slice(0, 10)}.csv`,
      commandes.map((c) => ({
        ...c,
        date: new Date(c.created_at).toLocaleString('fr-FR'),
        client: noms.users[c.client_id] ?? '',
        boutique: noms.shops[c.shop_id] ?? '',
        statut_libelle: STATUTS_COMMANDE[c.statut] ?? c.statut,
      })),
      [
        { cle: 'id', titre: 'N° commande' },
        { cle: 'date', titre: 'Date' },
        { cle: 'client', titre: 'Client' },
        { cle: 'telephone_client', titre: 'Téléphone' },
        { cle: 'boutique', titre: 'Boutique' },
        { cle: 'zone', titre: 'Zone' },
        { cle: 'total', titre: 'Total (HTG)' },
        { cle: 'statut_libelle', titre: 'Statut' },
        { cle: 'litige_statut', titre: 'Litige' },
      ],
    )
  }

  function exporterParJour() {
    exporterCsv(`ventes-par-jour-${periode}.csv`, parJour, [
      { cle: 'jour', titre: 'Jour' },
      { cle: 'commandes', titre: 'Commandes' },
      { cle: 'ca', titre: 'CA livré (HTG)' },
    ])
  }

  return (
    <>
      <EnTete titre="Rapports" sousTitre="Ventes et export CSV">
        <Bouton variante="clair" disabled={!commandes?.length} onClick={exporterParJour}>CSV ventes par jour</Bouton>
        <Bouton variante="rouge" disabled={!commandes?.length} onClick={exporterCommandes}>CSV commandes</Bouton>
      </EnTete>
      <Erreur message={erreur} />
      <div className="mb-4"><Filtres options={PERIODES} valeur={periode} onChange={setPeriode} /></div>

      {!commandes && !erreur && <Chargement />}
      {commandes && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Carte className="p-5"><div className="text-sm text-slate-500">Commandes</div><div className="text-2xl font-bold text-navy">{commandes.length}</div></Carte>
            <Carte className="p-5"><div className="text-sm text-slate-500">Livrées</div><div className="text-2xl font-bold text-navy">{nbLivrees}</div></Carte>
            <Carte className="p-5"><div className="text-sm text-slate-500">CA (livrées)</div><div className="text-2xl font-bold text-navy">{htg(ca)}</div></Carte>
          </div>

          <Carte className="mt-4 p-5">
            <h2 className="mb-4 font-semibold text-navy">Chiffre d'affaires par jour</h2>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={parJour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => htg(v)} />
                  <Line type="monotone" dataKey="ca" name="CA" stroke="#E63946" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Carte>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Carte className="p-5">
              <h2 className="mb-4 font-semibold text-navy">Commandes par jour</h2>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={parJour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                    <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="commandes" name="Commandes" fill="#0D2B5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Carte>
            <Carte className="p-5">
              <h2 className="mb-4 font-semibold text-navy">Meilleures boutiques (CA livré)</h2>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={topBoutiques} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => htg(v)} />
                    <Bar dataKey="total" name="CA" fill="#E63946" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Carte>
          </div>
        </>
      )}
    </>
  )
}
