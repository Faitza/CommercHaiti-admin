-- ════════════════════════════════════════════════════════════════
-- CommercHaiti Admin — migration Supabase
-- À exécuter UNE fois dans Supabase → SQL Editor (même base que l'app
-- mobile), après schema.sql / functions.sql de l'app.
--
-- 1. rôle 'admin' dans users
-- 2. table admin_logs
-- 3. colonnes de modération (boutiques, comptes, produits, litiges)
-- 4. fonction is_admin() + politiques RLS donnant aux admins l'accès
--    nécessaire au panneau d'administration
-- ════════════════════════════════════════════════════════════════

-- ─── 1. Rôle admin ──────────────────────────────────────────────
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check check (role in ('seller', 'customer', 'admin'));

-- ─── 2. Journal des actions admin ───────────────────────────────
create table if not exists public.admin_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  action      text not null,        -- ex : 'approuver_boutique'
  target_id   uuid,                 -- id de la boutique / du compte / etc.
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_admin_logs_created on public.admin_logs(created_at desc);

-- ─── 3. Colonnes de modération ──────────────────────────────────
-- Boutiques : en_attente → approuvee / suspendue
alter table public.shops
  add column if not exists statut_validation text not null default 'en_attente'
    check (statut_validation in ('en_attente', 'approuvee', 'suspendue'));
-- Les boutiques déjà existantes sont considérées comme approuvées.
-- (À n'exécuter qu'avec cette migration : les boutiques créées ensuite
-- restent en attente d'approbation.)
update public.shops set statut_validation = 'approuvee'
 where statut_validation = 'en_attente';

-- Comptes (vendeurs et clients) : blocage
alter table public.users
  add column if not exists is_blocked boolean not null default false;

-- Produits : masquage par un admin (modération)
alter table public.products
  add column if not exists masque_admin boolean not null default false,
  add column if not exists motif_moderation text;

-- Commandes : litiges
alter table public.orders
  add column if not exists litige_statut text
    check (litige_statut in ('ouvert', 'resolu')),
  add column if not exists litige_motif text,
  add column if not exists litige_resolution text;

-- ─── 4. Accès admin (RLS) ───────────────────────────────────────
-- SECURITY DEFINER : lit users sans repasser par la RLS (évite une
-- récursion dans les politiques de users).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and not is_blocked
  );
$$;

alter table public.admin_logs enable row level security;

drop policy if exists "admin_logs_select_admin" on public.admin_logs;
create policy "admin_logs_select_admin" on public.admin_logs
  for select using (public.is_admin());
drop policy if exists "admin_logs_insert_admin" on public.admin_logs;
create policy "admin_logs_insert_admin" on public.admin_logs
  for insert with check (public.is_admin() and admin_id = auth.uid());

-- USERS : un admin lit tous les profils et peut bloquer / débloquer
drop policy if exists "users_select_admin" on public.users;
create policy "users_select_admin" on public.users
  for select using (public.is_admin());
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users
  for update using (public.is_admin());

-- SHOPS : approuver / suspendre
drop policy if exists "shops_update_admin" on public.shops;
create policy "shops_update_admin" on public.shops
  for update using (public.is_admin());

-- PRODUCTS : masquer / supprimer
drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin" on public.products
  for update using (public.is_admin());
drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ORDERS / ORDER_ITEMS : lecture de toutes les commandes, résolution des litiges
drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select using (public.is_admin());
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());
drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select using (public.is_admin());

-- ─── Empêcher un utilisateur de se promouvoir admin ─────────────
-- La politique "users_update_own" laisse chacun modifier son profil :
-- ce trigger interdit à un non-admin de changer role ou is_blocked.
create or replace function public.protect_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.is_blocked is distinct from old.is_blocked)
     and auth.uid() is not null          -- SQL Editor / service_role : autorisé
     and not public.is_admin() then
    raise exception 'Modification du rôle ou du blocage réservée aux admins';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_role on public.users;
create trigger trg_protect_user_role
before update on public.users
for each row execute function public.protect_user_role();

-- Même protection à l'inscription : impossible de créer son profil
-- directement avec role = 'admin'.
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id and role in ('seller', 'customer'));

-- ─── Nommer les admins (Faitza et Falexson) ─────────────────────
-- Leurs comptes doivent exister dans auth.users ET dans public.users
-- (le plus simple : s'inscrire une fois dans l'app mobile). Ensuite,
-- exécuter dans le SQL Editor en remplaçant les emails (auth.uid() y est
-- null, donc le trigger ci-dessus laisse passer) :
-- update public.users set role = 'admin'
--  where email in ('faitza@exemple.com', 'falexson@exemple.com');
