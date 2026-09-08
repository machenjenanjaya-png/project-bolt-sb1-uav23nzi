import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Package,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

type ProductForm = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  stock: string;
  min_stock: string;
  category_id: string;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  barcode: '',
  price: '',
  cost: '',
  stock: '0',
  min_stock: '5',
  category_id: '',
  is_active: true,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, categories(name)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts(prodRes.data ?? []);
    setCategories(catRes.data ?? []);
  };

  const filtered = products.filter((p) => {
    if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      price: String(product.price),
      cost: String(product.cost),
      stock: String(product.stock),
      min_stock: String(product.min_stock),
      category_id: product.category_id ?? '',
      is_active: product.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    const data = {
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 0,
      category_id: form.category_id || null,
      is_active: form.is_active,
    };

    if (editing) {
      await supabase.from('products').update(data).eq('id', editing.id);
    } else {
      await supabase.from('products').insert(data);
    }

    setSaving(false);
    setShowForm(false);
    loadData();
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await supabase.from('products').delete().eq('id', product.id);
    loadData();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({ name: newCategory.trim() });
    setNewCategory('');
    setShowCategoryForm(false);
    loadData();
  };

  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? 'Uncategorized' : 'Uncategorized';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your product catalog and stock levels</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Tag className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">SKU</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Price</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Stock</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No products found. Click "Add Product" to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const lowStock = p.stock <= p.min_stock;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{p.name}</p>
                            {!p.is_active && (
                              <span className="text-[10px] text-slate-400 font-medium">Inactive</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {categoryName(p.category_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell font-mono text-xs">
                        {p.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                            p.stock <= 0
                              ? 'bg-red-50 text-red-600'
                              : lowStock
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {lowStock && <AlertTriangle className="w-3 h-3" />}
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-slate-900">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Barcode</label>
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Price (ZMW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Cost (ZMW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Stock Qty</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Min Stock Alert</label>
                  <input
                    type="number"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">Active (visible in POS)</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category form modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Add Category</h2>
              <button onClick={() => setShowCategoryForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name (e.g. Beverages)"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowCategoryForm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
