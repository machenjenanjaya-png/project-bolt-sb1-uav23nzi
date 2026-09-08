/*
# POS System Schema

Creates the complete database schema for a professional Point of Sale system.

## Tables

1. **categories** — Product categories (e.g. Beverages, Food, Electronics)
   - id, name, description, created_at, created_by

2. **products** — Product inventory with stock tracking
   - id, name, sku, barcode, price, cost, stock, min_stock, category_id, image_url, is_active, created_at, updated_at, created_by

3. **customers** — Customer management
   - id, name, email, phone, address, loyalty_points, created_at, created_by

4. **sales** — Sales transactions (header)
   - id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_due, customer_id, cashier_id, status, created_at

5. **sale_items** — Line items for each sale
   - id, sale_id, product_id, product_name, quantity, unit_price, line_total

## Security
- RLS enabled on all tables
- All policies scoped TO authenticated (login required)
- All authenticated staff share access to business data (shared POS)
- created_by and cashier_id columns default to auth.uid() for audit trail

## Notes
- Stock is decremented via trigger when sale_items are inserted
- Trigger prevents negative stock
- Tax rate stored as setting (default 0% — configurable)
*/

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categories" ON categories;
CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_categories" ON categories;
CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_categories" ON categories;
CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_categories" ON categories;
CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  barcode text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE
  TO authenticated USING (true);

-- ============ CUSTOMERS ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  loyalty_points integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============ SALES ============
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  amount_due numeric(12,2) NOT NULL DEFAULT 0,
  change_due numeric(12,2) NOT NULL DEFAULT 0,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  payment_status text NOT NULL DEFAULT 'paid',
  sale_type text NOT NULL DEFAULT 'in_store',
  is_online_order boolean NOT NULL DEFAULT false,
  delivery_method text,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_due numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'in_store';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_online_order boolean NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS note text;

UPDATE sales
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

DROP POLICY IF EXISTS "select_sales" ON sales;
CREATE POLICY "select_sales" ON sales FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sales" ON sales;
CREATE POLICY "insert_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sales" ON sales;
CREATE POLICY "update_sales" ON sales FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sales" ON sales;
CREATE POLICY "delete_sales" ON sales FOR DELETE
  TO authenticated USING (true);

-- ============ SALE ITEMS ============
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sale_items" ON sale_items;
CREATE POLICY "select_sale_items" ON sale_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sale_items" ON sale_items;
CREATE POLICY "insert_sale_items" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sale_items" ON sale_items;
CREATE POLICY "update_sale_items" ON sale_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sale_items" ON sale_items;
CREATE POLICY "delete_sale_items" ON sale_items FOR DELETE
  TO authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ============ STOCK DECREMENT TRIGGER ============
-- When a sale_item is inserted, decrement product stock and prevent negative stock
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent negative stock
  IF (SELECT stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_name;
  END IF;
  
  UPDATE products
  SET stock = stock - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_decrement_stock ON sale_items;
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock();

-- ============ STOCK RESTORE ON SALE ITEM DELETE ============
-- If a sale is voided/deleted, restore stock
CREATE OR REPLACE FUNCTION restore_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock = stock + OLD.quantity,
      updated_at = now()
  WHERE id = OLD.product_id;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_restore_stock ON sale_items;
CREATE TRIGGER trigger_restore_stock
  AFTER DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock();

-- ============ AUTO-UPDATE updated_at ON PRODUCTS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
