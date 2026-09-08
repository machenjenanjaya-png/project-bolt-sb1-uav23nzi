import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  loyalty_points: number;
  notes: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  amount_due: number;
  change_due: number;
  customer_id: string | null;
  cashier_id: string | null;
  status: string;
  payment_status: string;
  sale_type: string;
  is_online_order: boolean;
  delivery_method: string | null;
  delivery_fee: number;
  note: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};
