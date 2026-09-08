import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout, type Page } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SalesPage } from './pages/SalesPage';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Layout current={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage />}
      {page === 'pos' && <POSPage />}
      {page === 'products' && <ProductsPage />}
      {page === 'customers' && <CustomersPage />}
      {page === 'sales' && <SalesPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
