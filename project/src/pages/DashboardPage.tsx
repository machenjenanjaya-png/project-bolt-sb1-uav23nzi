import { useEffect, useState } from 'react';
import {
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  Wallet,
  Truck,
  CreditCard,
  PackageCheck,
} from 'lucide-react';
import { supabase, type Product, type Sale } from '../lib/supabase';
import { formatCurrency, formatDateTime } from '../lib/format';

type Stats = {
  todayRevenue: number;
  todaySales: number;
  totalProducts: number;
  lowStock: number;
  monthlyProfit: number;
  monthlyRevenue: number;
  monthlyCost: number;
  outstandingCredit: number;
  onlineOrders: number;
  paymentTotals: { method: string; total: number }[];
  lowStockProducts: Product[];
  recentSales: (Sale & { customers?: { name: string } | null })[];
  topProducts: { product_name: string; total_qty: number; line_total: number }[];
};

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [salesRes, productsRes, recentRes, topRes, productRes] = await Promise.all([
      supabase.from('sales').select('*, customers(name)').order('created_at', { ascending: false }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('sales')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('sale_items')
        .select('sale_id, product_name, quantity, line_total, product_id')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('products').select('*'),
    ]);

    const allSales = salesRes.data ?? [];
    const todaySales = allSales.filter((s) => new Date(s.created_at) >= new Date(startOfDay));
    const monthlySales = allSales.filter((s) => new Date(s.created_at) >= new Date(startOfMonth));

    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + Number(s.total), 0);
    const outstandingCredit = allSales.reduce((sum, s) => sum + Number(s.amount_due ?? 0), 0);
    const onlineOrders = allSales.filter((s) => s.is_online_order).length;

    const productCostMap = new Map((productRes.data ?? []).map((product) => [product.id, Number(product.cost)]));
    const monthlySaleIds = new Set(monthlySales.map((sale) => sale.id));
    const monthlyItems = (topRes.data ?? []).filter((item) => monthlySaleIds.has(item.sale_id));
    const monthlyCost = monthlyItems.reduce((sum, item) => {
      const qty = Number(item.quantity ?? 0);
      const productId = item.product_id;
      const unitCost = productId ? productCostMap.get(productId) ?? 0 : 0;
      return sum + qty * unitCost;
    }, 0);

    const monthlyProfit = monthlyRevenue - monthlyCost;

    const lowStockProducts = (productRes.data ?? [])
      .filter((product) => product.is_active && Number(product.stock) <= Number(product.min_stock))
      .sort((a, b) => Number(a.stock) - Number(b.stock));

    const paymentMap = new Map<string, number>();
    for (const sale of monthlySales) {
      const method = sale.payment_method || 'unknown';
      paymentMap.set(method, (paymentMap.get(method) ?? 0) + Number(sale.amount_paid ?? 0));
    }
    const paymentTotals = Array.from(paymentMap.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    const productMap = new Map<string, { total_qty: number; line_total: number }>();
    for (const item of topRes.data ?? []) {
      const existing = productMap.get(item.product_name) ?? { total_qty: 0, line_total: 0 };
      existing.total_qty += Number(item.quantity ?? 0);
      existing.line_total += Number(item.line_total ?? 0);
      productMap.set(item.product_name, existing);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([product_name, v]) => ({ product_name, ...v }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5);

    setStats({
      todayRevenue,
      todaySales: todaySales.length,
      totalProducts: productsRes.count ?? 0,
      lowStock: lowStockProducts.length,
      monthlyProfit,
      monthlyRevenue,
      monthlyCost,
      outstandingCredit,
      onlineOrders,
      paymentTotals,
      lowStockProducts,
      recentSales: recentRes.data ?? [],
      topProducts,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const cards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue ?? 0),
      icon: DollarSign,
      color: 'emerald',
    },
    {
      label: "Monthly Profit",
      value: formatCurrency(stats?.monthlyProfit ?? 0),
      icon: TrendingUp,
      color: stats && (stats.monthlyProfit >= 0) ? 'emerald' : 'amber',
    },
    {
      label: 'Outstanding Credit',
      value: formatCurrency(stats?.outstandingCredit ?? 0),
      icon: Wallet,
      color: 'slate',
    },
    {
      label: 'Online Orders',
      value: String(stats?.onlineOrders ?? 0),
      icon: Truck,
      color: 'blue',
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent Sales</h2>
          </div>
          <div className="p-5">
            {stats?.recentSales.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No sales yet today.</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {sale.customers?.name ?? 'Walk-in customer'}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(sale.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(Number(sale.total))}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Top Products (Recent)</h2>
          </div>
          <div className="p-5">
            {stats?.topProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No product sales yet.</p>
            ) : (
              <div className="space-y-3">
                {stats?.topProducts.map((p, i) => (
                  <div key={p.product_name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.product_name}</p>
                      <p className="text-xs text-slate-400">{p.total_qty} sold</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(p.line_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Monthly Revenue</p>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.monthlyRevenue ?? 0)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Low Stock</p>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.lowStock ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Active Products</p>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalProducts ?? 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-900 text-sm">Stock Alerts</h2>
            </div>
            <span className="text-xs text-slate-500">At or below minimum level</span>
          </div>
          <div className="p-5">
            {stats?.lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 py-3">
                <PackageCheck className="w-4 h-4" /> All active products are sufficiently stocked.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {stats?.lowStockProducts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">Alert at {product.min_stock} units</p>
                    </div>
                    <span className={`ml-3 text-sm font-bold ${product.stock <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                      {product.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Payments This Month</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats?.paymentTotals.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded this month.</p>
            ) : (
              stats?.paymentTotals.map((payment) => (
                <div key={payment.method} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 capitalize">{payment.method.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payment.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Trading period summary</p>
            <h2 className="text-lg font-bold mt-1">This month’s close</h2>
          </div>
          <p className={`text-xl font-bold ${stats && stats.monthlyProfit >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
            {stats && stats.monthlyProfit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(stats?.monthlyProfit ?? 0))}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div><p className="text-xs text-slate-400">Sales</p><p className="font-semibold mt-1">{formatCurrency(stats?.monthlyRevenue ?? 0)}</p></div>
          <div><p className="text-xs text-slate-400">Product cost</p><p className="font-semibold mt-1">{formatCurrency(stats?.monthlyCost ?? 0)}</p></div>
          <div><p className="text-xs text-slate-400">Credit due</p><p className="font-semibold mt-1">{formatCurrency(stats?.outstandingCredit ?? 0)}</p></div>
          <div><p className="text-xs text-slate-400">Online orders</p><p className="font-semibold mt-1">{stats?.onlineOrders ?? 0}</p></div>
        </div>
      </div>
    </div>
  );
}
