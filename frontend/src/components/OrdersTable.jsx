import { useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { SectionCard } from './SectionCard.jsx';
import { SearchInput } from './SearchInput.jsx';
import { Pagination } from './Pagination.jsx';
import { PaymentBadge, FulfillmentBadge } from './Badge.jsx';
import { EmptyState, ErrorState } from './States.jsx';
import { TableSkeleton } from './skeletons/Skeleton.jsx';
import { IconDownload, IconSearch } from './Icons.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const PAGE_SIZE = 10;

export function OrdersTable({ refreshToken }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, error, loading, reload } = useResource(
    () => api.getOrders({ search: debouncedSearch, page, limit: PAGE_SIZE }),
    [debouncedSearch, page],
    { refreshToken }
  );

  const onSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const orders = data?.data ?? [];

  return (
    <SectionCard
      title="Latest orders"
      subtitle="Most recent orders across the store"
      actions={
        <>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search orders…"
            label="Search orders by number, customer or status"
          />
          <a
            href={api.ordersExportUrl(debouncedSearch)}
            className="btn shrink-0"
            title="Download the current result set as CSV"
          >
            <IconDownload width={13} height={13} />
            <span className="hidden sm:inline">Export</span>
          </a>
        </>
      }
      footer={!loading && !error && orders.length > 0 && (
        <Pagination pagination={data.pagination} onPageChange={setPage} noun="orders" />
      )}
    >
      {loading && <TableSkeleton rows={PAGE_SIZE} columns={6} />}

      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={debouncedSearch ? IconSearch : undefined}
          title={debouncedSearch ? 'No matching orders' : 'No orders yet'}
          message={
            debouncedSearch
              ? `Nothing matched “${debouncedSearch}”. Try an order number, customer name or status.`
              : 'Orders will appear here as soon as your store starts selling.'
          }
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                {['Order', 'Customer', 'Total', 'Payment', 'Fulfillment', 'Date'].map((h) => (
                  <th key={h} scope="col" className="section-label px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface-hover">
                  <td className="num whitespace-nowrap px-4 py-3 font-medium text-ink-primary">{order.name}</td>
                  <td className="px-4 py-3">
                    <p className="truncate font-medium text-ink-primary">{order.customerName}</p>
                    <p className="truncate text-[12px] text-ink-muted">{order.customerEmail || '—'}</p>
                  </td>
                  <td className="num whitespace-nowrap px-4 py-3 font-medium text-ink-primary">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </td>
                  <td className="px-4 py-3"><PaymentBadge status={order.paymentStatus} /></td>
                  <td className="px-4 py-3"><FulfillmentBadge status={order.fulfillmentStatus} /></td>
                  <td className="num whitespace-nowrap px-4 py-3 text-ink-secondary">
                    {formatDate(order.createdAt)}
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
