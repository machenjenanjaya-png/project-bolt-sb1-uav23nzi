import { useEffect, useMemo, useState } from 'react';
import { MapPin, Minus, Package, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { supabase, type CartItem, type Product } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

type CustomerStorePageProps = {
  onAdminView?: () => void;
};

type OrderForm = {
  name: string;
  phone: string;
  address: string;
  paymentMethod: string;
  deliveryMethod: 'pickup' | 'yango' | 'etrc' | 'courier';
};

const emptyOrder: OrderForm = {
  name: '',
  phone: '',
  address: '',
  paymentMethod: 'cash',
  deliveryMethod: 'pickup',
};

const paymentOptions = [
  { id: 'cash', label: 'Cash on delivery' },
  { id: 'airtel_money', label: 'Airtel Money' },
  { id: 'mtn_money', label: 'MTN Money' },
  { id: 'zamtel_money', label: 'Zamtel Money' },
  { id: 'kazang', label: 'Kazang' },
  { id: 'bank_transfer', label: 'Bank transfer' },
];

export function CustomerStorePage({ onAdminView }: CustomerStorePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [order, setOrder] = useState<OrderForm>(emptyOrder);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).gt('stock', 0).order('name');
    setProducts(data ?? []);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query));
  }, [products, search]);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return current;
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) => current.map((item) => {
      if (item.product.id !== productId) return item;
      return { ...item, quantity: Math.min(item.product.stock, item.quantity + delta) };
    }).filter((item) => item.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const deliveryFee = order.deliveryMethod === 'pickup' ? 0 : 18;
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    setError(null);
    setMessage(null);
    if (!order.name.trim() || !order.phone.trim()) {
      setError('Please enter your name and phone number.');
      return;
    }
    if (order.deliveryMethod !== 'pickup' && !order.address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      const { data: existingCustomer, error: customerLookupError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', order.phone.trim())
        .maybeSingle();
      if (customerLookupError) throw customerLookupError;

      let customerId = existingCustomer?.id ?? null;
      if (customerId) {
        const { error: customerUpdateError } = await supabase.from('customers').update({
          name: order.name.trim(),
          address: order.address.trim() || null,
        }).eq('id', customerId);
        if (customerUpdateError) throw customerUpdateError;
      } else {
        const { data: newCustomer, error: customerInsertError } = await supabase.from('customers').insert({
          name: order.name.trim(),
          phone: order.phone.trim(),
          address: order.address.trim() || null,
        }).select('id').single();
        if (customerInsertError) throw customerInsertError;
        customerId = newCustomer.id;
      }

      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        subtotal,
        tax_amount: 0,
        discount_amount: 0,
        total,
        payment_method: order.paymentMethod,
        amount_paid: order.paymentMethod === 'cash' ? 0 : total,
        amount_due: order.paymentMethod === 'cash' ? total : 0,
        change_due: 0,
        customer_id: customerId,
        status: 'completed',
        payment_status: order.paymentMethod === 'cash' ? 'credit' : 'paid',
        sale_type: 'online',
        is_online_order: true,
        delivery_method: order.deliveryMethod,
        delivery_fee: deliveryFee,
        note: `Customer order for ${order.name.trim()} (${order.phone.trim()})`,
      }).select().single();
      if (saleError) throw saleError;

      const items = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        line_total: Number(item.product.price) * item.quantity,
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) {
        await supabase.from('sales').delete().eq('id', sale.id);
        throw itemsError;
      }

      setCart([]);
      setShowCheckout(false);
      setOrder(emptyOrder);
      setMessage(`Order ${sale.id.slice(0, 8).toUpperCase()} placed successfully.`);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f5] text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-emerald-400 text-xs font-bold tracking-[0.2em]">ELECTRO-POS MARKET</p>
            <h1 className="text-2xl font-bold mt-1">Shop online, collect or deliver</h1>
          </div>
          {onAdminView && (
            <button onClick={onAdminView} className="px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-800">
              Admin View
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-sm text-emerald-700 font-semibold">Customer storefront</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1">Fresh stock, ready when you are.</h2>
            <p className="text-slate-500 mt-2">Browse available products and place an order for pickup or delivery.</p>
          </div>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        {message && <div className="mb-5 rounded-xl bg-emerald-100 text-emerald-800 px-4 py-3 text-sm font-medium">{message}</div>}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <article key={product.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5"><Package className="w-6 h-6 text-emerald-600" /></div>
                <p className="font-semibold text-slate-900 min-h-12">{product.name}</p>
                <div className="flex items-end justify-between mt-5 gap-3">
                  <div><p className="text-xl font-bold text-emerald-700">{formatCurrency(Number(product.price))}</p><p className="text-xs text-slate-400 mt-1">{product.stock} available</p></div>
                  <button onClick={() => addToCart(product)} className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center hover:bg-emerald-700" title="Add to cart"><Plus className="w-5 h-5" /></button>
                </div>
              </article>
            ))}
          </div>

          <aside className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:sticky lg:top-5">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-lg">Your basket</h3><ShoppingBag className="w-5 h-5 text-emerald-600" /></div>
            {cart.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Your basket is empty.</p> : <div className="space-y-4">
              {cart.map((item) => <div key={item.product.id} className="flex items-center gap-3"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.product.name}</p><p className="text-xs text-slate-400">{formatCurrency(Number(item.product.price))}</p></div><button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="text-sm font-bold w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button></div>)}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrency(deliveryFee)}</span></div><div className="flex justify-between text-lg font-bold pt-2"><span>Total</span><span className="text-emerald-700">{formatCurrency(total)}</span></div></div>
              <button onClick={() => setShowCheckout(true)} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Continue to checkout</button>
            </div>}
          </aside>
        </div>
      </main>

      {showCheckout && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-bold text-lg">Complete your order</h2><button onClick={() => setShowCheckout(false)}><X className="w-5 h-5 text-slate-400" /></button></div><div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3"><input placeholder="Full name" value={order.name} onChange={(event) => setOrder({ ...order, name: event.target.value })} className="px-3 py-3 rounded-lg border border-slate-300" /><input placeholder="Phone number" value={order.phone} onChange={(event) => setOrder({ ...order, phone: event.target.value })} className="px-3 py-3 rounded-lg border border-slate-300" /></div>
        <div className="grid grid-cols-2 gap-2">{(['pickup', 'yango', 'etrc', 'courier'] as const).map((method) => <button key={method} onClick={() => setOrder({ ...order, deliveryMethod: method })} className={`py-3 rounded-lg border text-sm font-medium capitalize ${order.deliveryMethod === method ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{method === 'pickup' ? 'Store pickup' : method}</button>)}</div>
        {order.deliveryMethod !== 'pickup' && <div className="relative"><MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><textarea placeholder="Delivery address" value={order.address} onChange={(event) => setOrder({ ...order, address: event.target.value })} rows={2} className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-300" /></div>}
        <div><p className="text-xs uppercase font-bold tracking-wide text-slate-500 mb-2">Payment method</p><div className="grid sm:grid-cols-2 gap-2">{paymentOptions.map((payment) => <button key={payment.id} onClick={() => setOrder({ ...order, paymentMethod: payment.id })} className={`py-3 rounded-lg border text-sm text-left px-3 ${order.paymentMethod === payment.id ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold' : 'border-slate-200 text-slate-600'}`}>{payment.label}</button>)}</div></div>
        {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>}
        <button onClick={placeOrder} disabled={processing} className="w-full py-3 rounded-xl bg-slate-950 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60">{processing ? 'Placing order...' : `Place order · ${formatCurrency(total)}`}</button>
      </div></div></div>}
    </div>
  );
}
