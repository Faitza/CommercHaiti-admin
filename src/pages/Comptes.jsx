import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/adminLog'
import { date } from '../lib/format'
import { Badge, Bouton, EnTete, Erreur, Filtres, Recherche, Tableau, Chargement } from '../components/ui'

// /vendeurs et /clients — même écran, filtré sur users.role.
// Liste + bloquer / débloquer le compte (users.is_blocked).
export default function Comptes({ role }) {
  const vendeurs = role === 'seller'
  const [comptes, setComptes] = useState(null)
  const [boutiques, setBoutiques] = useState({})
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(null)

  useEffect(() => {
    setComptes(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })
      if (error) return setErreur(error.message)
      if (vendeurs) {
        const shops = await supabase.from('shops').select('proprietaire_id, nom')
        if (!shops.error) setBoutiques(Object.fromEntries(shops.data.map((s) => [s.proprietaire_id, s.nom])))
      }
      setComptes(data)
    })()
  }, [role, vendeurs])

  async function basculerBlocage(u) {
    const bloquer = !u.is_blocked
    if (bloquer && !confirm(`Bloquer le compte de ${u.nom} ?`)) return
    setEnCours(u.id)
    const { error } = await supabase.from('users').update({ is_blocked: bloquer }).eq('id', u.id)
    if (error) setErreur(error.message)
    else {
      await logAction(bloquer ? `bloquer_${vendeurs ? 'vendeur' : 'client'}` : `debloquer_${vendeurs ? 'vendeur' : 'client'}`,
        u.id, { nom: u.nom, email: u.email })
      setComptes((l) => l.map((x) => (x.id === u.id ? { ...x, is_blocked: bloquer } : x)))
    }
    setEnCours(null)
  }

  const visibles = useMemo(() => {
    if (!comptes) return []
    const q = recherche.toLowerCase()
    return comptes.filter(
      (u) =>
        (filtre === 'tous' || (filtre === 'bloques') === u.is_blocked) &&
        [u.nom, u.email, u.telephone].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [comptes, filtre, recherche])

  if (!comptes && !erreur) return <Chargement />

  return (
    <>
      <EnTete titre={vendeurs ? 'Vendeurs' : 'Clients'} sousTitre={`${comptes?.length ?? 0} comptes`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, email ou téléphone…" />
      </EnTete>
      <Erreur message={erreur} />
      <div className="mb-4">
        <Filtres valeur={filtre} onChange={setFiltre}
          options={[['tous', 'Tous'], ['actifs', 'Actifs'], ['bloques', 'Bloqués']]} />
      </div>
      <Tableau
        lignes={visibles}
        colonnes={[
          { titre: 'Nom', rendu: (u) => <span className="font-semibold">{u.nom}</span> },
          { titre: 'Contact', rendu: (u) => <div>{u.email}<div className="text-xs text-slate-400">{u.telephone}</div></div> },
          vendeurs
            ? { titre: 'Boutique', rendu: (u) => boutiques[u.id] ?? <span className="text-slate-400">Aucune</span> }
            : { titre: 'Adresse', rendu: (u) => u.adresse || '—' },
          { titre: 'Inscrit le', rendu: (u) => date(u.created_at) },
          { titre: 'Statut', rendu: (u) => (u.is_blocked ? <Badge ton="rouge">Bloqué</Badge> : <Badge ton="vert">Actif</Badge>) },
          {
            titre: 'Actions',
            className: 'text-right',
            rendu: (u) => (
              <Bouton variante={u.is_blocked ? 'clair' : 'rouge'} disabled={enCours === u.id} onClick={() => basculerBlocage(u)}>
                {u.is_blocked ? 'Débloquer' : 'Bloquer'}
              </Bouton>
            ),
          },
        ]}
      />
    </>
  )
}
