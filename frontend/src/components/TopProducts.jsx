import { SectionCard } from './SectionCard.jsx';
import { EmptyState } from './States.jsx';
import { formatNumber, formatCurrency } from '../utils/format.js';

export function TopProducts({ products }) {
  const max = Math.max(...products.map((p) => p.quantitySold), 1);

  return (
    <SectionCard
      title="Top selling products"
      subtitle="By units sold across recent orders"
    >
      {products.length === 0 ? (
        <EmptyState
          title="No sales data yet"
          message="Top sellers are calculated from order line items — they’ll appear after the first orders come in."
        />
      ) : (
        <ol className="flex h-full flex-col divide-y divide-hairline">
          {products.map((product, index) => (
            <li
              key={product.productId || product.title}
              className="flex flex-1 items-center gap-3 px-4 py-3.5"
            >
              <span className="num w-4 shrink-0 text-[12px] font-medium text-ink-muted">{index + 1}</span>

              {product.image ? (
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-lg border border-hairline object-cover"
                />
              ) : (
                <span className="h-10 w-10 shrink-0 rounded-lg border border-hairline bg-surface-subtle" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-medium text-ink-primary">{product.title}</p>
                  <p className="num shrink-0 text-[13px] font-semibold text-ink-primary">
                    {formatNumber(product.quantitySold)}
                    <span className="ml-1 text-[11px] font-normal text-ink-muted">
                      {product.quantitySold === 1 ? 'unit' : 'units'}
                    </span>
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                    <span
                      className="block h-full rounded-full bg-series"
                      style={{ width: `${(product.quantitySold / max) * 100}%` }}
                    />
                  </span>
                  <span className="num shrink-0 text-[11px] text-ink-muted">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
