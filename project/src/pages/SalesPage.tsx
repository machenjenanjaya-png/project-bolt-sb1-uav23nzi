import { useEffect, useState } from 'react';
import { Search, Receipt, X, TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import { supabase, type Sale, type SaleItem } from '../lib/supabase';
import { formatCurrency, formatDateTime, formatDate } from '../lib/format';

type SaleWithDetails = Sale & {
  customers: { name: string } | null;
  sale_items: SaleItem[];
};

export function SalesPage() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*, customers(name), sale_items(*)')
      .order('created_at', { ascending: false });
    setSales(data ?? []);
    setLoading(false);
  };

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startWeek = startToday - 6 * 86400000;
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filtered = sales.filter((s) => {
    if (dateFilter !== 'all') {
      const ts = new Date(s.created_at).getTime();
      if (dateFilter === 'today' && ts < startToday) return false;
      if (dateFilter === 'week' && ts < startWeek) return false;
      if (dateFilter === 'month' && ts < startMonth) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.customers?.name?.toLowerCase().includes(q) ||
        s.payment_method.toLowerCase().includes(q) ||
        s.sale_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.total), 0);
  const totalSales = filtered.length;
  const totalItems = filtered.reduce(
    (sum, s) => sum + (s.sale_items?.reduce((q, i) => q + i.quantity, 0) ?? 0),
    0,
  );
  const outstandingCredit = filtered.reduce((sum, s) => sum + Number(s.amount_due ?? 0), 0);

  const stats = [
    { label: 'Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'emerald' },
    { label: 'Transactions', value: String(totalSales), icon: Receipt, color: 'blue' },
    { label: 'Items Sold', value: String(totalItems), icon: ShoppingBag, color: 'slate' },
    { label: 'Credit Due', value: formatCurrency(outstandingCredit), icon: TrendingUp, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
        <p className="text-sm text-slate-500 mt-1">View and analyze all transactions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[s.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt ID, customer, payment method or order type..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: '7 Days' },
            { id: 'month', label: 'This Month' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                dateFilter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Receipt</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No sales found.
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(sale.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {sale.customers?.name ?? 'Walk-in'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {sale.sale_items?.reduce((q, i) => q + i.quantity, 0) ?? 0} items
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        sale.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sale.payment_status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(Number(sale.total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Receipt Details</h2>
                <p className="text-xs text-slate-400 font-mono">
                  #{selectedSale.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedSale.created_at)}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">
                  {selectedSale.customers?.name ?? 'Walk-in Customer'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Order Type:</span>
                <span className="font-medium text-slate-900 capitalize">{selectedSale.sale_type}</span>
              </div>

              {selectedSale.is_online_order && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Delivery:</span>
                  <span className="font-medium text-slate-900">
                    {selectedSale.delivery_method ?? 'Pickup'}
                  </span>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-medium text-slate-900">{formatCurrency(Number(selectedSale.total))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid</span>
                  <span className="font-medium text-slate-900">{formatCurrency(Number(selectedSale.amount_paid))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due</span>
                  <span className="font-medium text-red-600">{formatCurrency(Number(selectedSale.amount_due ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="font-medium text-slate-900 capitalize">{selectedSale.payment_status}</span>
                </div>
              </div>

              <div className="space-y-2">
                {selectedSale.sale_items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="min-w-0">
                      <span className="text-slate-700">{item.product_name}</span>
                      <span className="text-slate-400 ml-1">x{item.quantity}</span>
                    </div>
                    <span className="font-medium text-slate-900">{formatCurrency(Number(item.line_total))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

