-- Vendor self-service auth policies. Run after 0001/0002.
-- Lets a signed-in user create and manage exactly one vendor profile they own.

-- A user can create a vendor row only for themselves.
create policy "users create own vendor" on vendors for insert
  to authenticated
  with check (owner = auth.uid());

-- A user can update only their own vendor profile (settings, etc.).
create policy "users update own vendor" on vendors for update
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- One vendor profile per user.
create unique index if not exists vendors_owner_unique on vendors (owner)
  where owner is not null;
