import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/adminLog'
import { dateHeure, htg, STATUTS_COMMANDE } from '../lib/format'
import { Badge, Bouton, Carte, EnTete, Erreur, Filtres, Recherche, Tableau, Chargement } from '../components/ui'

const TON_STATUT = {
  nouvelle: 'navy', acceptee: 'navy', preparation: 'ambre', livraison: 'ambre', livree: 'vert', annulee: 'gris',
}

// /commandes — toutes les commandes + gestion des litiges.
export default function Commandes() {
  const [commandes, setCommandes] = useState(null)
  const [noms, setNoms] = useState({ users: {}, shops: {} })
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [cmd, users, shops] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
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
  }, [])

  const majLocale = (id, champs) => {
    setCommandes((l) => l.map((c) => (c.id === id ? { ...c, ...champs } : c)))
    setSelection((s) => (s?.id === id ? { ...s, ...champs } : s))
  }

  const visibles = useMemo(() => {
    if (!commandes) return []
    const q = recherche.toLowerCase()
    return commandes.filter((c) => {
      const okFiltre =
        filtre === 'tous' ||
        (filtre === 'litiges' ? c.litige_statut === 'ouvert' : c.statut === filtre)
      const texte = `${c.id} ${noms.users[c.client_id] ?? ''} ${noms.shops[c.shop_id] ?? ''} ${c.telephone_client}`
      return okFiltre && texte.toLowerCase().includes(q)
    })
  }, [commandes, filtre, recherche, noms])

  if (!commandes && !erreur) return <Chargement />
  const nbLitiges = commandes?.filter((c) => c.litige_statut === 'ouvert').length ?? 0

  return (
    <>
      <EnTete titre="Commandes" sousTitre={`${commandes?.length ?? 0} commandes · ${nbLitiges} litige(s) ouvert(s)`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="N°, client, boutique, téléphone…" />
      </EnTete>
      <Erreur message={erreur} />
      <div className="mb-4">
        <Filtres valeur={filtre} onChange={setFiltre}
          options={[['tous', 'Toutes'], ['litiges', `Litiges (${nbLitiges})`], ...Object.entries(STATUTS_COMMANDE)]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Tableau
          lignes={visibles}
          colonnes={[
            { titre: 'N°', rendu: (c) => <span className="font-mono text-xs">{c.id.slice(0, 8)}</span> },
            { titre: 'Date', rendu: (c) => dateHeure(c.created_at) },
            { titre: 'Client', rendu: (c) => noms.users[c.client_id] ?? '—' },
            { titre: 'Boutique', rendu: (c) => noms.shops[c.shop_id] ?? '—' },
            { titre: 'Total', rendu: (c) => htg(c.total), className: 'whitespace-nowrap' },
            {
              titre: 'Statut',
              rendu: (c) => (
                <div className="flex flex-col items-start gap-1">
                  <Badge ton={TON_STATUT[c.statut]}>{STATUTS_COMMANDE[c.statut] ?? c.statut}</Badge>
                  {c.litige_statut === 'ouvert' && <Badge ton="rouge">Litige ouvert</Badge>}
                  {c.litige_statut === 'resolu' && <Badge ton="gris">Litige résolu</Badge>}
                </div>
              ),
            },
            {
              titre: '',
              className: 'text-right',
              rendu: (c) => <Bouton variante="clair" onClick={() => setSelection(c)}>Détail</Bouton>,
            },
          ]}
        />
        {selection && (
          <DetailCommande
            commande={selection}
            client={noms.users[selection.client_id]}
            boutique={noms.shops[selection.shop_id]}
            onFermer={() => setSelection(null)}
            onMaj={majLocale}
            onErreur={setErreur}
          />
        )}
      </div>
    </>
  )
}

function DetailCommande({ commande: c, client, boutique, onFermer, onMaj, onErreur }) {
  const [articles, setArticles] = useState([])
  const [motif, setMotif] = useState('')
  const [resolution, setResolution] = useState('')
  const [annuler, setAnnuler] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    setMotif('')
    setResolution('')
    setAnnuler(false)
    supabase.from('order_items').select('*').eq('order_id', c.id).then(({ data }) => setArticles(data ?? []))
  }, [c.id])

  // Ouvre un litige (signalé par un client ou un vendeur, ex. par téléphone).
  async function ouvrirLitige() {
    if (!motif.trim()) return
    setEnvoi(true)
    const champs = { litige_statut: 'ouvert', litige_motif: motif.trim(), litige_resolution: null }
    const { error } = await supabase.from('orders').update(champs).eq('id', c.id)
    if (error) onErreur(error.message)
    else {
      await logAction('ouvrir_litige', c.id, { motif: motif.trim() })
      onMaj(c.id, champs)
    }
    setEnvoi(false)
  }

  async function resoudre() {
    if (!resolution.trim()) return
    setEnvoi(true)
    const champs = {
      litige_statut: 'resolu',
      litige_resolution: resolution.trim(),
      ...(annuler ? { statut: 'annulee' } : {}),
    }
    const { error } = await supabase.from('orders').update(champs).eq('id', c.id)
    if (error) onErreur(error.message)
    else {
      await logAction('resoudre_litige', c.id, { resolution: resolution.trim(), commande_annulee: annuler })
      onMaj(c.id, champs)
    }
    setEnvoi(false)
  }

  return (
    <Carte className="p-5 h-fit xl:sticky xl:top-8">
      <div className="flex justify-between">
        <h2 className="font-bold text-navy">Commande {c.id.slice(0, 8)}</h2>
        <button onClick={onFermer} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">✕</button>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div><dt className="inline text-slate-500">Client : </dt><dd className="inline">{client ?? '—'} · {c.telephone_client}</dd></div>
        <div><dt className="inline text-slate-500">Boutique : </dt><dd className="inline">{boutique ?? '—'}</dd></div>
        <div><dt className="inline text-slate-500">Livraison : </dt><dd className="inline">{c.adresse_livraison} ({c.zone})</dd></div>
        <div><dt className="inline text-slate-500">Statut : </dt><dd className="inline">{STATUTS_COMMANDE[c.statut]}</dd></div>
      </dl>

      <div className="mt-4 divide-y divide-slate-100 text-sm">
        {articles.map((a) => (
          <div key={a.id} className="flex justify-between py-1.5">
            <span>{a.quantite} × {a.nom}{a.taille ? ` (${a.taille})` : ''}</span>
            <span>{htg(a.prix * a.quantite)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 font-bold"><span>Total</span><span>{htg(c.total)}</span></div>
      </div>

      <div className="mt-4 rounded-lg bg-fond p-3 text-sm">
        <div className="font-semibold text-navy">Litige</div>
        {!c.litige_statut && (
          <>
            <p className="mt-1 text-slate-500">Aucun litige sur cette commande.</p>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2}
              placeholder="Motif (ex. produit non reçu)…"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 outline-none focus:border-navy" />
            <Bouton variante="rouge" className="mt-2" disabled={envoi || !motif.trim()} onClick={ouvrirLitige}>
              Ouvrir un litige
            </Bouton>
          </>
        )}
        {c.litige_statut && (
          <p className="mt-1"><span className="text-slate-500">Motif : </span>{c.litige_motif || '—'}</p>
        )}
        {c.litige_statut === 'ouvert' && (
          <>
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3}
              placeholder="Décision / résolution…"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 outline-none focus:border-navy" />
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={annuler} onChange={(e) => setAnnuler(e.target.checked)} />
              Annuler la commande
            </label>
            <Bouton variante="vert" className="mt-2" disabled={envoi || !resolution.trim()} onClick={resoudre}>
              Marquer comme résolu
            </Bouton>
          </>
        )}
        {c.litige_statut === 'resolu' && (
          <p className="mt-1"><span className="text-slate-500">Résolution : </span>{c.litige_resolution}</p>
        )}
      </div>
    </Carte>
  )
}
