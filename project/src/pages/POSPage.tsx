import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt as ReceiptIcon,
  Check,
  Printer,
  User,
  Package,
} from 'lucide-react';
import { supabase, type Product, type Category, type Customer, type CartItem } from '../lib/supabase';
import { formatCurrency, formatDateTime } from '../lib/format';

const TAX_RATE = 0;

const paymentOptions = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'airtel_money', label: 'Airtel Money', icon: Smartphone },
  { id: 'mtn_money', label: 'MTN Money', icon: Smartphone },
  { id: 'zamtel_money', label: 'Zamtel Money', icon: Smartphone },
  { id: 'kazang', label: 'Kazang', icon: CreditCard },
  { id: 'zanaco', label: 'Zanaco', icon: Banknote },
  { id: 'fnb', label: 'FNB', icon: CreditCard },
  { id: 'absa', label: 'ABSA', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: CreditCard },
  { id: 'pioneer', label: 'Pioneer', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Banknote },
  { id: 'credit', label: 'Credit / Due', icon: User },
] as const;

const deliveryOptions = ['pickup', 'yango', 'etrc', 'courier'] as const;

type SaleType = 'in_store' | 'delivery' | 'online';

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>('in_store');
  const [deliveryMethod, setDeliveryMethod] = useState<(typeof deliveryOptions)[number]>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentOptions)[number]['id']>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prodRes, catRes, custRes] = await Promise.all([
      supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ]);
    setProducts(prodRes.data ?? []);
    setCategories(catRes.data ?? []);
    setCustomers(custRes.data ?? []);
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.stock) return c;
          return { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount('');
    setAmountPaid('');
    setNote('');
    setSaleType('in_store');
    setDeliveryMethod('pickup');
  };

  const deliveryFee =
    saleType === 'in_store' ? 0 : deliveryMethod === 'pickup' ? 0 : saleType === 'online' ? 25 : 18;

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount + deliveryFee);
  const taxAmount = taxableAmount * TAX_RATE;
  const total = taxableAmount + taxAmount;
  const paid = parseFloat(amountPaid) || 0;
  const amountDue = Math.max(0, total - paid);
  const changeDue = Math.max(0, paid - total);

  const completeSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError(null);

    try {
      const stockProblem = cart.find((item) => item.quantity > item.product.stock);
      if (stockProblem) {
        throw new Error(
          `Not enough stock for ${stockProblem.product.name}. Only ${stockProblem.product.stock} available.`,
        );
      }

      const normalizedAmountPaid = paymentMethod === 'credit' ? 0 : Math.min(paid, total);
      const normalizedAmountDue = paymentMethod === 'credit' ? total : Math.max(total - normalizedAmountPaid, 0);
      const normalizedChange = paymentMethod === 'credit' ? 0 : Math.max(paid - total, 0);
      const normalizedStatus = normalizedAmountDue > 0 ? (normalizedAmountPaid > 0 ? 'partial' : 'credit') : 'paid';

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total,
          payment_method: paymentMethod,
          amount_paid: normalizedAmountPaid,
          amount_due: normalizedAmountDue,
          change_due: normalizedChange,
          customer_id: selectedCustomer?.id ?? null,
          cashier_id: null,
          status: 'completed',
          payment_status: normalizedStatus,
          sale_type: saleType,
          is_online_order: saleType === 'online' || saleType === 'delivery',
          delivery_method: saleType === 'in_store' ? 'pickup' : deliveryMethod,
          delivery_fee: deliveryFee,
          note: note || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const items = cart.map((c) => ({
        sale_id: sale.id,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.price,
        line_total: c.product.price * c.quantity,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) {
        await supabase.from('sales').delete().eq('id', sale.id);
        throw itemsError;
      }

      setReceipt({
        saleId: sale.id,
        items: cart.map((c) => ({
          name: c.product.name,
          qty: c.quantity,
          price: c.product.price,
          total: c.product.price * c.quantity,
        })),
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        paymentMethod,
        amountPaid: normalizedAmountPaid,
        amountDue: normalizedAmountDue,
        changeDue: normalizedChange,
        customerName: selectedCustomer?.name ?? 'Walk-in Customer',
        date: sale.created_at,
      });

      setCart([]);
      setSelectedCustomer(null);
      setDiscount('');
      setAmountPaid('');
      setNote('');
      setSaleType('in_store');
      setDeliveryMethod('pickup');
      setShowCheckout(false);
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'message' in err) {
        const databaseError = err as { message: string; details?: string; hint?: string; code?: string };
        const extra = [databaseError.details, databaseError.hint].filter(Boolean).join(' ');
        setError(`${databaseError.message}${extra ? ` ${extra}` : ''}${databaseError.code ? ` (code ${databaseError.code})` : ''}`);
      } else {
        setError('Failed to complete sale. Check that the Supabase schema and stock are set up correctly.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (receipt) {
    return <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 bg-white border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or barcode..."
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Package className="w-8 h-8" />
              <p className="mt-3 text-sm">No products found. Add products in the Products tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const outOfStock = product.stock <= 0;
                const lowStock = product.stock > 0 && product.stock <= product.min_stock;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`bg-white rounded-xl border border-slate-200 p-4 text-left transition-all ${
                      outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-400 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      {outOfStock ? (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">OUT</span>
                      ) : lowStock ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          {product.stock} left
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">{product.stock} in stock</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2 mb-1">{product.name}</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(product.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0 max-h-[50vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Current Order</h2>
            {cart.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-slate-400 hover:text-red-500 font-medium">
              Clear all
            </button>
          )}
        </div>

        <div className="px-4 py-2 border-b border-slate-50">
          <button
            onClick={() => setShowCustomerPicker(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors text-sm"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span className={selectedCustomer ? 'text-slate-900 font-medium' : 'text-slate-400'}>
              {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <ShoppingCart className="w-10 h-10" />
              <p className="mt-3 text-sm text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Click products to add them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-20 text-right px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {saleType !== 'in_store' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span className="font-medium text-slate-900">{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
              <span className="font-medium text-slate-900">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Checkout
            </button>
          </div>
        )}
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'in_store', label: 'In Store' },
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'online', label: 'Online' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSaleType(option.id as SaleType)}
                    className={`py-2 rounded-lg text-sm font-medium border ${
                      saleType === option.id ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {saleType !== 'in_store' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Delivery Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {deliveryOptions.map((method) => (
                      <button
                        key={method}
                        onClick={() => setDeliveryMethod(method)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border uppercase ${
                          deliveryMethod === method ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method === 'pickup' ? 'Pickup' : method === 'yango' ? 'Yango' : method === 'etrc' ? 'ETRC' : 'Courier'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all ${
                          paymentMethod === pm.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {saleType !== 'in_store' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Delivery</span>
                    <span className="font-medium text-slate-900">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-medium text-slate-900">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total Due</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Amount Received</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalculator(true)}
                    className="px-3 py-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:border-slate-400"
                  >
                    Calc
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[0.25, 0.5, 1, 2]
                    .map((multiplier) => Math.round(total * multiplier * 100) / 100)
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmountPaid(v.toFixed(2))}
                        className="py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      >
                        {formatCurrency(v)}
                      </button>
                    ))}
                </div>
                {paid > 0 && (
                  <div className="mt-3 bg-emerald-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-700">{paid >= total ? 'Change Due' : 'Amount Due'}</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {formatCurrency(paid >= total ? changeDue : amountDue)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Notes / Customer Instruction</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Customer name, delivery instructions, or payment note..."
                />
              </div>

              {error && (
                <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>
              )}

              <button
                onClick={completeSale}
                disabled={processing || cart.length === 0 || (paymentMethod !== 'credit' && paymentMethod !== 'bank_transfer' && paid < total && paymentMethod !== 'cash')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Select Customer</h2>
              <button onClick={() => setShowCustomerPicker(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 flex-1">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerPicker(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-sm font-medium text-slate-700">Walk-in Customer</span>
              </button>
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowCustomerPicker(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.phone ?? c.email ?? ''}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">Calculator</h3>
              <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-right font-bold text-lg mb-3">{calculatorValue || '0'}</div>

            <div className="grid grid-cols-3 gap-2">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'C'].map((key) => (
                <button
                  key={String(key)}
                  onClick={() => {
                    if (key === 'C') {
                      setCalculatorValue('');
                      return;
                    }
                    const next = `${calculatorValue}${key}`;
                    if (next === '.') {
                      setCalculatorValue('0.');
                      return;
                    }
                    setCalculatorValue(next);
                  }}
                  className="py-3 rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 hover:border-slate-300"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const val = Number(calculatorValue || 0);
                  setAmountPaid(val.toFixed(2));
                  setShowCalculator(false);
                }}
                className="py-3 rounded-lg bg-emerald-500 text-white font-semibold"
              >
                Apply
              </button>
              <button onClick={() => setShowCalculator(false)} className="py-3 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ReceiptData = {
  saleId: string;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  amountDue: number;
  changeDue: number;
  customerName: string;
  date: string;
};

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Sale Complete!</h2>
          <p className="text-sm text-slate-500 mt-1">Receipt generated successfully</p>
        </div>

        <div className="mx-5 mb-5 border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
          <div className="text-center mb-3">
            <p className="font-bold text-slate-900 text-sm">ELECTRO-POS</p>
            <p className="text-[10px] text-slate-400">{formatDateTime(receipt.date)}</p>
            <p className="text-[10px] text-slate-400">Receipt #{receipt.saleId.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-1">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-400 ml-1">x{item.qty}</span>
                </div>
                <span className="font-medium text-slate-900">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 mt-2 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900">{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span className="text-red-600">-{formatCurrency(receipt.discount)}</span>
              </div>
            )}
            {receipt.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="text-slate-900">{formatCurrency(receipt.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">{formatCurrency(receipt.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid ({receipt.paymentMethod})</span>
              <span className="text-slate-900">{formatCurrency(receipt.amountPaid)}</span>
            </div>
            {receipt.changeDue > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Change</span>
                <span className="text-slate-900">{formatCurrency(receipt.changeDue)}</span>
              </div>
            )}
            {receipt.amountDue > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Due</span>
                <span className="text-red-600">{formatCurrency(receipt.amountDue)}</span>
              </div>
            )}
          </div>

          <div className="text-center mt-3 pt-2 border-t border-slate-200">
            <p className="text-[10px] text-slate-400">Customer: {receipt.customerName}</p>
            <p className="text-[10px] text-slate-400 mt-1">Thank you for your purchase!</p>
          </div>
        </div>

        <div className="px-5 pb-6 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            <ReceiptIcon className="w-4 h-4" />
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}


