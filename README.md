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

## Couleurs

Navy `#0D2B5E` · Rouge `#E63946` (définies dans `src/index.css`).
