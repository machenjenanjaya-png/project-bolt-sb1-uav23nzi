import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout, type Page } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SalesPage } from './pages/SalesPage';
import { CustomerStorePage } from './pages/CustomerStorePage';

function AppContent() {
  const { session, user, loading } = useAuth();
  const requestedView = new URLSearchParams(window.location.search).get('view');
  const [page, setPage] = useState<Page>('dashboard');
  const [view, setView] = useState<'admin' | 'customer'>(requestedView === 'customer' ? 'customer' : 'admin');

  const changeView = (nextView: 'admin' | 'customer') => {
    setView(nextView);
    window.history.replaceState({}, '', nextView === 'customer' ? '?view=customer' : '?view=admin');
  };

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

  const accountRole = user?.user_metadata?.role;
  if (accountRole === 'customer') {
    return <CustomerStorePage />;
  }

  if (view === 'customer') {
    return <CustomerStorePage onAdminView={() => changeView('admin')} />;
  }

  return (
    <Layout current={page} onNavigate={setPage} onCustomerView={() => changeView('customer')}>
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
