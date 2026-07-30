import { IconChevronLeft, IconChevronRight } from './Icons.jsx';
import { formatNumber } from '../utils/format.js';

export function Pagination({ pagination, onPageChange, noun = 'items' }) {
  if (!pagination || pagination.totalItems === 0) return null;

  const { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage } = pagination;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:flex-row">
      <p className="num text-[12px] text-ink-secondary">
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(totalItems)} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn px-2"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <IconChevronLeft width={14} height={14} />
        </button>
        <span className="num text-[12px] text-ink-secondary" aria-live="polite">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn px-2"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          <IconChevronRight width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
