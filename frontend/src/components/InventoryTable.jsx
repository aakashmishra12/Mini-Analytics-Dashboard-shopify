import { useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { SectionCard } from './SectionCard.jsx';
import { SearchInput } from './SearchInput.jsx';
import { Pagination } from './Pagination.jsx';
import { EmptyState, ErrorState } from './States.jsx';
import { TableSkeleton } from './skeletons/Skeleton.jsx';
import { IconAlert, IconSearch } from './Icons.jsx';
import { formatNumber } from '../utils/format.js';

const PAGE_SIZE = 8;

function StockCell({ inventory, critical }) {
  const outOfStock = inventory <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${
        critical
          ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20'
          : 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20'
      }`}
    >
      {critical && <IconAlert width={11} height={11} />}
      <span className="num">{outOfStock ? 'Out of stock' : formatNumber(inventory)}</span>
    </span>
  );
}

export function InventoryTable({ refreshToken }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, error, loading, reload } = useResource(
    () => api.getInventory({ search: debouncedSearch, page, limit: PAGE_SIZE }),
    [debouncedSearch, page],
    { refreshToken }
  );

  const onSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const rows = data?.data ?? [];
  const summary = data?.summary;

  return (
    <SectionCard
      title="Low inventory"
      subtitle={
        summary
          ? `Below ${summary.threshold} units · ${summary.criticalCount} critical (under ${summary.criticalThreshold})`
          : 'Products that need restocking'
      }
      actions={
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search products…"
          label="Search low inventory products by name or SKU"
        />
      }
      footer={!loading && !error && rows.length > 0 && (
        <Pagination pagination={data.pagination} onPageChange={setPage} noun="variants" />
      )}
    >
      {loading && <TableSkeleton rows={PAGE_SIZE} columns={3} />}

      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={debouncedSearch ? IconSearch : undefined}
          title={debouncedSearch ? 'No matching products' : 'Inventory looks healthy'}
          message={
            debouncedSearch
              ? `Nothing matched “${debouncedSearch}”. Try a product name or SKU.`
              : 'No products are below the low stock threshold right now.'
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="section-label px-4 py-2.5 font-medium">Product</th>
                <th scope="col" className="section-label hidden px-4 py-2.5 font-medium sm:table-cell">SKU</th>
                <th scope="col" className="section-label px-4 py-2.5 text-right font-medium">Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((row) => (
                <tr
                  key={row.variantId}
                  className={`transition-colors hover:bg-surface-hover ${
                    row.critical ? 'bg-red-50/40 dark:bg-red-500/[0.04]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-primary">{row.productName}</p>
                    {row.variantTitle && (
                      <p className="truncate text-[12px] text-ink-muted">{row.variantTitle}</p>
                    )}
                    <p className="num truncate text-[12px] text-ink-muted sm:hidden">{row.sku}</p>
                  </td>
                  <td className="num hidden whitespace-nowrap px-4 py-3 text-ink-secondary sm:table-cell">
                    {row.sku}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <StockCell inventory={row.inventory} critical={row.critical} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
