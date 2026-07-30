import { IconPackage, IconCart, IconUsers, IconLayers } from './Icons.jsx';
import { formatNumber, formatCurrency } from '../utils/format.js';

function KpiCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="card p-4 transition-colors hover:border-hairline-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="section-label">{label}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ink-secondary">
          <Icon width={14} height={14} />
        </span>
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink-primary">
        {formatNumber(value)}
      </p>
      {hint && <p className="mt-2 text-[12px] text-ink-secondary">{hint}</p>}
    </div>
  );
}

export function KpiCards({ kpis, revenue, lowStockCount }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total products"
        value={kpis.totalProducts}
        icon={IconPackage}
        hint={`${lowStockCount} need restocking`}
      />
      <KpiCard
        label="Total orders"
        value={kpis.totalOrders}
        icon={IconCart}
        hint={`${formatCurrency(revenue.totalRevenue, revenue.currency)} revenue`}
      />
      <KpiCard
        label="Total customers"
        value={kpis.totalCustomers}
        icon={IconUsers}
        hint={`${formatCurrency(revenue.averageOrderValue, revenue.currency)} avg. order`}
      />
      <KpiCard
        label="Total collections"
        value={kpis.totalCollections}
        icon={IconLayers}
        hint="Across the storefront"
      />
    </div>
  );
}
