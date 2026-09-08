-- Repair an existing ELECTRO-POS database created before checkout fields were added.
-- Run this in the Supabase SQL Editor, then retry the sale.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount_due numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'in_store';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_online_order boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS note text;

UPDATE public.sales
SET amount_due = GREATEST(total - amount_paid, 0),
    payment_status = CASE
      WHEN amount_paid >= total THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      ELSE 'credit'
    END,
    sale_type = COALESCE(sale_type, 'in_store'),
    is_online_order = COALESCE(is_online_order, false),
    delivery_method = COALESCE(delivery_method, 'pickup'),
    delivery_fee = COALESCE(delivery_fee, 0)
WHERE amount_due = 0 OR payment_status = 'paid';

NOTIFY pgrst, 'reload schema';