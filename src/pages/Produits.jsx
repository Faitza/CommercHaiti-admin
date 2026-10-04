import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/adminLog'
import { htg } from '../lib/format'
import { Badge, Bouton, EnTete, Erreur, Filtres, Recherche, Tableau, Chargement } from '../components/ui'

// /produits — modération : masquer / réafficher / supprimer un produit.
export default function Produits() {
  const [produits, setProduits] = useState(null)
  const [boutiques, setBoutiques] = useState({})
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [p, s] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('shops').select('id, nom'),
      ])
      if (p.error || s.error) return setErreur((p.error ?? s.error).message)
      setBoutiques(Object.fromEntries(s.data.map((x) => [x.id, x.nom])))
      setProduits(p.data)
    })()
  }, [])

  async function masquer(p) {
    const motif = prompt(`Motif du masquage de « ${p.nom} » :`)
    if (motif === null) return
    setEnCours(p.id)
    const champs = { masque_admin: true, motif_moderation: motif.trim() || null }
    const { error } = await supabase.from('products').update(champs).eq('id', p.id)
    if (error) setErreur(error.message)
    else {
      await logAction('masquer_produit', p.id, { nom: p.nom, motif: champs.motif_moderation })
      setProduits((l) => l.map((x) => (x.id === p.id ? { ...x, ...champs } : x)))
    }
    setEnCours(null)
  }

  async function reafficher(p) {
    setEnCours(p.id)
    const champs = { masque_admin: false, motif_moderation: null }
    const { error } = await supabase.from('products').update(champs).eq('id', p.id)
    if (error) setErreur(error.message)
    else {
      await logAction('reafficher_produit', p.id, { nom: p.nom })
      setProduits((l) => l.map((x) => (x.id === p.id ? { ...x, ...champs } : x)))
    }
    setEnCours(null)
  }

  async function supprimer(p) {
    if (!confirm(`Supprimer définitivement « ${p.nom} » ?`)) return
    setEnCours(p.id)
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) {
      // order_items.product_id référence products : un produit déjà commandé
      // ne peut pas être supprimé.
      setErreur(
        error.code === '23503'
          ? `« ${p.nom} » figure dans des commandes : masquez-le plutôt que de le supprimer.`
          : error.message,
      )
    } else {
      await logAction('supprimer_produit', p.id, { nom: p.nom, boutique: boutiques[p.shop_id] })
      setProduits((l) => l.filter((x) => x.id !== p.id))
    }
    setEnCours(null)
  }

  const visibles = useMemo(() => {
    if (!produits) return []
    const q = recherche.toLowerCase()
    return produits.filter(
      (p) =>
        (filtre === 'tous' || (filtre === 'masques') === p.masque_admin) &&
        `${p.nom} ${p.categorie} ${boutiques[p.shop_id] ?? ''}`.toLowerCase().includes(q),
    )
  }, [produits, filtre, recherche, boutiques])

  if (!produits && !erreur) return <Chargement />

  return (
    <>
      <EnTete titre="Produits" sousTitre={`${produits?.length ?? 0} produits`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Produit, catégorie, boutique…" />
      </EnTete>
      <Erreur message={erreur} />
      <div className="mb-4">
        <Filtres valeur={filtre} onChange={setFiltre}
          options={[['tous', 'Tous'], ['visibles', 'Visibles'], ['masques', 'Masqués']]} />
      </div>
      <Tableau
        lignes={visibles}
        colonnes={[
          {
            titre: 'Produit',
            rendu: (p) => (
              <div className="flex items-center gap-3">
                {p.photos?.[0]
                  ? <img src={p.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  : <div className="h-12 w-12 rounded-lg bg-slate-100" />}
                <div>
                  <div className="font-semibold">{p.nom}</div>
                  <div className="text-xs text-slate-400">{p.categorie}{p.sous_categorie ? ` › ${p.sous_categorie}` : ''}</div>
                </div>
              </div>
            ),
          },
          { titre: 'Boutique', rendu: (p) => boutiques[p.shop_id] ?? '—' },
          {
            titre: 'Prix',
            className: 'whitespace-nowrap',
            rendu: (p) => (p.prix_promo ? <>{htg(p.prix_promo)} <s className="text-xs text-slate-400">{htg(p.prix)}</s></> : htg(p.prix)),
          },
          { titre: 'Stock', rendu: (p) => p.stock },
          {
            titre: 'Statut',
            rendu: (p) =>
              p.masque_admin ? (
                <div><Badge ton="rouge">Masqué</Badge>{p.motif_moderation && <div className="mt-1 text-xs text-slate-500">{p.motif_moderation}</div>}</div>
              ) : (
                <Badge ton="vert">Visible</Badge>
              ),
          },
          {
            titre: 'Actions',
            className: 'text-right whitespace-nowrap',
            rendu: (p) => (
              <div className="flex justify-end gap-2">
                {p.masque_admin
                  ? <Bouton variante="clair" disabled={enCours === p.id} onClick={() => reafficher(p)}>Réafficher</Bouton>
                  : <Bouton variante="navy" disabled={enCours === p.id} onClick={() => masquer(p)}>Masquer</Bouton>}
                <Bouton variante="rouge" disabled={enCours === p.id} onClick={() => supprimer(p)}>Supprimer</Bouton>
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
