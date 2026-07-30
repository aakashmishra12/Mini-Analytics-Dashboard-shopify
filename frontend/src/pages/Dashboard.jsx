import { useCallback, useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { Header } from '../components/Header.jsx';
import { KpiCards } from '../components/KpiCards.jsx';
import { OrdersByDayChart, InventoryDistributionChart } from '../components/Charts.jsx';
import { OrdersTable } from '../components/OrdersTable.jsx';
import { TopProducts } from '../components/TopProducts.jsx';
import { InventoryTable } from '../components/InventoryTable.jsx';
import { FullPageLoader, ErrorState } from '../components/States.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { KpiCardSkeleton, ChartSkeleton, ProductListSkeleton } from '../components/skeletons/Skeleton.jsx';
import { SectionCard } from '../components/SectionCard.jsx';

export function Dashboard() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const {
    data: dashboardResponse,
    error: dashboardError,
    loading: dashboardLoading,
    initialLoad,
    reload: reloadDashboard,
  } = useResource(() => api.getDashboard(), [], { refreshToken });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await api.refresh();
    } catch (error) {
      setRefreshError(error);
    } finally {
      // Re-fetch every section regardless: the cache may still hold usable data.
      setRefreshToken((t) => t + 1);
      setRefreshing(false);
    }
  }, []);

  const dashboard = dashboardResponse?.data;

  // Only the very first load blanks the page; later loads keep the frame and skeleton.
  if (initialLoad && dashboardLoading) {
    return (
      <div className="min-h-screen">
        <Header onRefresh={handleRefresh} refreshing />
        <FullPageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        shopName={dashboard?.shopName}
        dataSource={dashboard?.meta?.dataSource}
        lastUpdated={dashboard?.meta?.lastUpdated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <main className="mx-auto max-w-7xl animate-fade-in space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        {refreshError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <span>Refresh failed: {refreshError.message}</span>
            <button type="button" onClick={() => setRefreshError(null)} className="shrink-0 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {dashboardError ? (
          <SectionCard title="Dashboard overview">
            <ErrorState error={dashboardError} onRetry={reloadDashboard} />
          </SectionCard>
        ) : dashboardLoading ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : (
          <>
            <KpiCards
              kpis={dashboard.kpis}
              revenue={dashboard.revenue}
              lowStockCount={dashboard.lowStockCount}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ErrorBoundary>
                <OrdersByDayChart data={dashboard.charts.ordersByDay} />
              </ErrorBoundary>
              <ErrorBoundary>
                <InventoryDistributionChart distribution={dashboard.charts.inventoryDistribution} />
              </ErrorBoundary>
            </div>
          </>
        )}

        <ErrorBoundary>
          <OrdersTable refreshToken={refreshToken} />
        </ErrorBoundary>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dashboardError ? null : dashboardLoading ? (
            <SectionCard title="Top selling products" subtitle="By units sold across recent orders">
              <ProductListSkeleton />
            </SectionCard>
          ) : (
            <ErrorBoundary>
              <TopProducts products={dashboard.topProducts} />
            </ErrorBoundary>
          )}
          <ErrorBoundary>
            <InventoryTable refreshToken={refreshToken} />
          </ErrorBoundary>
        </div>

        <footer className="pt-2 text-center text-[12px] text-ink-muted">
          Shopify Mini Analytics Dashboard ·{' '}
          {dashboard?.meta?.dataSource === 'shopify'
            ? 'Connected to Shopify Admin API'
            : 'Running on demo data — add Shopify credentials to go live'}
        </footer>
      </main>
    </div>
  );
}
