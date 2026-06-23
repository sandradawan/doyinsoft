-- Harden redeem_gift_card: reject NULL orders (would bypass per-order
-- idempotency, since the unique ledger index is partial on order_id). Run after 0021.
create or replace function redeem_gift_card(p_code text, p_amount integer, p_order uuid)
returns integer language plpgsql as $$
declare v_id uuid; debited integer;
begin
  -- Require a real order so the redemption is always idempotent + auditable.
  if p_code is null or p_amount <= 0 or p_order is null then return 0; end if;
  select id into v_id from gift_cards where code = p_code;
  if v_id is null then return 0; end if;
  if exists (select 1 from gift_card_txns where gift_card_id = v_id and order_id = p_order) then
    return 0;
  end if;
  update gift_cards
     set balance_minor = balance_minor - p_amount,
         status = case when balance_minor - p_amount <= 0 then 'depleted' else status end
   where id = v_id and status = 'active'
     and (expires_at is null or expires_at > now())
     and balance_minor >= p_amount
  returning p_amount into debited;
  if debited is not null then
    insert into gift_card_txns (gift_card_id, order_id, amount_minor)
    values (v_id, p_order, -p_amount);
  end if;
  return coalesce(debited, 0);
end $$;
