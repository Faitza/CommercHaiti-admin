# CommercHaiti Admin

Application web d'administration de **CommercHaiti** (marketplace Les Cayes), réservée aux admins.
React + Tailwind CSS + Supabase (même base que l'app mobile), hébergée sur Vercel.

## Écrans

| Route | Rôle |
|---|---|
| `/login` | Connexion — seuls les comptes `users.role = 'admin'` sont acceptés |
| `/dashboard` | Statistiques globales : boutiques, clients, commandes, CA total (commandes livrées), dernières actions admin |
| `/boutiques` | Liste + approuver / suspendre / réactiver |
| `/vendeurs` | Liste + bloquer / débloquer |
| `/clients` | Liste + bloquer / débloquer |
| `/commandes` | Toutes les commandes, détail, ouverture et résolution des litiges |
| `/produits` | Modération : masquer (avec motif) / réafficher / supprimer |
| `/rapports` | Graphiques de ventes (7 / 30 / 90 jours / tout) + export CSV |

Chaque action admin est enregistrée dans la table `admin_logs`.

## Installation

1. **Base de données** : dans Supabase → SQL Editor, exécuter `supabase/admin_migration.sql`
   (rôle `admin`, table `admin_logs`, colonnes de modération, politiques RLS admin).
2. **Nommer les admins** : leurs comptes doivent exister (inscription via l'app mobile), puis :
   ```sql
   update public.users set role = 'admin' where email in ('…', '…');
   ```
3. **Local** :
   ```bash
   cp .env.example .env   # remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
   npm install
   npm run dev
   ```

## Déploiement Vercel (gratuit)

1. vercel.com → *Add New Project* → importer ce dépôt GitHub (framework détecté : Vite).
2. *Environment Variables* : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. *Deploy*. `vercel.json` redirige toutes les routes vers `index.html` (navigation SPA).

## Lien produit partagé (`/p/<id>`)

Le message WhatsApp de l'app mobile contient `https://commerc-haiti-admin.vercel.app/p/<id>`.
`vercel.json` envoie ces liens vers la fonction `api/produit.js`, qui affiche une page publique
du produit (photo, prix, boutique, « RUPTURE DE STOCK » si le stock est à 0) avec les boutons
« Ouvrir dans l'app » (Android) et « Télécharger l'app ». Elle lit Supabase avec la clé anon
(mêmes variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).

Pour que le lien ouvre l'app **directement** (sans passer par cette page), ajouter
`public/.well-known/assetlinks.json` avec l'empreinte SHA-256 de la clé de signature de l'app :
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.commerchaiti",
    "sha256_cert_fingerprints": ["AA:BB:…"]
  }
}]
```

## Couleurs

Navy `#0D2B5E` · Rouge `#E63946` (définies dans `src/index.css`).
