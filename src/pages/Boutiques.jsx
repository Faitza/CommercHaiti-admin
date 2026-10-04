import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/adminLog'
import { date } from '../lib/format'
import { Badge, Bouton, EnTete, Erreur, Filtres, Recherche, Tableau, Chargement } from '../components/ui'

const STATUTS = {
  en_attente: ['ambre', 'En attente'],
  approuvee: ['vert', 'Approuvée'],
  suspendue: ['rouge', 'Suspendue'],
}

// /boutiques — liste + approuver / suspendre.
export default function Boutiques() {
  const [boutiques, setBoutiques] = useState(null)
  const [proprietaires, setProprietaires] = useState({})
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(null)

  async function charger() {
    const [{ data, error }, vendeurs] = await Promise.all([
      supabase.from('shops').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, nom, telephone').eq('role', 'seller'),
    ])
    if (error || vendeurs.error) return setErreur((error ?? vendeurs.error).message)
    // shops.proprietaire_id référence auth.users : jointure faite ici.
    setProprietaires(Object.fromEntries(vendeurs.data.map((u) => [u.id, u])))
    setBoutiques(data)
  }

  useEffect(() => {
    charger()
  }, [])

  async function changerStatut(b, statut, action) {
    if (statut === 'suspendue' && !confirm(`Suspendre la boutique « ${b.nom} » ?`)) return
    setEnCours(b.id)
    const { error } = await supabase.from('shops').update({ statut_validation: statut }).eq('id', b.id)
    if (error) setErreur(error.message)
    else {
      await logAction(action, b.id, { nom: b.nom, avant: b.statut_validation, apres: statut })
      setBoutiques((l) => l.map((x) => (x.id === b.id ? { ...x, statut_validation: statut } : x)))
    }
    setEnCours(null)
  }

  const visibles = useMemo(() => {
    if (!boutiques) return []
    const q = recherche.toLowerCase()
    return boutiques.filter(
      (b) =>
        (filtre === 'tous' || b.statut_validation === filtre) &&
        (b.nom.toLowerCase().includes(q) || b.shop_code.toLowerCase().includes(q)),
    )
  }, [boutiques, filtre, recherche])

  if (!boutiques && !erreur) return <Chargement />

  return (
    <>
      <EnTete titre="Boutiques" sousTitre={`${boutiques?.length ?? 0} boutiques`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou code boutique…" />
      </EnTete>
      <Erreur message={erreur} />
      <div className="mb-4">
        <Filtres
          valeur={filtre}
          onChange={setFiltre}
          options={[['tous', 'Toutes'], ['en_attente', 'En attente'], ['approuvee', 'Approuvées'], ['suspendue', 'Suspendues']]}
        />
      </div>
      <Tableau
        lignes={visibles}
        colonnes={[
          {
            titre: 'Boutique',
            rendu: (b) => (
              <div>
                <div className="font-semibold">{b.nom}</div>
                <div className="text-xs text-slate-400">{b.shop_code}</div>
              </div>
            ),
          },
          {
            titre: 'Vendeur',
            rendu: (b) => {
              const p = proprietaires[b.proprietaire_id]
              return p ? <div>{p.nom}<div className="text-xs text-slate-400">{p.telephone}</div></div> : '—'
            },
          },
          { titre: 'Catégories', rendu: (b) => (b.categories?.length ? b.categories.join(', ') : '—') },
          { titre: 'Note', rendu: (b) => `★ ${Number(b.rating).toFixed(1)} (${b.total_avis})` },
          { titre: 'Créée le', rendu: (b) => date(b.created_at) },
          {
            titre: 'Statut',
            rendu: (b) => {
              const [ton, libelle] = STATUTS[b.statut_validation] ?? ['gris', b.statut_validation]
              return <Badge ton={ton}>{libelle}</Badge>
            },
          },
          {
            titre: 'Actions',
            className: 'text-right whitespace-nowrap',
            rendu: (b) => (
              <div className="flex justify-end gap-2">
                {b.statut_validation !== 'approuvee' && (
                  <Bouton variante="vert" disabled={enCours === b.id}
                    onClick={() => changerStatut(b, 'approuvee', b.statut_validation === 'suspendue' ? 'reactiver_boutique' : 'approuver_boutique')}>
                    {b.statut_validation === 'suspendue' ? 'Réactiver' : 'Approuver'}
                  </Bouton>
                )}
                {b.statut_validation !== 'suspendue' && (
                  <Bouton variante="rouge" disabled={enCours === b.id}
                    onClick={() => changerStatut(b, 'suspendue', 'suspendre_boutique')}>
                    Suspendre
                  </Bouton>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
